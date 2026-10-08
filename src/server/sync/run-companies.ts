// 회사 소스 실행 — 기획서 F1, F2.
// 가격 배치와 분리한 이유: 회사 정보는 사실상 안 바뀌는데 외부 응답은 느리다.
// 이걸 스토어 수집에 섞으면 가격 배치가 백과사전 응답 속도에 묶인다.
//
// 2026-09-30 에 순서를 바꿨다. 예전에는 회사 없는 게임을 updatedAt 순으로 몇백 건만 훑어 이름을 모았고,
// 못 붙인 이름을 기록하지 않아 다음 회차에 같은 이름을 또 물었다. 지금은:
//   1. 회사 없는 게임 전부를 이름으로 묶어 **게임 수가 많은 이름부터** 세운다(카탈로그를 실제로 덮는 순서)
//   2. 이미 아는 이름(company_aliases)은 외부 질의 없이 전부 잇는다 — 몫을 쓰지 않는다
//   3. 최근에 못 붙인 이름(company_lookup_misses)은 retry_at 까지 건너뛴다
//   4. 남은 이름을 몫만큼 어댑터의 묶음 조회(lookupMany)로 한 번에 묻는다
// 이미 아는 회사의 재조회(COMPANY_REFRESH_DAYS)는 몫이 남을 때만 한다.
//
// 2026-10-08: 4 의 몫은 출시예정, 최근 조회 게임의 이름부터 쓴다(company-priority). 게임 수 순만 쓰면
// 출시예정 화면의 신작 회사가 대기열 끝에 서서 "나라" 칸이 오래 빈다.
import { and, eq, gt, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { companies, companyLookupMisses, gameCompanies, gamePlatforms, games, type CompanyRole } from "@/server/db/schema";
import { getCompanyAdapter, type CompanySource } from "@/server/adapters";
import type { CompanyLookup } from "@/server/adapters/types";
import { createdBy, updatedBy } from "@/server/db/audit";
import { normalizeCompanyName } from "@/lib/company-name";
import { DISPLAY_TIME_ZONE } from "@/lib/format";
import { recentlyViewedSlugs } from "@/server/game-views";
import { BATCH_SIZE, COMPANY_MISS_RETRY_DAYS, COMPANY_REFRESH_DAYS, COMPANY_SEARCH_DEADLINE_MS } from "./constants";
import type { Db } from "@/server/db/client";
import { recordError, type Ctx, type RunOptions } from "./context";
import { fetchWithRetry } from "./retry";
import { attachCompany, companyNamesOf, findCompaniesByAliases } from "./company-writer";
import { prioritizeCompanyTargets } from "./company-priority";

const DAY_MS = 24 * 60 * 60 * 1000;
/** 한 문장에 넣을 행 수. Neon HTTP 한 요청의 파라미터가 너무 많아지지 않게 끊는다 */
const WRITE_CHUNK = 500;

export interface CompanyTargetLink {
  gameId: string;
  role: CompanyRole;
  /** 붙인 뒤 게임 화면 캐시를 털기 위해 같이 들고 다닌다 */
  slug?: string;
  /** 출시일이 아직 안 온 게임(어느 판이든). 조회 순서를 앞당기는 데만 쓴다 */
  upcoming?: boolean;
}

/** 한 회사 이름과, 그 이름을 쓰는 게임들 */
export interface CompanyTarget {
  rawName: string;
  links: CompanyTargetLink[];
}

/**
 * 회사가 하나도 안 붙은 게임의 개발사, 배급사 문자열을 이름 단위로 묶어 **게임 수가 많은 순**으로 돌려준다.
 * 같은 표기 조합끼리는 DB 에서 먼저 묶는다 — 게임 9천여 건을 행으로 받으면 1MB 가 오간다(2026-09-30 실측).
 */
export async function listCompanyTargets(db: Db): Promise<CompanyTarget[]> {
  const rows = await db
    .select({
      developer: games.developer,
      publisher: games.publisher,
      // 출시일은 판(game_platforms)마다 있다 — 한 판이라도 미래면 출시예정 화면에 뜬다. 오늘은 한국 날짜로 센다
      games: sql<Array<{ id: string; slug: string; upcoming: boolean }>>`json_agg(json_build_object(
        'id', ${games.id}, 'slug', ${games.slug},
        'upcoming', exists (select 1 from ${gamePlatforms} gp where gp.game_id = ${games.id}
          and gp.release_date > (now() at time zone ${DISPLAY_TIME_ZONE})::date)))`,
    })
    .from(games)
    .leftJoin(gameCompanies, eq(gameCompanies.gameId, games.id))
    .where(and(isNull(gameCompanies.gameId), or(sql`${games.developer} is not null`, sql`${games.publisher} is not null`)))
    .groupBy(games.developer, games.publisher);

  const byName = new Map<string, CompanyTarget>();
  for (const row of rows) {
    for (const { name, role } of companyNamesOf(row.developer, row.publisher)) {
      const key = normalizeCompanyName(name);
      if (!key) continue;
      const links = row.games.map((g) => ({ gameId: g.id, slug: g.slug, role, upcoming: g.upcoming }));
      const hit = byName.get(key);
      if (hit) hit.links.push(...links);
      else byName.set(key, { rawName: name, links });
    }
  }
  return [...byName.values()].sort((a, b) => b.links.length - a.links.length || a.rawName.localeCompare(b.rawName));
}

/** 아직 쉬는 중인(retry_at 이 안 지난) 못 붙인 이름. 키는 정규화한 이름 */
export async function loadActiveMisses(db: Db, now: Date): Promise<Map<string, "not_found" | "ambiguous">> {
  const rows = await db
    .select({ nameNorm: companyLookupMisses.nameNorm, outcome: companyLookupMisses.outcome })
    .from(companyLookupMisses)
    .where(gt(companyLookupMisses.retryAt, now));
  return new Map(rows.map((r) => [r.nameNorm, r.outcome]));
}

/** 이미 아는 회사 중 오래 안 본 것 — 이름이 아니라 회사 단위로 갱신한다 */
async function listStaleCompanies(ctx: Ctx, limit: number): Promise<CompanyTarget[]> {
  if (limit <= 0) return [];
  const cutoff = new Date(ctx.now.getTime() - COMPANY_REFRESH_DAYS * DAY_MS);
  const rows = await ctx.db
    .select({ nameEn: companies.nameEn })
    .from(companies)
    .where(or(isNull(companies.lastSyncedAt), lt(companies.lastSyncedAt, cutoff)))
    .orderBy(sql`${companies.lastSyncedAt} asc nulls first`)
    .limit(limit);
  return rows.map((r) => ({ rawName: r.nameEn, links: [] }));
}

/** 게임과 회사를 한꺼번에 잇는다. 서울 리전에서 Neon 왕복이 220ms 라 게임마다 한 문장씩 보내면 몫이 녹는다 */
async function linkMany(ctx: Ctx, rows: Array<{ gameId: string; companyId: string; role: CompanyRole }>): Promise<void> {
  for (let i = 0; i < rows.length; i += WRITE_CHUNK) {
    const chunk = rows.slice(i, i + WRITE_CHUNK).map((r) => ({ ...r, ...createdBy(`crawler:${ctx.source}`) }));
    await ctx.db.insert(gameCompanies).values(chunk).onConflictDoNothing();
  }
}

function noteLinkedGames(ctx: Ctx, links: CompanyTargetLink[]): void {
  for (const l of links) if (l.slug) ctx.changedSlugs.add(l.slug);
}

/** 못 붙인 이름을 적는다. 다시 못 붙이면 횟수만 올리고 쉬는 기간을 새로 잡는다 */
async function recordMisses(ctx: Ctx, misses: Array<{ rawName: string; outcome: "not_found" | "ambiguous" }>): Promise<void> {
  const retryAt = new Date(ctx.now.getTime() + COMPANY_MISS_RETRY_DAYS * DAY_MS);
  const actor = `crawler:${ctx.source}` as const;
  const values = misses
    .map((m) => ({ nameNorm: normalizeCompanyName(m.rawName), nameRaw: m.rawName, outcome: m.outcome, retryAt, ...createdBy(actor) }))
    .filter((v) => v.nameNorm);
  for (let i = 0; i < values.length; i += WRITE_CHUNK) {
    await ctx.db
      .insert(companyLookupMisses)
      .values(values.slice(i, i + WRITE_CHUNK))
      .onConflictDoUpdate({
        target: companyLookupMisses.nameNorm,
        set: {
          nameRaw: sql`excluded.name_raw`,
          outcome: sql`excluded.outcome`,
          retryAt: sql`excluded.retry_at`,
          missCount: sql`${companyLookupMisses.missCount} + 1`,
          ...updatedBy(actor),
        },
      });
  }
}

/** 붙인 이름은 못 붙인 기록에서 지운다 — 남아 있으면 검수 큐가 "못 붙임" 으로 잘못 읽는다 */
export async function clearMisses(db: Db, rawNames: string[]): Promise<void> {
  const norms = [...new Set(rawNames.map(normalizeCompanyName).filter(Boolean))];
  for (let i = 0; i < norms.length; i += WRITE_CHUNK) {
    await db.delete(companyLookupMisses).where(inArray(companyLookupMisses.nameNorm, norms.slice(i, i + WRITE_CHUNK)));
  }
}

export async function runCompanies(ctx: Ctx, source: CompanySource, opts: RunOptions): Promise<void> {
  const startedAt = Date.now();
  const adapter = getCompanyAdapter(source);
  const limit = opts.limit ?? BATCH_SIZE[source];

  const [all, misses, viewed] = await Promise.all([
    listCompanyTargets(ctx.db),
    loadActiveMisses(ctx.db, ctx.now),
    recentlyViewedSlugs(ctx.now),
  ]);

  // 이미 아는 이름은 외부 질의 없이 잇는다. 별칭 표가 커질수록 이 지름길이 대부분을 흡수한다
  const known = await findCompaniesByAliases(ctx.db, all.map((t) => t.rawName));
  const aliasLinks: Array<{ gameId: string; companyId: string; role: CompanyRole }> = [];
  const unknown: CompanyTarget[] = [];
  for (const target of all) {
    const hit = known.get(normalizeCompanyName(target.rawName));
    if (!hit) {
      unknown.push(target);
      continue;
    }
    for (const l of target.links) aliasLinks.push({ gameId: l.gameId, companyId: hit.companyId, role: l.role });
    noteLinkedGames(ctx, target.links);
    ctx.processed++;
  }
  await linkMany(ctx, aliasLinks);

  const waiting = unknown.filter((t) => !misses.has(normalizeCompanyName(t.rawName)));
  const fresh = prioritizeCompanyTargets(waiting, new Set(viewed)).slice(0, limit);
  const stale = await listStaleCompanies(ctx, limit - fresh.length);
  const targets = [...fresh, ...stale];
  if (targets.length === 0) return;

  const { results, errors } = await adapter.lookupMany(
    targets.map((t) => t.rawName),
    { deadline: startedAt + COMPANY_SEARCH_DEADLINE_MS, retry: (fn) => fetchWithRetry(fn) },
  );
  for (const { name, error } of errors) recordError(ctx, `company:${name}`, error);

  const found: string[] = [];
  const missed: Array<{ rawName: string; outcome: "not_found" | "ambiguous" }> = [];
  const staleMissed: string[] = [];
  for (const target of targets) {
    const verdict: CompanyLookup | undefined = results.get(target.rawName);
    if (!verdict) continue; // 마감이나 오류로 이번에 못 물었다 — 다음 회차에 다시 뽑힌다
    if (verdict.status !== "found") {
      if (target.links.length > 0) missed.push({ rawName: target.rawName, outcome: verdict.status });
      // 재조회 대상(이미 아는 회사)은 검수 큐와 무관하지만 확인한 시각은 찍는다 — 안 찍으면 매 회차 맨 앞에 다시 선다
      else staleMissed.push(target.rawName);
      ctx.processed++;
      continue;
    }
    try {
      await attachCompany(ctx, verdict.info, target.rawName, target.links);
      noteLinkedGames(ctx, target.links);
      found.push(target.rawName);
      ctx.processed++;
    } catch (e) {
      recordError(ctx, `company:${target.rawName}`, e);
    }
  }

  try {
    await recordMisses(ctx, missed);
    await clearMisses(ctx.db, found);
    if (staleMissed.length > 0) {
      await ctx.db.update(companies).set({ lastSyncedAt: ctx.now }).where(inArray(companies.nameEn, staleMissed));
    }
  } catch (e) {
    recordError(ctx, "company:misses", e);
  }
}

/**
 * 관리자 검수 큐 — 회사로 승격되지 않은 이름과 그 이름을 쓰는 게임 수. 게임 수가 많은 이름부터.
 * 못 붙인 기록이 있으면 그 사유를 같이 준다 — 사람이 볼 때 "위키데이터에 없다" 와 "동명이 여럿" 은 할 일이 다르다.
 */
export async function listPendingCompanyNames(
  db: Db,
  limit: number,
): Promise<Array<{ name: string; gameCount: number; outcome: "not_found" | "ambiguous" | null }>> {
  const [targets, misses] = await Promise.all([listCompanyTargets(db), loadActiveMisses(db, new Date())]);
  if (targets.length === 0) return [];
  const known = await findCompaniesByAliases(db, targets.map((t) => t.rawName));
  return targets
    .filter((t) => !known.has(normalizeCompanyName(t.rawName)))
    .slice(0, limit)
    .map((t) => ({ name: t.rawName, gameCount: t.links.length, outcome: misses.get(normalizeCompanyName(t.rawName)) ?? null }));
}

/**
 * 메뉴 배지용 대략의 수 — 회사 없는 게임의 (개발사, 배급사) 표기 조합을 상한까지 센다.
 * 이름 단위로 정확히 세려면 카탈로그를 훑어 쪼개고 묶어야 해서 모든 관리자 화면에 1MB 가 붙는다.
 * 배지는 "쌓였나" 만 말하면 되고 상한에 닿으면 어차피 "이상" 으로 읽힌다.
 */
export async function countPendingCompanyGroups(db: Db, cap: number): Promise<number> {
  const rows = await db
    .select({ one: sql<number>`1` })
    .from(games)
    .leftJoin(gameCompanies, eq(gameCompanies.gameId, games.id))
    .where(and(isNull(gameCompanies.gameId), or(sql`${games.developer} is not null`, sql`${games.publisher} is not null`)))
    .groupBy(games.developer, games.publisher)
    .limit(cap);
  return rows.length;
}
