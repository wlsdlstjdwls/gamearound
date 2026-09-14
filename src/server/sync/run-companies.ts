// 회사 소스 실행 — 기획서 F1, F2.
// 가격 배치와 분리한 이유: 회사 정보는 사실상 안 바뀌는데 외부 응답은 느리다.
// 이걸 스토어 수집에 섞으면 가격 배치가 백과사전 응답 속도에 묶인다.
//
// 대상 선정은 "아직 회사로 승격되지 않은 이름" 우선이다. 이미 아는 회사는 COMPANY_REFRESH_DAYS 가 지나야 다시 본다.
import { and, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { companies, companyAliases, gameCompanies, games, type CompanyRole } from "@/server/db/schema";
import { getCompanyAdapter, type CompanySource } from "@/server/adapters";
import { normalizeCompanyName } from "@/lib/company-name";
import { sleep } from "@/lib/async";
import { BATCH_SIZE, COMPANY_REFRESH_DAYS } from "./constants";
import { recordError, type Ctx, type RunOptions } from "./context";
import { fetchWithRetry } from "./retry";
import { attachCompany, companyNamesOf, findCompanyByAlias, linkGameCompany } from "./company-writer";

/** 한 회사 이름과, 그 이름을 쓰는 게임들 */
export interface CompanyTarget {
  rawName: string;
  links: Array<{ gameId: string; role: CompanyRole }>;
}

function refreshCutoff(now: Date): Date {
  return new Date(now.getTime() - COMPANY_REFRESH_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * games.developer / publisher 문자열을 훑어 아직 회사로 승격되지 않은 이름을 모은다.
 * 한 이름이 여러 게임에 걸리므로 이름 단위로 묶는다 — 같은 회사를 게임 수만큼 조회하면 예산이 안 나온다.
 */
export async function listCompanyTargets(ctx: Ctx, limit: number): Promise<CompanyTarget[]> {
  const { db } = ctx;
  // 회사 연결이 하나도 없는 게임부터 본다. 이미 연결된 게임을 다시 훑어봐야 새로 붙을 이름이 거의 없다.
  const rows = await db
    .select({ id: games.id, developer: games.developer, publisher: games.publisher })
    .from(games)
    .leftJoin(gameCompanies, eq(gameCompanies.gameId, games.id))
    .where(and(isNull(gameCompanies.gameId), or(sql`${games.developer} is not null`, sql`${games.publisher} is not null`)))
    .orderBy(games.updatedAt)
    .limit(limit * 4); // 이름 단위로 묶이면서 줄어들기 때문에 게임은 넉넉히 훑는다

  const byName = new Map<string, CompanyTarget>();
  for (const row of rows) {
    for (const { name, role } of companyNamesOf(row.developer, row.publisher)) {
      const key = normalizeCompanyName(name);
      if (!key) continue;
      const hit = byName.get(key);
      if (hit) hit.links.push({ gameId: row.id, role });
      else byName.set(key, { rawName: name, links: [{ gameId: row.id, role }] });
      if (byName.size >= limit) break;
    }
    if (byName.size >= limit) break;
  }
  return Array.from(byName.values());
}

/** 이미 아는 회사 중 오래 안 본 것 — 이름이 아니라 회사 단위로 갱신한다 */
async function listStaleCompanies(ctx: Ctx, limit: number): Promise<CompanyTarget[]> {
  if (limit <= 0) return [];
  const rows = await ctx.db
    .select({ nameEn: companies.nameEn })
    .from(companies)
    .where(or(isNull(companies.lastSyncedAt), lt(companies.lastSyncedAt, refreshCutoff(ctx.now))))
    .orderBy(sql`${companies.lastSyncedAt} asc nulls first`)
    .limit(limit);
  return rows.map((r) => ({ rawName: r.nameEn, links: [] }));
}

/**
 * 이미 해결된 이름은 외부 질의 없이 바로 잇는다.
 * 별칭 표가 커질수록 이 지름길이 배치 대부분을 흡수한다 — 위키데이터를 때리는 횟수가 줄어든다.
 */
async function linkFromAlias(ctx: Ctx, target: CompanyTarget): Promise<boolean> {
  const companyId = await findCompanyByAlias(ctx.db, target.rawName);
  if (!companyId) return false;
  for (const { gameId, role } of target.links) await linkGameCompany(ctx.db, gameId, companyId, role);
  return true;
}

export async function runCompanies(ctx: Ctx, source: CompanySource, opts: RunOptions): Promise<void> {
  const adapter = getCompanyAdapter(source);
  const limit = opts.limit ?? BATCH_SIZE[source];

  const fresh = await listCompanyTargets(ctx, limit);
  const stale = await listStaleCompanies(ctx, limit - fresh.length);
  const targets = [...fresh, ...stale];

  for (const [i, target] of targets.entries()) {
    try {
      if (await linkFromAlias(ctx, target)) {
        ctx.processed++;
        continue;
      }
      // 외부 질의는 별칭에 없는 이름에만. 간격은 어댑터가 선언한 값을 그대로 지킨다
      if (i > 0) await sleep(adapter.minIntervalMs);
      // 429 로 한 건을 통째로 버리지 않는다 — 위키데이터는 과요청을 만나면 몇 분간 막으므로 물러섰다 다시 묻는다
      const info = await fetchWithRetry(() => adapter.lookup(target.rawName));
      if (!info) {
        // 후보가 없거나 모호함. 회사를 만들지 않고 넘어간다 — 관리자 검수 큐에서 사람이 정한다.
        ctx.processed++;
        continue;
      }
      await attachCompany(ctx, info, target.rawName, target.links);
      ctx.processed++;
    } catch (e) {
      recordError(ctx, `company:${target.rawName}`, e);
    }
  }
}

/** 관리자 검수 큐 — 회사로 승격되지 않은 이름과 그 이름을 쓰는 게임 수 */
export async function listPendingCompanyNames(ctx: Ctx, limit: number): Promise<Array<{ name: string; gameCount: number }>> {
  const targets = await listCompanyTargets(ctx, limit);
  if (targets.length === 0) return [];
  const norms = targets.map((t) => normalizeCompanyName(t.rawName)).filter(Boolean);
  const known = norms.length
    ? await ctx.db.select({ aliasNorm: companyAliases.aliasNorm }).from(companyAliases).where(inArray(companyAliases.aliasNorm, norms))
    : [];
  const knownSet = new Set(known.map((k) => k.aliasNorm));
  return targets
    .filter((t) => !knownSet.has(normalizeCompanyName(t.rawName)))
    .map((t) => ({ name: t.rawName, gameCount: t.links.length }));
}
