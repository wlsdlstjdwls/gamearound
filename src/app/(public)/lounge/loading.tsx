// 라운지 홈 뼈대 — 머리와 단추 둘(내 게임 관리, 글 작성), 현황 띠 세 칸, 게시판 고르기 카드 둘(개발일지, 질문/피드백),
// 왼쪽 급상승 + 답변 기다리는 질문, 오른쪽 내 게임 패널(380).
import { CommunityHomeSkeleton } from "@/components/community/home-skeleton";
import { LOUNGE_CATEGORIES } from "@/lib/community/constants";

export default function Loading() {
  return <CommunityHomeSkeleton boards={LOUNGE_CATEGORIES.length} stats side="lg:grid-cols-[minmax(0,1fr)_380px]" actions={2} />;
}
