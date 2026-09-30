// 스토어 소스의 수집 대상 선정 — 기존 매핑 + 카탈로그 신규 발견(시드).
import { and, eq, inArray, ne, not, sql } from "drizzle-orm";
import { discoveryIgnores, gamePlatforms, gameSourceRefs, games, type Platform, type Region } from "@/server/db/schema";
import type { Db } from "@/server/db/client";
import { getStoreAdapter, type StoreSource } from "@/server/adapters";
import type { SearchCandidate } from "@/server/adapters/types";
import { errorMessage } from "@/lib/errors";
import { normalizeTitle } from "@/lib/slug";
import { findGameByTitle, type GameTitleRow } from "./match";
import { collectFreshCandidates, nextDiscoveryCursor, seedQuota } from "./discover";
import { resolveRankRows, writePopularityRanks } from "./rank-writer";
import { missingRefExcluded } from "./missing-refs";
import {
  DISCOVERY_CURSOR_TTL_SEC,
  DISCOVERY_PAGE_BUDGET,
  DISCOVERY_RETRY_UNMATCHED_SOURCES,
  discoveryCursorKey,
  MATCHED_FOR_SYNC,
  REFRESH_MAIN_SHARE,
  SOURCE_PLATFORMS,
  SOURCE_REGION,
} from "./constants";
import { getRedis } from "@/server/redis";
import { fetchWithRetry } from "./retry";
import type { Ctx } from "./context";

export interface StoreTarget {
  gameId: string | null; // null = 신규 게임 생성 대상
  slug: string | null;
  externalId: string;
  /**
   * 발견 목록에서만 얻을 수 있는 이미지(psstore). 신규 게임을 만들 때만 쓰인다 —
   * 기존 매핑으로 들어온 대상에는 없다(그 게임은 이미 커버가 있다).
   */
  coverUrl?: string | null;
  portraitUrl?: string | null;
  /**
   * 가격만 주는 배치(nintendo_jp 가격 API)를 위한 자리. 그런 소스는 응답에 기기도 마스터도 없어서
   * 발견 목록이 준 값, 또는 이미 있는 행의 값이 유일한 근거다(store-fetch, store-apply 가 쓴다).
   */
  platform?: Platform;
  titleCode?: string | null;
  releaseDate?: string | null;
  meta?: StoreSnapshotMeta;
}

type StoreSnapshotMeta = NonNullable<import("@/server/adapters/types").StoreSnapshot["meta"]>;

/**
 * 발견 후보가 들고 온 값을 대상에 그대로 옮긴다 — 가격 API 가 모르는 것들이다.
 * DLC 등록(sync/dlc-writer)도 이 변환을 쓴다. 그쪽도 "가격만 있는 스냅샷에 목록이 준 마스터를 얹는"
 * 같은 자리라, 따로 만들면 한쪽만 고쳐지는 값이 생긴다.
 */
export function candidateAsTarget(c: SearchCandidate, game: { id: string; slug: string } | null): StoreTarget {
  return {
    gameId: game?.id ?? null,
    slug: game?.slug ?? null,
    externalId: c.externalId,
    coverUrl: c.coverUrl,
    portraitUrl: c.portraitUrl,
    platform: c.platform,
    titleCode: c.titleCode,
    releaseDate: c.releaseDate,
    meta: c.meta,
  };
}

/** 대상 선정 몫. 인자가 넷이라 이름을 붙여 호출부에서 순서를 외우지 않게 한다 */
export interface StoreTargetOptions {
  /** 이번 실행의 총 처리 건수 상한 */
  limit: number;
  seedTop?: number;
  pageBudget?: number;
  /** 시드가 가져갈 몫의 비율. 비우면 소스별 값 또는 기본값 (seedQuota) */
  seedShare?: number;
}

