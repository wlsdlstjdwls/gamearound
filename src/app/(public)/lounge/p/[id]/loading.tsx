// 라운지 글 상세 뼈대 — 글 상세 공통 틀(post-detail)에 맨 위 "목록으로" 링크를 더한 모양(라운지 글은 공용 경로 줄이 아직 없다).
import { PostDetailSkeleton } from "@/components/community/skeleton";

export default function Loading() {
  return <PostDetailSkeleton backLink />;
}
