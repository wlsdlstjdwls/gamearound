// 라운지 게시판 목록 한 벌(S-17 전체 글, S-20 개발일지, S-21 질문 피드백). 틀은 components/community/post-board 그대로 쓰고,
// 보조 메뉴는 라운지 칸만 세운다: 전체 글, 개발일지, 질문 피드백, 내 게임 관리, 맨 아래 "게시판 이용 안내".
//
// 목업 bside 에 있던 "내가 만든 게임"(공개 인디 게임 전체) 칸은 뺐다(2026-10-28 메뉴 정리) — 그 목록은 인디 게임 메뉴의
// "전체 인디 게임" 이 맡고, 라운지에서 또 세우면 같은 곳으로 가는 길이 둘이 된다.
// "내 게임 관리" 수는 내 신청 수라 로그인했을 때만 적는다. 비로그인에게 0 을 적으면 "신청이 없다" 로 읽혀 틀린 말이 된다.
// 칸 이름은 메뉴 표(lib/nav)에서 가져온다 — 하위 메뉴 띠와 이 보조 메뉴의 낱말이 따로 놀지 않게.
import { PostBoard, type SideLink } from "@/components/community/post-board";
import { BoardGuide } from "@/components/lounge/board-guide";
import { LOUNGE_CATEGORIES } from "@/lib/community/constants";
import type { BoardQuery } from "@/lib/community/query";
import { nullIfDbUnavailable } from "@/lib/db-errors";
import { BOARD_GUIDE_MESSAGES as G } from "@/lib/lounge/messages";
import { NAV_SECTIONS } from "@/lib/nav";
import { ROUTES } from "@/lib/routes";
import type { PostCategory } from "@/server/db/schema";
import { countMyIndie } from "@/server/services/indie";
import { getCurrentUser } from "@/server/services/users";

function navLabel(href: string): string {
  return NAV_SECTIONS.find((s) => s.key === "lounge")?.subs.find((s) => s.href === href)?.label ?? "";
}

async function loadSide(): Promise<{ lead: SideLink[]; tail: SideLink[] }> {
  const user = await getCurrentUser().catch(() => null);
  const mine = user ? await nullIfDbUnavailable(countMyIndie(user.id)) : null;
  return {
    lead: [],
    tail: [{ href: ROUTES.indieMine, label: navLabel(ROUTES.indieMine), count: mine }],
  };
}

export function LoungeBoard({ title, categories, base, query }: { title: string; categories: readonly PostCategory[]; base: string; query: BoardQuery }) {
  return (
    <PostBoard
      title={title}
      categories={categories}
      family={LOUNGE_CATEGORIES}
      allPath={ROUTES.loungeAll}
      base={base}
      query={query}
      sideExtra={loadSide()}
      sideFoot={<BoardGuide label={G.open} variant="menu" />}
    />
  );
}