export async function listStoreTargets(ctx: Ctx, source: StoreSource, opts: StoreTargetOptions): Promise<StoreTarget[]> {
  const { limit, seedTop, pageBudget } = opts;
  const { db } = ctx;
  const platforms = SOURCE_PLATFORMS[source];
  // 지역을 조건에 넣지 않으면 한 게임에 한국, 일본 행이 둘 다 붙어 같은 대상이 두 번 나오고,
  // 갱신 순서(lastSyncedAt)도 남의 나라 행을 보고 정해진다
  const region = SOURCE_REGION[source];
  // 본편을 먼저 채우고 남는 자리에 나머지(DLC, 에디션, 번들, 체험판)를 넣는다.
  // 한 번에 뽑지 않는 이유는 REFRESH_MAIN_SHARE 주석에 있다 — 한 줄로 세우면 DLC 가 많은 스토어에서
  // 본편이 뒤로 밀린다. 본편이 몫보다 적으면 남는 자리는 그대로 나머지가 가져간다.
  const mainWant = Math.ceil(limit * REFRESH_MAIN_SHARE);
  const mainRows = await refreshRows(db, source, platforms, region, { mainOnly: true, limit: mainWant });
  const restRows = await refreshRows(db, source, platforms, region, {
    mainOnly: false,
    limit: limit - mainRows.length,
  });
  const rows = [...mainRows, ...restRows];

  const seen = new Set<string>();
  const targets: StoreTarget[] = [];
  for (const r of rows) {
    const key = `${r.gameId}:${r.externalId}`;
    if (seen.has(key)) continue; // psstore/nintendo 는 플랫폼 2개 조인으로 중복 가능
    seen.add(key);
    targets.push({ gameId: r.gameId, slug: r.slug, externalId: r.externalId, platform: r.platform ?? undefined });
  }

  // 신규 시드 (§4.2-1). 발견은 부가 작업이다 — 스토어가 목록을 안 주더라도(차단, 개편)
  // 기존 게임 가격 갱신은 계속돼야 한다. 몫을 정하는 규칙은 seedQuota 에 있다.
  const seedWant = seedQuota(source, limit, seedTop, opts.seedShare);
  if (seedWant > 0) {
    try {
      // 한 건씩 unshift 하면 발견 순서가 뒤집힌다 — 카탈로그 꼬리(인기 없는 것, 미출시)가 맨 앞에 오고
      // 한 실행의 limit 을 다 먹는다. 발견 순서(인기순)를 그대로 지키려고 한 번에 앞에 붙인다.
      const seeds = (await seedTargets(ctx, source, seedWant, pageBudget)).filter((t) => {
        if (seen.has(`seed:${t.externalId}`)) return false;
        seen.add(`seed:${t.externalId}`);
        return true;
      });
      targets.unshift(...seeds);
    } catch (e) {
      ctx.errors.push(`[${source}:discover] ${errorMessage(e)}`);
      console.warn(`[sync:${source}] 카탈로그 발견 실패 — 기존 게임 갱신만 진행: ${errorMessage(e)}`);
    }
  }
  // 시드는 앞에 붙으므로 여기서 자르면 신규 게임이 우선되고, 가장 오래 갱신 안 된 기존 게임이 밀린다.
  // limit 을 한 실행의 총 처리 건수 상한으로 지키지 않으면 시드가 많은 날 워크플로 timeout 이 난다.
  return targets.slice(0, limit);
}

/**
 * 갱신 대상 한 묶음 — 이 소스가 아는 게임 중 가장 오래 갱신 안 된 것부터.
 *
 * 지역을 조건에 넣지 않으면 한 게임에 한국, 일본 행이 둘 다 붙어 같은 대상이 두 번 나오고,
 * 갱신 순서(lastSyncedAt)도 남의 나라 행을 보고 정해진다.
 */
