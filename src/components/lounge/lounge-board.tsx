// 라운지 게시판 목록 한 벌(S-17 전체 글, S-20 개발일지, S-21 질문 피드백). 틀은 components/community/post-board 그대로 쓰고,
// 보조 메뉴는 글 갈래만 세운다: 전체 글, 개발일지, 질문 피드백, 맨 아래 "게시판 이용 안내".
//
// 목업 bside 의 "내가 만든 게임", "등록현황" 칸은 뺐다(2026-10-28 메뉴 정리, 사용자: "왼쪽 메뉴바에서는 내 게임 관리 메뉴는 빼 줘").
// 공개 인디 목록은 인디 게임 메뉴가, 내 게임 관리는 라운지 띠와 라운지 홈 머리 단추가 맡는다 — 글 목록 옆 메뉴는 글을 고르는 자리다.
import { PostBoard } from "@/components/community/post-board";
import { BoardGuide } from "@/components/lounge/board-guide";
import { LOUNGE_CATEGORIES } from "@/lib/community/constants";
import type { BoardQuery } from "@/lib/community/query";
import { BOARD_GUIDE_MESSAGES as G } from "@/lib/lounge/messages";
import { ROUTES } from "@/lib/routes";
import type { PostCategory } from "@/server/db/schema";

export function LoungeBoard({ title, categories, base, query }: { title: string; categories: readonly PostCategory[]; base: string; query: BoardQuery }) {
  return (
    <PostBoard
      title={title}
      categories={categories}
      family={LOUNGE_CATEGORIES}
      allPath={ROUTES.loungeAll}
      base={base}
      query={query}
      sideFoot={<BoardGuide label={G.open} variant="menu" />}
    />
  );
}
