// 입점 안내 뼈대 — 어두운 머리 판(ink-hero: 이름표, 큰 제목, 설명, 단추 둘), 혜택 카드 셋(3열), 절차 판(번호 줄).
// 머리 판은 어두운 면이라 회색 막대 대신 판 자체를 어둡게 세운다 — 회색 판이 왔다 검은 판으로 바뀌면 한 번 번쩍인다.
import { sectionCardClass } from "@/components/ui/page";
import { Bone, SectionHeadSkeleton, SkeletonPage } from "@/components/ui/skeleton";
import { BUSINESS_MESSAGES } from "@/lib/shops/messages";

/** 혜택 카드, 절차 줄 수는 실물 문구 배열을 그대로 센다 */
const POINTS = BUSINESS_MESSAGES.points.length;
const STEPS = BUSINESS_MESSAGES.steps.length;

export default function BusinessLoading() {
  return (
    <SkeletonPage gap={22}>
      <div className="flex flex-col gap-5 rounded-[var(--radius-panel)] bg-ink px-5 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-2.5 opacity-20">
          <Bone className="h-3.5 w-20" />
          <Bone className="h-[32px] w-64 max-w-full sm:h-[41px]" />
          <Bone className="h-4 w-[420px] max-w-full" />
        </div>
        <div className="flex gap-2 opacity-20">
          <Bone className="h-11 w-32 rounded-full" />
          <Bone className="h-4 w-24 self-center" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: POINTS }).map((_, i) => (
          <div key={i} className={sectionCardClass("flex flex-col gap-2.5")}>
            <Bone className="size-8 rounded-full" />
            <Bone className="h-5 w-32" />
            <Bone className="h-4 w-full" />
            <Bone className="h-4 w-4/5" />
          </div>
        ))}
      </div>

      <div className={sectionCardClass("flex flex-col gap-4")}>
        <SectionHeadSkeleton width="w-28" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: STEPS }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <Bone className="size-5 shrink-0 rounded-full" />
              <Bone className={i % 2 === 0 ? "h-4 w-3/4" : "h-4 w-1/2"} />
            </div>
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