async function refreshRows(
  db: Db,
  source: StoreSource,
  platforms: Platform[],
  region: Region,
  opts: { mainOnly: boolean; limit: number },
): Promise<Array<{ gameId: string; externalId: string; slug: string; platform: Platform | null }>> {
  if (opts.limit <= 0) return [];
  return db
    .select({
      gameId: gameSourceRefs.gameId,
      externalId: gameSourceRefs.externalId,
      slug: games.slug,
      platform: gamePlatforms.platform,
    })
    .from(gameSourceRefs)
    .innerJoin(games, eq(games.id, gameSourceRefs.gameId))
    .leftJoin(
      gamePlatforms,
      and(
        eq(gamePlatforms.gameId, gameSourceRefs.gameId),
        inArray(gamePlatforms.platform, platforms),
        eq(gamePlatforms.region, region),
      ),
    )
    .where(
      and(
        eq(gameSourceRefs.source, source),
        inArray(gameSourceRefs.matchedBy, MATCHED_FOR_SYNC),
        // 수집 제외 표시가 걸린 행은 여기서만 뺀다(매장 설계서 §6). 레트로와 굿즈는 온라인 스토어에
        // 없어서, 빼지 않으면 매 실행 몫만 먹고 빈손으로 돌아온다
        eq(games.crawlExcluded, false),
        // 스토어가 연달아 "없다" 고 한 ref 는 뺀다 — 영구 제외가 아니라 한 달에 한 번만 다시 묻는다.
        // 안 빼면 매 회차 같은 건이 실패해 실행이 늘 partial 로 끝난다(sync/missing-refs 주석)
        not(missingRefExcluded()),
        opts.mainOnly ? eq(games.contentType, "game") : ne(games.contentType, "game"),
      ),
    )
    .orderBy(sql`${gamePlatforms.lastSyncedAt} asc nulls first`)
    .limit(opts.limit);
}

/**
 * 이 소스에서 이미 아는 externalId 집합 — 매핑된 것(game_source_refs)과 수집하지 않기로 한 것(discovery_ignores).
 * 무시 목록까지 봐야 에디션 SKU 가 매 실행 "신규" 로 잡혀 시드 몫을 먹는 일이 없다.
 * 매칭에서 떨어진 ID(none)를 아는 것으로 칠지는 소스마다 다르다(DISCOVERY_RETRY_UNMATCHED_SOURCES 주석).
 */
async function knownExternalIds(db: Db, source: StoreSource, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const retryUnmatched = DISCOVERY_RETRY_UNMATCHED_SOURCES.includes(source);
  const [refs, ignored] = await Promise.all([
    db
      .select({ externalId: gameSourceRefs.externalId })
      .from(gameSourceRefs)
      .where(
        and(
          eq(gameSourceRefs.source, source),
          inArray(gameSourceRefs.externalId, ids),
          retryUnmatched ? ne(gameSourceRefs.matchedBy, "none") : undefined,
        ),
      ),
    db
      .select({ externalId: discoveryIgnores.externalId })
      .from(discoveryIgnores)
      .where(and(eq(discoveryIgnores.source, source), inArray(discoveryIgnores.externalId, ids))),
  ]);
  return new Set([...refs, ...ignored].map((r) => r.externalId));
}

/** 이 소스의 ref 가 매칭 탈락 기록(none)뿐인 게임 */
async function gamesWithOnlyUnmatchedRef(db: Db, source: StoreSource): Promise<Set<string>> {
  // PK 가 (game_id, source) 라 게임당 이 소스 ref 는 한 줄이다 — none 인 줄이 곧 "탈락 기록뿐" 이다
  const rows = await db
    .select({ gameId: gameSourceRefs.gameId })
    .from(gameSourceRefs)
    .where(and(eq(gameSourceRefs.source, source), eq(gameSourceRefs.matchedBy, "none")));
  return new Set(rows.map((r) => r.gameId));
}

/** 이 소스에 이미 ref 가 붙은 게임 id 집합. 같은 게임의 두 번째 SKU 를 가려내는 데 쓴다 */
export async function gamesWithRef(db: Db, source: StoreSource): Promise<Set<string>> {
  const rows = await db.select({ gameId: gameSourceRefs.gameId }).from(gameSourceRefs).where(eq(gameSourceRefs.source, source));
  return new Set(rows.map((r) => r.gameId));
}

