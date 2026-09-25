// 스토어 인기순위 순번 반영 — 발견이 목록을 걸어 내려가며 주운 순번을 game_platforms 에 쓴다.
//
// 왜 발견 단계에 붙어 있나: 순번은 목록의 순서 그 자체라 목록을 읽는 순간에만 존재한다.
// 단건 조회(appdetails, GetItems)는 "몇 위인가" 를 알려주지 않는다 — 나중에 따로 물을 방법이 없다.
//
// 왜 별도 파일인가: sync/discover 는 DB 를 모르는 순수 판단(테스트가 쉽다). DB 를 만지는 몫은 여기다.
import { and, eq, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { gamePlatforms, gameSourceRefs } from "@/server/db/schema";
import type { Db } from "@/server/db/client";
import type { StoreSource } from "@/server/adapters";
import type { SearchCandidate, StoreAdapter } from "@/server/adapters/types";
import { errorMessage } from "@/lib/errors";
import { MATCHED_FOR_SYNC, POPULARITY_RANK_PAGES, POPULARITY_RANK_PAGES_DEFAULT, SOURCE_PLATFORMS, SOURCE_REGION } from "./constants";
import type { Ctx } from "./context";

/** 순번이 달린 후보를 (게임, 순번) 쌍으로 푼 것 */
export interface RankRow {
  gameId: string;
  rank: number;
}

/**
 * 후보의 externalId 를 이미 등록된 게임으로 옮긴다. 아직 모르는 후보는 여기서 떨어진다 —
 * 그 게임은 이번 실행이 새로 만들 것이고, 만들어지기 전에는 붙일 행이 없다.
 * 다음 실행의 발견이 같은 자리를 다시 지나며 순번을 채운다.
 *
 * 한 게임에 같은 소스의 ref 가 둘 이상일 수 있다(에디션 SKU). 그때는 **더 높은 순위**(작은 수)를
 * 남긴다 — 본편과 디럭스판이 각각 순위에 있으면 그 게임의 인기는 둘 중 앞선 쪽이다.
 *
 * 확정 ref(auto, manual)만 순위를 받는다. 검수 대기(pending)와 미매칭 기록(none)은 "이 번호가 이 게임이
 * 아닐 수 있다" 는 표시다 — 2026-09-25 실측으로 PS 콘셉트 10001130(블랙 옵스 7)을 pending 으로 쥔
 * COD 세대 호환 번들 셋이 전부 18위를 받아 인기순 첫 화면에 나란히 섰고, none 으로 남은 TABS 가
 * 월드 오브 탱크 순위(141위)를 받았다. 가드(shared-external-id)가 가격은 막았는데 순위만 새고 있었다.
 */
export async function resolveRankRows(db: Db, source: StoreSource, ranked: SearchCandidate[]): Promise<RankRow[]> {
  const rankOf = new Map<string, number>();
  for (const c of ranked) {
    if (c.rank === undefined) continue;
    const prev = rankOf.get(c.externalId);
    if (prev === undefined || c.rank < prev) rankOf.set(c.externalId, c.rank);
  }
  if (rankOf.size === 0) return [];

  const refs = await db
    .select({ externalId: gameSourceRefs.externalId, gameId: gameSourceRefs.gameId, matchedBy: gameSourceRefs.matchedBy })
    .from(gameSourceRefs)
    .where(and(eq(gameSourceRefs.source, source), inArray(gameSourceRefs.externalId, [...rankOf.keys()])));

  const best = new Map<string, number>();
  for (const r of refs) {
    // 질의에서 거르지 않고 여기서 거른다 — 한 페이지 ref 는 100건 안팎이라 값이 같고, 판단이 테스트에 드러난다
    if (!(MATCHED_FOR_SYNC as readonly string[]).includes(r.matchedBy)) continue;
    const rank = rankOf.get(r.externalId);
    if (rank === undefined) continue;
    const prev = best.get(r.gameId);
    if (prev === undefined || rank < prev) best.set(r.gameId, rank);
  }
  return [...best].map(([gameId, rank]) => ({ gameId, rank }));
}

/**
 * 한 번의 UPDATE 로 모두 쓴다.
 *
 * 건별로 쓰지 않는 이유는 왕복이다 — Neon 왕복 1회가 실측 220ms 라(lib 주석) 페이지당 100건을
 * 하나씩 쓰면 페이지마다 22초, 인기순위 한 바퀴(76페이지)면 28분이 된다. 발견 자체보다 오래 걸린다.
 *
 * 생 SQL 을 쓰는 것은 drizzle 빌더에 "VALUES 목록과 조인하는 UPDATE" 가 없어서다.
 * 값은 전부 바인딩으로 나간다 — 문자열을 이어 붙이지 않는다(lib 의 Neon 백슬래시 주석).
 *
 * `runAt` 은 **실행 하나에 하나**여야 한다(페이지마다 new Date() 가 아니다). 덮어쓸지 말지를
 * 이 값으로 가르기 때문이다. 2026-09-21 실측으로 찾은 일이다: 같은 게임의 에디션 SKU 가
 * 본편과 따로 순위에 오르면(본편 50위, 디럭스판 250위) 둘이 다른 페이지에 흩어져 들어와
 * 나중 페이지가 앞 순위를 덮었다. 발견의 중복 제거는 externalId 기준이라 이걸 못 막는다 —
 * 두 SKU 는 서로 다른 externalId 이고, 같은 게임이 되는 것은 ref 를 푼 뒤다.
 *
 *   - 기존 값이 이번 실행 것이면(stamp = runAt): 더 높은 순위만 이긴다
 *   - 기존 값이 지난 실행 것이면(stamp < runAt): 무조건 새 값이 이긴다 — 순위가 내려간 것도 사실이다
 */
export async function writePopularityRanks(db: Db, source: StoreSource, rows: RankRow[], runAt: Date): Promise<number> {
  if (rows.length === 0) return 0;
  const platforms = SOURCE_PLATFORMS[source];
  const region = SOURCE_REGION[source];
  const tuples = rows.map((r) => sql`(${r.gameId}::uuid, ${r.rank}::int)`);

  const res = await db.execute(sql`
    update ${gamePlatforms}
    set popularity_rank = v.rank, popularity_rank_at = ${runAt}
    from (values ${sql.join(tuples, sql`, `)}) as v(game_id, rank)
    where ${gamePlatforms.gameId} = v.game_id
      and ${inArray(gamePlatforms.platform, platforms)}
      and ${eq(gamePlatforms.region, region)}
      and (
        ${gamePlatforms.popularityRank} is null
        or ${gamePlatforms.popularityRankAt} is null
        or ${gamePlatforms.popularityRankAt} < ${runAt}
        or ${gamePlatforms.popularityRank} > v.rank
      )
  `);
  // 시도한 수가 아니라 **실제로 바뀐 행 수**를 돌려준다. 둘은 갈린다 — ref 는 있는데 그 소스의
  // game_platforms 행이 아직 없는 게임이 있고(2026-09-21 실측 500건 중 1건), 가드에 걸려
  // 안 덮은 행도 있다. 이 숫자는 "순위 수집이 도는가" 를 재는 감시 값이라 부풀면 고장을 못 잡는다.
  return (res as { rowCount?: number }).rowCount ?? 0;
}

/**
 * 인기순위를 앞에서부터 훑어 순번을 기록한다.
 *
 * 발견과 따로 도는 이유는 adapters/types 의 listPopularPages 주석에 있다 — 한 줄로 줄이면
 * "발견은 신규를 채우면 멈추는데 순위는 신규와 상관없는 값" 이다.
 *
 * 실패가 수집을 멈추지 않는다. 순위는 화면을 더 낫게 하는 값이지 가격처럼 없으면 안 되는 값이 아니다.
 * 막히면 화면이 예전 순서로 돌아갈 뿐이고, 그 사실은 rankedCount 가 0 으로 떨어지는 것으로 드러난다.
 */
export async function syncPopularityRanks(ctx: Ctx, source: StoreSource, adapter: StoreAdapter): Promise<number> {
  if (!adapter.listPopularPages) return 0;
  const { db } = ctx;
  let written = 0;
  try {
    const pages = POPULARITY_RANK_PAGES[source] ?? POPULARITY_RANK_PAGES_DEFAULT;
    for await (const page of adapter.listPopularPages(pages)) {
      const ranked = page.filter((c) => c.rank !== undefined);
      if (ranked.length === 0) continue;
      const rows = await resolveRankRows(db, source, ranked);
      written += await writePopularityRanks(db, source, rows, ctx.now);
    }
  } catch (e) {
    console.warn(`[sync:${source}] 인기순위 수집 중단(${written}건까지 기록): ${errorMessage(e)}`);
  }
  ctx.rankedCount = (ctx.rankedCount ?? 0) + written;
  return written;
}
