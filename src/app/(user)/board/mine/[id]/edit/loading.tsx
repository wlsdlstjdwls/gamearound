// 글 고치기 뼈대 — 글쓰기와 같은 폼이라 같은 뼈대를 쓴다
import { PostFormSkeleton } from "@/components/community/skeleton";

export default function Loading() {
  return <PostFormSkeleton categories={3} review={true} />;
}