/**
 * 작품 코드 → 그 코드를 가진 게임. 같은 작품이면 나라가 달라도 같은 코드라
 * "일본에서 발견한 이 상품이 우리가 이미 아는 게임인가" 를 제목 없이 판정한다.
 */
export async function gamesByTitleCode(db: Db, codes: string[]): Promise<Map<string, { id: string; slug: string }>> {
  const wanted = Array.from(new Set(codes));
  if (wanted.length === 0) return new Map();
  const rows = await db
    .select({ code: gamePlatforms.titleCode, id: games.id, slug: games.slug })
    .from(gamePlatforms)
    .innerJoin(games, eq(games.id, gamePlatforms.gameId))
    .where(inArray(gamePlatforms.titleCode, wanted));
  const out = new Map<string, { id: string; slug: string }>();
  for (const r of rows) if (r.code && !out.has(r.code)) out.set(r.code, { id: r.id, slug: r.slug });
  return out;
}

/** 기존 게임에 이 소스의 ID 를 붙인다. 이미 매칭된 게임이면(동시 실행, 수동 매칭) 건드리지 않는다 */
async function linkRef(
  db: Db,
  source: StoreSource,
  gameId: string,
  c: SearchCandidate,
  similarity: number,
  now: Date,
): Promise<void> {
  await db
    .insert(gameSourceRefs)
    .values({
      gameId,
      source,
      externalId: c.externalId,
      url: c.url,
      matchedTitle: c.title,
      matchedBy: "auto",
      confidence: similarity.toFixed(2),
      checkedAt: now,
    })
    .onConflictDoNothing();
}

/**
 * 역방향 매칭용 제목 목록. 카탈로그 전체라 발견, 반영 두 단계가 각각 한 번씩만 읽는다.
 *
 * 수집 제외 행은 후보에서 뺀다 — 슈퍼패미컴판 "젤다의 전설" 에 스팀 SKU 가 붙으면
 * 그 행은 디지털 가격을 갖게 되고, 레트로 상세가 매장 시세 대신 엉뚱한 값을 머리에 건다.
 * 매장 발 게임은 그대로 후보로 둔다 — 스토어 ID 가 붙는 것이 §5.3 이 노리는 일이다.
 */
export async function loadGameTitles(db: Db): Promise<GameTitleRow[]> {
  return db
    .select({
      id: games.id,
      slug: games.slug,
      titleEn: games.titleEn,
      titleKo: games.titleKo,
      contentType: games.contentType,
      parentGameId: games.parentGameId,
    })
    .from(games)
    .where(eq(games.crawlExcluded, false));
}

/** 수집하지 않기로 한 SKU 기록. 다음 실행의 발견이 이걸 보고 건너뛴다 */
export async function ignoreDiscovery(
  db: Db,
  source: StoreSource,
  entry: { externalId: string; gameId: string | null; reason: string; now: Date },
): Promise<void> {
  await db
    .insert(discoveryIgnores)
    .values({ source, externalId: entry.externalId, gameId: entry.gameId, reason: entry.reason, createdAt: entry.now })
    .onConflictDoNothing();
}

/**
 * 카탈로그에서 신규 대상을 찾는다. 어댑터가 목록 페이지를 흘려보내면 여기서 아는 것을 걸러
 * 신규 seedWant 건을 채울 때까지 파고든다(sync/discover).
 * - steam(기준 소스): 게임이 여기서 생겨나므로 발견한 appid 를 그대로 신규 생성 대상으로 둔다.
 * - 그 외 소스: 같은 게임이 Steam 으로 이미 들어와 있을 수 있다. 제목으로 역방향 매칭해
 *   맞으면 ref 만 붙여 기존 게임의 플랫폼으로 흡수하고, 못 찾은 것만 새 게임으로 만든다.
 *   이 단계가 없으면 멀티플랫폼 게임이 플랫폼 수만큼 중복 등록된다.
 */
