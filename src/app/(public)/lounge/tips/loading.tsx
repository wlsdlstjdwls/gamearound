// 개발 팁 목록 뼈대 — 개발일지 목록 뼈대(lounge/devlogs/loading)와 같은 모양이다.
import { PostBoardSkeleton } from "@/components/community/skeleton";
import { LOUNGE_CATEGORIES } from "@/lib/community/constants";

export default function Loading() {
  return <PostBoardSkeleton menu={LOUNGE_CATEGORIES.length + 1} />;
}
