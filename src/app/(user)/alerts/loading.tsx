// 알림 화면 뼈대 — 제목 + 오른쪽 "알림 설정" 단추, 숫자 판 셋(3열), 알림 목록(흰 판 줄), 맨 아래 규칙 문단.
// 알림 줄은 96x54 커버 + 제목 + 조건 한 줄 + 오른쪽 보낸 날과 단추라 카드 격자와 모양이 전혀 다르다.
// 푸시 꺼짐 띠와 알림 만들기 폼은 조건부라 그리지 않는다 — 없을 때 빈 띠가 남는 쪽이 더 크게 튄다.
import { raisedClass } from "@/components/ui/page";
import { Bone, PageHeadSkeleton, SectionHeadSkeleton, SkeletonPage, TextLinesSkeleton } from "@/components/ui/skeleton";

const STATS = 3; // 걸어 둔 것, 지금 맞은 것, 최근 보낸 것
const SKELETON_ROWS = 4;

export default function AlertsLoading() {
  return (
    <SkeletonPage gap={26}>
      <PageHeadSkeleton width="w-24" action="w-28 rounded-full" />

      <div className="grid grid-cols-3 gap-2.5">
        {Array.from({ length: STATS }).map((_, i) => (
          <div key={i} className={raisedClass("flex flex-col gap-2 rounded-[var(--radius-md)] px-4 py-3.5")}>
            <Bone className="h-3.5 w-16" />
            <Bone className="h-6 w-10" />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3.5">
        <SectionHeadSkeleton width="w-32" />
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <div key={i} className={raisedClass("flex items-center gap-4 rounded-[var(--radius-md)] p-3.5")}>
              <Bone className="h-[54px] w-[96px] shrink-0 rounded-[var(--radius-inset)]" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Bone className="h-5 w-1/2" />
                <Bone className="h-3.5 w-2/3" />
              </div>
              <div className="hidden flex-col items-end gap-1.5 sm:flex">
                <Bone className="h-3 w-20" />
                <Bone className="h-8 w-24 rounded-[9px]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <TextLinesSkeleton lines={2} className="max-w-[700px]" />
    </SkeletonPage>
  );
}