async function seedTargets(ctx: Ctx, source: StoreSource, seedWant: number, pageBudget?: number): Promise<StoreTarget[]> {
  const { db } = ctx;
  const adapter = getStoreAdapter(source);
  if (!adapter.discoverPages) return [];

  // 이 발견 걸음이 주운 순번만 센다. ctx.rankedCount 는 0단계(listPopularPages)가 이미 쓴 것을
  // 포함하고 있어서, 그걸 그대로 적으면 같은 수를 두 번 말한다
  let rankedHere = 0;
  const startPage = adapter.resumableDiscovery ? await readDiscoveryCursor(source) : undefined;
  const result = await fetchWithRetry(() =>
    collectFreshCandidates(adapter.discoverPages!(startPage), {
      want: seedWant,
      pageBudget: pageBudget ?? DISCOVERY_PAGE_BUDGET[source] ?? 0,
      unknownOf: async (ids) => {
        const known = await knownExternalIds(db, source, ids);
        return ids.filter((id) => !known.has(id));
      },
      // 순번은 발견의 부산물이다 — 여기서 실패해도 발견을 멈추지 않는다.
      // 신규 등록이 순위 기록 때문에 통째로 무너지면 손해가 훨씬 크다(§7 "항목 하나의 실패가 배치를 멈추지 않는다").
      onRanked: async (ranked) => {
        try {
          const rows = await resolveRankRows(db, source, ranked);
          // ctx.now 를 쓴다 — 실행 하나에 시각 하나여야 페이지끼리 서로 덮지 않는다(rank-writer 주석)
          const n = await writePopularityRanks(db, source, rows, ctx.now);
          rankedHere += n;
          ctx.rankedCount = (ctx.rankedCount ?? 0) + n;
        } catch (e) {
          console.warn(`[sync:${source}] 인기순위 순번 기록 실패: ${errorMessage(e)}`);
        }
      },
    }),
  );
  const { fresh } = result;
  if (startPage !== undefined) await writeDiscoveryCursor(source, nextDiscoveryCursor(startPage, result));
  // 콘솔 줄은 워크플로 로그가 지워지면 사라진다 — 포화 판단에 쓰려면 실행 기록으로 남아야 한다
  ctx.discovery = {
    pages: result.pages,
    scanned: result.scanned,
    fresh: fresh.length,
    stoppedBy: result.stoppedBy,
    ...(startPage !== undefined ? { startPage } : {}),
  };
  console.log(
    `[sync:${source}] 발견 ${result.pages}페이지, ${result.scanned}건 훑어 신규 ${fresh.length}건 (중단 사유: ${result.stoppedBy})` +
      (rankedHere > 0 ? `, 걸으며 순번 ${rankedHere}건 더 기록` : ""),
  );
  if (fresh.length === 0) return [];


  // Steam 은 기준 소스라 흡수할 상대가 없다 — 발견한 것이 곧 새 게임이다
  if (source === "steam") {
    return fresh.map((c) => candidateAsTarget(c, null));
  }

  const titles = await loadGameTitles(db);
  // 작품 코드로 먼저 맞춘다. 제목보다 앞세우는 이유: 나라가 다르면 제목이 다른 문자 체계라
  // 유사도가 0 인 경우가 있다(일본 "ア フォルド エーパート" = 우리 "A Fold Apart").
  const ownerByCode = await gamesByTitleCode(db, fresh.map((c) => c.titleCode).filter((v): v is string => !!v));

  // 스토어는 같은 게임을 에디션, 플랫폼별 SKU 로 여러 벌 내보낸다. 그 게임에 이 소스 ref 가 이미 있으면
  // 두 번째 SKU 는 수집하지 않는다 — 수집하면 본편 가격이 에디션 가격(보통 더 비싸다)으로 덮인다.
  const refOwned = await gamesWithRef(db, source);
  // 매칭에서 떨어진 기록(none)만 가진 게임. refOwned 에 들어 있어 아래에서 "다른 SKU" 로 걸러지는데,
  // 이유가 다르다 — 매칭은 "닮지 않았다" 고 했고 발견은 "닮았다" 고 한다. 두 판정이 엇갈리면
  // 새 게임으로도, 그 게임의 ref 로도 만들지 않고 사람 몫으로 남긴다(중복도 오매칭도 안 만드는 쪽)
  const unmatchedOnly = DISCOVERY_RETRY_UNMATCHED_SOURCES.includes(source) ? await gamesWithOnlyUnmatchedRef(db, source) : new Set<string>();
  const newTitles = new Set<string>(); // 이번 실행에서 새 게임으로 보낸 제목 — 한 실행 안의 SKU 중복도 막는다

  const out: StoreTarget[] = [];
  let absorbed = 0;
  let ignored = 0;
  const ignore = async (externalId: string, gameId: string | null, reason: string) => {
    await ignoreDiscovery(db, source, { externalId, gameId, reason, now: ctx.now });
    ignored++;
  };

  for (const c of fresh) {
    const byCode = c.titleCode ? ownerByCode.get(c.titleCode) : undefined;
    if (byCode) {
      if (refOwned.has(byCode.id)) {
        await ignore(c.externalId, byCode.id, `${byCode.slug} 의 다른 판매 단위 (작품 코드 ${c.titleCode})`);
        continue;
      }
      await linkRef(db, source, byCode.id, c, 1, ctx.now);
      refOwned.add(byCode.id);
      out.push(candidateAsTarget(c, byCode));
      absorbed++;
      continue;
    }
    const hit = findGameByTitle(c.title, titles);
    if (!hit) {
      const key = normalizeTitle(c.title);
      if (key && newTitles.has(key)) {
        await ignore(c.externalId, null, "같은 실행에서 이미 만든 게임의 다른 SKU");
        continue;
      }
      if (key) newTitles.add(key);
      out.push(candidateAsTarget(c, null));
      continue;
    }
    if (refOwned.has(hit.game.id)) {
      const reason = unmatchedOnly.has(hit.game.id)
        ? `${hit.game.slug} 와 제목이 닮았지만 매칭은 탈락시킨 후보 — 사람 판정 몫`
        : `${hit.game.slug} 의 다른 SKU (에디션, 플랫폼판)`;
      await ignore(c.externalId, hit.game.id, reason);
      continue;
    }
    await linkRef(db, source, hit.game.id, c, hit.similarity, ctx.now);
    refOwned.add(hit.game.id);
    out.push(candidateAsTarget(c, hit.game));
    absorbed++;
  }
  console.log(
    `[sync:${source}] 신규 ${fresh.length}건 (기존 게임에 흡수 ${absorbed}, 새 게임 ${out.length - absorbed}, 중복 SKU 제외 ${ignored})`,
  );
  return out;
}

/**
 * 지난 실행이 멈춘 쪽. 못 읽으면(키 없음, Redis 장애) 1쪽 — 처음부터 읽는 것은 느릴 뿐 틀리지 않는다.
 * 커서 때문에 발견이 멈추면 안 된다: 발견은 부가 작업이고 그 부가 작업의 부가 값이 이것이다.
 */
async function readDiscoveryCursor(source: StoreSource): Promise<number> {
  try {
    const v = Number(await getRedis().get(discoveryCursorKey(source)));
    return Number.isInteger(v) && v >= 1 ? v : 1;
  } catch (e) {
    console.warn(`[sync:${source}] 발견 커서 읽기 실패 — 1쪽부터: ${errorMessage(e)}`);
    return 1;
  }
}

async function writeDiscoveryCursor(source: StoreSource, page: number): Promise<void> {
  try {
    await getRedis().set(discoveryCursorKey(source), String(page), { ex: DISCOVERY_CURSOR_TTL_SEC });
  } catch (e) {
    console.warn(`[sync:${source}] 발견 커서 쓰기 실패 — 다음 실행은 같은 쪽부터: ${errorMessage(e)}`);
  }
}
