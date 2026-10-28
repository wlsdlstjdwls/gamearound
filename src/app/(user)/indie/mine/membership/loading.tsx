// 메이커 멤버십 뼈대 — 좁은 폭, 제목 + 오른쪽 "결제 내역" 링크 + 설명, 흰 판 하나(이름과 요약 | 오른쪽 값, 지금 받는 것 띠, 혜택 점 줄, 카드 등록 단추).
// 가입 전 모양으로 그린다 — 이 화면에 오는 사람 대부분이 아직 가입하지 않았고, 이용 중 상태판도 높이가 비슷하다.
import { sectionCardClass } from "@/components/ui/page";
import { Bone, PageHeadSkeleton, SkeletonPage } from "@/components/ui/skeleton";

const BENEFIT_LINES = 4;

export default function MembershipLoading() {
  return (
    <SkeletonPage width="tight" gap={20}>
      <PageHeadSkeleton width="w-36" desc={1} action="w-20" />
      <div className={sectionCardClass("flex flex-col gap-4")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <Bone className="h-6 w-36" />
            <Bone className="h-4 w-64 max-w-full" />
          </div>
          <div className="flex flex-col gap-1 sm:items-end">
            <Bone className="h-8 w-28" />
            <Bone className="h-4 w-32" />
          </div>
        </div>
        <Bone className="h-9 w-full rounded-xl" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: BENEFIT_LINES }).map((_, i) => (
            <Bone key={i} className={i === BENEFIT_LINES - 1 ? "h-4 w-1/2" : "h-4 w-4/5"} />
          ))}
        </div>
        <Bone className="h-[46px] w-full rounded-xl" />
      </div>
    </SkeletonPage>
  );
}
