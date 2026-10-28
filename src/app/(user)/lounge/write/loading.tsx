// 라운지 글쓰기 뼈대 — 글쓰기 폼(post-form)이 개발일지로 열리는 모양: 위 판은 카테고리 둘뿐(추가 칸 없음), 아래 판에 제목, 본문 에디터, 첨부, 등록 띠.
import { PostFormSkeleton } from "@/components/community/skeleton";
import { LOUNGE_CATEGORIES } from "@/lib/community/constants";

export default function Loading() {
  return <PostFormSkeleton categories={LOUNGE_CATEGORIES.length} review={false} />;
}
