// 가격 변동 훑기의 DB 쪽 — 스토어 값을 DB 로 보내 DB 안에서 견주고, 바뀐 행만 받는다.
//
// 왜 DB 안에서 견주나: Neon 무료 전송량(월 5GB)은 DB 에서 나가는 양만 센다. 전에는 회차마다 소스의 가격 행 전체를 받아 와
// 여기서 견줬다 — Xbox 2만 행이 1.1MB 로 한 회차 전송량 2.48MB 의 절반이었다(2026-11-12 실측). 스토어 값을 실어 보내는 쪽은 세지 않는다.
//
// 고르는 결과는 전과 같아야 한다. 그래서 SQL 은 "견줄 가치가 있는 행" 을 넉넉히 거르는 데까지만 하고,
// 최종 판정(listMove, priceMove)과 순서는 index.ts 가 전처럼 TS 로 한다. SQL 조건은 그 판정과 같은 식이라 더 좁지 않다.
import { and, eq, inArray, not, sql, type SQL } from "drizzle-orm";
import { gamePlatforms, gameSourceRefs, games, gameSubscriptions, subscriptions, type Platform } from "@/server/db/schema";
import type { PriceQuote } from "@/server/adapters/types";
import type { StoreSource } from "@/server/adapters";
import { MATCHED_FOR_SYNC, PRICE_SWEEP_COMPARE_CHUNK, SOURCE_PLATFORMS, SOURCE_REGION } from "@/server/sync/constants";
import { missingRefExcluded } from "@/server/sync/missing-refs";
import type { Ctx } from "@/server/sync/context";

/** 훑기가 견주는 데 쓰는 칸 */
export type SweepBase = {
  externalId: string;
  platform: Platform | null;
  listPrice: number | null;
  currentPrice: number | null;
  discountPct: number | null;
  hasUrl: boolean;
};

export function sweepScope(source: StoreSource) {
  return and(
    eq(gameSourceRefs.source, source),
    inArray(gameSourceRefs.matchedBy, MATCHED_FOR_SYNC),
    eq(games.crawlExcluded, false),
    not(missingRefExcluded()),
  );
}

export function sweepJoin(source: StoreSource) {
  return and(
    eq(gamePlatforms.gameId, gameSourceRefs.gameId),
    inArray(gamePlatforms.platform, SOURCE_PLATFORMS[source]),
    eq(gamePlatforms.region, SOURCE_REGION[source]),
  );
}

/** 훑기 범위의 행. 여러 질의가 같은 FROM 을 쓴다 */
function sweepFrom(source: StoreSource): SQL {
  return sql`from ${gameSourceRefs}
    inner join ${games} on ${eq(games.id, gameSourceRefs.gameId)}
    inner join ${gamePlatforms} on ${sweepJoin(source)}
    where ${sweepScope(source)}`;
}

type BaseRow = { e: string; platform: Platform | null; list_price: number | null; current_price: number | null; discount_pct: number | null; has_url: boolean };

function toBase(r: BaseRow): SweepBase {
  return { externalId: r.e, platform: r.platform, listPrice: r.list_price, currentPrice: r.current_price, discountPct: r.discount_pct, hasUrl: r.has_url };
}

function chunked<T>(xs: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += PRICE_SWEEP_COMPARE_CHUNK) out.push(xs.slice(i, i + PRICE_SWEEP_COMPARE_CHUNK));
  return out;
}

/**
 * 가격 배치로 물을 상품 번호(닌텐도, 스팀). 오래된 순이다 — 번호의 기기 행 중 가장 오래 안 본 행의 시각으로 줄 세운다.
 * 전에 행 전체를 오래된 순으로 읽어 번호가 처음 나온 자리로 묶던 것과 같은 순서다(min 은 null 을 건너뛰고, 다 null 이면 맨 뒤)
 */
export async function sweepIds(ctx: Ctx, source: StoreSource): Promise<string[]> {
  const res = await ctx.db.execute<{ e: string }>(sql`
    select ${gameSourceRefs.externalId} as e ${sweepFrom(source)}
    group by ${gameSourceRefs.externalId}
    order by min(${gamePlatforms.lastSyncedAt}) asc nulls last`);
  return res.rows.map((r) => r.e);
}

/**
 * 배치로 받은 값과 다른 행(닌텐도, 스팀). 값을 못 준 상품(현재가 null)은 보내지 않는다 — priceMove 가 변동으로 치지 않는다.
 * 돌려주는 순서는 오래된 순이다(index.ts 가 상품 순서 안에서 이 순서를 지킨다)
 */
