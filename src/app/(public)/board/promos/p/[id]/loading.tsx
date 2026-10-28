// 게시판 글 상세 뼈대 — 글 상세 공통 틀(post-detail): 좁은 폭, 글 판(말머리, 제목, 작성자 줄, 본문, 좋아요 알약), 댓글 판, 이전/다음 글 줄.
import { PostDetailSkeleton } from "@/components/community/skeleton";

export default function Loading() {
  return <PostDetailSkeleton />;
}
