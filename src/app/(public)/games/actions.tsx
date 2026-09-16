"use server";
// 목록 화면의 "더 보기" — 다음 페이지 카드들을 **이미 그려진 상태로** 돌려준다.
//
// 왜 DTO 가 아니라 JSX 인가: 카드(GameCard)는 서버 컴포넌트다. DTO 만 넘기면 카드를 클라이언트에서
// 한 벌 더 그려야 하고, 그러면 같은 화면이 서버 카드와 클라이언트 카드 두 종류를 갖게 된다.
// 서버 액션은 RSC 결과를 그대로 실어 보낼 수 있으므로 카드는 계속 서버에서만 그려진다.
//
// 첫 페이지는 여전히 page.tsx 가 서버에서 그린다 — 검색 로봇과 JS 가 꺼진 브라우저가 보는 것이 그 한 장이다.
import { GameCard } from "@/components/game-card";
import { GameRow } from "@/components/game-row";
import { type GameView } from "@/lib/games/view";
import { stagger } from "@/lib/motion";
import { listGames, type GameListFilter } from "@/server/services/games";

export type MorePage = {
  nodes: React.ReactNode;
  /** 더 받을 게 남았는지. 총 개수를 클라이언트가 다시 계산하지 않도록 서버가 판정해서 준다 */
  hasMore: boolean;
};

export async function loadMoreGames(filter: GameListFilter, page: number, view: GameView = "card"): Promise<MorePage> {
  const result = await listGames({ ...filter, page });
  // 카드냐 줄이냐만 다르고 값도 순서도 같다 — 고르는 자리를 하나로 둬야 두 보기가 갈라지지 않는다
  const Item = view === "list" ? GameRow : GameCard;
  return {
    // 첫 장(page.tsx)과 달리 `.enter-late` 를 쓴다 — 첫 등장이 끝난 셸에서는 `.enter-item` 이 조용해지고,
    // 방금 만들어 붙이는 이 카드들만 등장해야 한다(lib/motion 의 markPageEntered, globals.css)
    nodes: result.items.map((g, i) => (
      <li key={g.slug} className="enter-late" style={stagger(i)}>
        <Item game={g} variant={filter.sort === "release" ? "release" : "discount"} />
      </li>
    )),
    hasMore: result.page < result.totalPages,
  };
}
