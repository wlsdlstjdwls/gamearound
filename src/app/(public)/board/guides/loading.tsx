// 공략 게시판 목록 뼈대 — 게시판 목록 공통 틀(post-board)과 같은 모양: 머리와 글쓰기 단추, 왼쪽 보조 메뉴(전체 글 + 카테고리), 오른쪽 흰 판(판 이름, 검색, 탭, 글 줄).
import { PostBoardSkeleton } from "@/components/community/skeleton";
import { BOARD_CATEGORIES } from "@/lib/community/constants";

export default function Loading() {
  return <PostBoardSkeleton menu={BOARD_CATEGORIES.length + 1} />;
}
