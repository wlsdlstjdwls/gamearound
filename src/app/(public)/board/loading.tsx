// 게시판 홈 뼈대 — 머리와 글쓰기 단추, 게시판 고르기 카드 셋(리뷰, 공략, 홍보), 왼쪽 급상승 + 댓글 기다리는 글, 오른쪽 새 홍보 패널(360).
import { CommunityHomeSkeleton } from "@/components/community/home-skeleton";
import { BOARD_CATEGORIES } from "@/lib/community/constants";

export default function Loading() {
  return <CommunityHomeSkeleton boards={BOARD_CATEGORIES.length} side="lg:grid-cols-[minmax(0,1fr)_360px]" actions={1} />;
}
