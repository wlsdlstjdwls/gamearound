// 홍보 게시판 목록 뼈대 — 게시판 목록 공통 틀(post-board)과 같은 모양: 머리와 글쓰기 단추, 왼쪽 보조 메뉴(전체 글 + 카테고리), 오른쪽 흰 판(판 이름, 검색, 탭, 글 줄).
// 홍보만 탭 줄 오른쪽에 유형 칩(전체 + PROMO_TYPES)이 같은 줄에 선다. 맨 위 유료 고정 줄은 걸린 글이 있을 때만이라 그리지 않는다.
import { PostBoardSkeleton } from "@/components/community/skeleton";
import { BOARD_CATEGORIES, PROMO_TYPES } from "@/lib/community/constants";

export default function Loading() {
  return <PostBoardSkeleton menu={BOARD_CATEGORIES.length + 1} promoTabs={PROMO_TYPES.length + 1} />;
}
