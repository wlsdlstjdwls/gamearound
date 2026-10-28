// 예전 글 주소 뼈대 — 글을 제 게시판 주소로 옮겨 보내는 동안에도 곧 열릴 글 상세(post-detail)와 같은 모양을 세운다.
import { PostDetailSkeleton } from "@/components/community/skeleton";

export default function Loading() {
  return <PostDetailSkeleton />;
}
