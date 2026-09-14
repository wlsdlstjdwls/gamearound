// 스토어 소스의 수집 대상 선정 — 기존 매핑 + 카탈로그 신규 발견(시드).
import { and, eq, inArray, sql } from "drizzle-orm";
import { discoveryIgnores, gamePlatforms, gameSourceRefs, games, type Platform } from "@/server/db/schema";
import type { Db } from "@/server/db/client";
import { getStoreAdapter, type StoreSource } from "@/server/adapters";
import type { SearchCandidate } from "@/server/adapters/types";
import { errorMessage } from "@/lib/errors";
import { normalizeTitle } from "@/lib/slug";
import { findGameByTitle, type GameTitleRow } from "./match";
import { collectFreshCandidates } from "./discover";
import { DISCOVERY_PAGE_BUDGET, MATCHED_FOR_SYNC, SEED_SHARE_MAX, SOURCE_PLATFORMS, SOURCE_REGION } from "./constants";
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

/** 대상 선정 몫. 인자가 넷이라 이름을 붙여 호출부에서 순서를 외우지 않게 한다 */
export interface StoreTargetOptions {
  /** 이번 실행의 총 처리 건수 상한 */
  limit: number;
  seedTop?: number;
  pageBudget?: number;
  /** 시드가 가져갈 몫의 비율. 비우면 SEED_SHARE_MAX */
  seedShare?: number;
}

export async function listStoreTargets(ctx: Ctx, source: StoreSource, opts: StoreTargetOptions): Promise<StoreTarget[]> {
  const { limit, seedTop, pageBudget } = opts;
  const { db } = ctx;
  const platforms = SOURCE_PLATFORMS[source];
  // 지역을 조건에 넣지 않으면 한 게임에 한국, 일본 행이 둘 다 붙어 같은 대상이 두 번 나오고,
  // 갱신 순서(lastSyncedAt)도 남의 나라 행을 보고 정해진다
  const region = SOURCE_REGION[source];
  const rows = await db
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
    .where(and(eq(gameSourceRefs.source, source), inArray(gameSourceRefs.matchedBy, MATCHED_FOR_SYNC)))
    .orderBy(sql`${gamePlatforms.lastSyncedAt} asc nulls first`)
    .limit(limit);

  const seen = new Set<string>();
  const targets: StoreTarget[] = [];
  for (const r of rows) {
    const key = `${r.gameId}:${r.externalId}`;
    if (seen.has(key)) continue; // psstore/nintendo 는 플랫폼 2개 조인으로 중복 가능
    seen.add(key);
    targets.push({ gameId: r.gameId, slug: r.slug, externalId: r.externalId, platform: r.platform ?? undefined });
  }

  // 신규 시드 (§4.2-1). 발견은 부가 작업이다 — 스토어가 목록을 안 주더라도(차단, 개편)
  // 기존 게임 가격 갱신은 계속돼야 한다.
  // 시드가 가져갈 몫을 배치의 일부로 제한하는 이유: 시드는 아래에서 대상 목록 앞에 붙는다.
  // 상한이 없으면 신규가 많은 날 시드가 배치를 통째로 먹고 기존 게임 가격이 한 번도 안 갱신된다.
  // 가격 갱신을 다른 실행이 따로 맡는 자리(크론 discover 모드)는 seedShare 로 이 제한을 푼다 —
  // 거기서 절반을 기존 갱신에 묶어 두면 그 절반이 prices 모드가 이미 하는 일과 겹친다.
  const seedWant = Math.min(seedTop ?? 0, Math.floor(limit * (opts.seedShare ?? SEED_SHARE_MAX)));
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
 * 이 소스에서 이미 아는 externalId 집합 — 매핑된 것(game_source_refs)과 수집하지 않기로 한 것(discovery_ignores).
 * 무시 목록까지 봐야 에디션 SKU 가 매 실행 "신규" 로 잡혀 시드 몫을 먹는 일이 없다.
 */
async function knownExternalIds(db: Db, source: StoreSource, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const [refs, ignored] = await Promise.all([
    db
      .select({ externalId: gameSourceRefs.externalId })
      .from(gameSourceRefs)
      .where(and(eq(gameSourceRefs.source, source), inArray(gameSourceRefs.externalId, ids))),
    db
      .select({ externalId: discoveryIgnores.externalId })
      .from(discoveryIgnores)
      .where(and(eq(discoveryIgnores.source, source), inArray(discoveryIgnores.externalId, ids))),
  ]);
  return new Set([...refs, ...ignored].map((r) => r.externalId));
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
async function gamesByTitleCode(db: Db, codes: string[]): Promise<Map<string, { id: string; slug: string }>> {
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
      matchedBy: "auto",
      confidence: similarity.toFixed(2),
      checkedAt: now,
    })
    .onConflictDoNothing();
}

