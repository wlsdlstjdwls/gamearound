// 게시판 글쓰기 뼈대 — 글쓰기 폼(post-form)이 처음 열리는 모양: 카테고리 셋(리뷰 기본)이라 스포 고르기와 관련 게임 칸이 같이 서고,
// 아래 판에 제목, 본문 에디터, 첨부, 맨 아래 등록 띠.
import { PostFormSkeleton } from "@/components/community/skeleton";
import { BOARD_CATEGORIES } from "@/lib/community/constants";

export default function Loading() {
  return <PostFormSkeleton categories={BOARD_CATEGORIES.length} review />;
}