export async function compareBatchSnaps(ctx: Ctx, source: StoreSource, snaps: Array<{ e: string; c: number; p: number | null }>): Promise<SweepBase[]> {
  const out: SweepBase[] = [];
  for (const part of chunked(snaps)) {
    const res = await ctx.db.execute<BaseRow>(sql`
      with q as (select * from jsonb_to_recordset(${JSON.stringify(part)}::jsonb) as q(e text, c int, p int)),
      b as (
        select ${gameSourceRefs.externalId} as e, ${gamePlatforms.platform} as platform, ${gamePlatforms.listPrice} as list_price,
          ${gamePlatforms.currentPrice} as current_price, ${gamePlatforms.discountPct} as discount_pct,
          ${gamePlatforms.storeUrl} is not null as has_url, ${gamePlatforms.lastSyncedAt} as ls
        ${sweepFrom(source)} and ${gameSourceRefs.externalId} in (select e from q)
      )
      select e, platform, list_price, current_price, discount_pct, has_url from b
      where exists (select 1 from q where q.e = b.e and (coalesce(q.p, 0) <> coalesce(b.discount_pct, 0) or q.c is distinct from b.current_price))
      order by ls asc nulls last`);
    out.push(...res.rows.map(toBase));
  }
  return out;
}

/** 목록 소스(PS, Xbox, Epic)에서 견줄 대표 행이 있는 상품 수 — 훑기 기록의 "n/m건" 의 m */
export async function sweepListTotal(ctx: Ctx, source: StoreSource): Promise<number> {
  const res = await ctx.db.execute<{ n: number }>(sql`
    select count(distinct ${gameSourceRefs.externalId})::int as n ${sweepFrom(source)} and ${gamePlatforms.storeUrl} is not null`);
  return res.rows[0]?.n ?? 0;
}

export interface ListCompare {
  /** 목록 값 중 우리 대표 행과 만난 수(같은 상품이 두 번 실리면 두 번 센다 — 전과 같다) */
  seen: number;
  /** 바뀐 것으로 보이는 대표 행. 판정은 index.ts 가 listMove 로 다시 한다 */
  moved: Map<string, SweepBase>;
  /**
   * 구독 맞추기에 넘길 상품. 구독 표기가 있는 상품과, 지금 범위 안 구독이 붙어 있는 상품만 고른다 —
   * syncListSubscriptions 는 그 둘 말고는 아무것도 바꾸지 않아서, 나머지(구독 없는 우리 상품 수천 개)는 받아 올 까닭이 없다
   */
  subs: Set<string>;
}

/**
 * 목록 값과 대표 행을 견준다. 대표 행은 상품마다 주소가 있는 기기 행 중 가장 오래 안 본 것 하나다(전에 TS 가 고르던 것과 같다).
 * k: 구독 표기가 없으면 null, 빈 배열이면 1, 무엇이든 들었으면 2
 */
export async function compareListQuotes(ctx: Ctx, source: StoreSource, quotes: PriceQuote[], subScope: readonly string[]): Promise<ListCompare> {
  const result: ListCompare = { seen: 0, moved: new Map(), subs: new Set() };
  const rows = quotes.map((q) => ({
    e: q.storeExternalId,
    l: q.listPrice,
    c: q.currentPrice,
    p: q.discountPct,
    k: q.subscriptionKeys === undefined ? null : q.subscriptionKeys.length > 0 ? 2 : 1,
  }));
  for (const part of chunked(rows)) {
    const res = await ctx.db.execute<{ seen: number; moved: BaseRow[]; subs: string[] }>(sql`
      with q as (select * from jsonb_to_recordset(${JSON.stringify(part)}::jsonb) as q(e text, l int, c int, p int, k int)),
      b as (
        select distinct on (${gameSourceRefs.externalId}) ${gameSourceRefs.externalId} as e, ${gamePlatforms.platform} as platform,
          ${gamePlatforms.listPrice} as list_price, ${gamePlatforms.currentPrice} as current_price, ${gamePlatforms.discountPct} as discount_pct,
          true as has_url
        ${sweepFrom(source)} and ${gamePlatforms.storeUrl} is not null and ${gameSourceRefs.externalId} in (select e from q)
        order by ${gameSourceRefs.externalId}, ${gamePlatforms.lastSyncedAt} asc nulls last
      ),
      held as (
        select distinct r2.external_id as e
        from ${gameSubscriptions} gs
        join ${subscriptions} s on s.id = gs.subscription_id
        join ${gamePlatforms} gp2 on gp2.id = gs.game_platform_id
        join ${gameSourceRefs} r2 on r2.game_id = gp2.game_id and r2.source = ${source}
        where gs.removed_at is null and s.key in (select jsonb_array_elements_text(${JSON.stringify(subScope)}::jsonb))
      )
      select
        (select count(*)::int from q join b using (e)) as seen,
        coalesce((select json_agg(b) from b where exists (
          select 1 from q where q.e = b.e and q.c is not null and b.list_price is not null and q.l = b.list_price
            and (coalesce(q.p, 0) <> coalesce(b.discount_pct, 0) or q.c is distinct from b.current_price))), '[]'::json) as moved,
        coalesce((select json_agg(b.e) from b where exists (
          select 1 from q where q.e = b.e and (q.k = 2 or (q.k = 1 and b.e in (select e from held))))), '[]'::json) as subs`);
    const row = res.rows[0];
    if (!row) continue;
    result.seen += row.seen;
    for (const m of row.moved) result.moved.set(m.e, toBase(m));
    for (const e of row.subs) result.subs.add(e);
  }
  return result;
}