/** 역방향 매칭용 제목 목록. 카탈로그 전체라 발견, 반영 두 단계가 각각 한 번씩만 읽는다 */
export async function loadGameTitles(db: Db): Promise<GameTitleRow[]> {
  return db.select({ id: games.id, slug: games.slug, titleEn: games.titleEn, titleKo: games.titleKo }).from(games);
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

  const result = await fetchWithRetry(() =>
    collectFreshCandidates(adapter.discoverPages!(), {
      want: seedWant,
      pageBudget: pageBudget ?? DISCOVERY_PAGE_BUDGET[source] ?? 0,
      unknownOf: async (ids) => {
        const known = await knownExternalIds(db, source, ids);
        return ids.filter((id) => !known.has(id));
      },
    }),
  );
  const { fresh } = result;
  // 콘솔 줄은 워크플로 로그가 지워지면 사라진다 — 포화 판단에 쓰려면 실행 기록으로 남아야 한다
  ctx.discovery = { pages: result.pages, scanned: result.scanned, fresh: fresh.length, stoppedBy: result.stoppedBy };
  console.log(
    `[sync:${source}] 발견 ${result.pages}페이지, ${result.scanned}건 훑어 신규 ${fresh.length}건 (중단 사유: ${result.stoppedBy})`,
  );
  if (fresh.length === 0) return [];

  /** 발견 후보가 들고 온 값을 대상에 그대로 옮긴다 — 가격 API 가 모르는 것들이다 */
  const asTarget = (c: (typeof fresh)[number], game: { id: string; slug: string } | null): StoreTarget => ({
    gameId: game?.id ?? null,
    slug: game?.slug ?? null,
    externalId: c.externalId,
    coverUrl: c.coverUrl,
    portraitUrl: c.portraitUrl,
    platform: c.platform,
    titleCode: c.titleCode,
    releaseDate: c.releaseDate,
    meta: c.meta,
  });

  // Steam 은 기준 소스라 흡수할 상대가 없다 — 발견한 것이 곧 새 게임이다
  if (source === "steam") {
    return fresh.map((c) => asTarget(c, null));
  }

  const titles = await loadGameTitles(db);
  // 작품 코드로 먼저 맞춘다. 제목보다 앞세우는 이유: 나라가 다르면 제목이 다른 문자 체계라
  // 유사도가 0 인 경우가 있다(일본 "ア フォルド エーパート" = 우리 "A Fold Apart").
  const ownerByCode = await gamesByTitleCode(db, fresh.map((c) => c.titleCode).filter((v): v is string => !!v));

  // 스토어는 같은 게임을 에디션, 플랫폼별 SKU 로 여러 벌 내보낸다. 그 게임에 이 소스 ref 가 이미 있으면
  // 두 번째 SKU 는 수집하지 않는다 — 수집하면 본편 가격이 에디션 가격(보통 더 비싸다)으로 덮인다.
  const refOwned = await gamesWithRef(db, source);
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
      out.push(asTarget(c, byCode));
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
      out.push(asTarget(c, null));
      continue;
    }
    if (refOwned.has(hit.game.id)) {
      await ignore(c.externalId, hit.game.id, `${hit.game.slug} 의 다른 SKU (에디션, 플랫폼판)`);
      continue;
    }
    await linkRef(db, source, hit.game.id, c, hit.similarity, ctx.now);
    refOwned.add(hit.game.id);
    out.push(asTarget(c, hit.game));
    absorbed++;
  }
  console.log(
    `[sync:${source}] 신규 ${fresh.length}건 (기존 게임에 흡수 ${absorbed}, 새 게임 ${out.length - absorbed}, 중복 SKU 제외 ${ignored})`,
  );
  return out;
}
