// 입력 폼 뼈대 낱개 — 글쓰기, 인디 게임 등록, 입점 신청처럼 폼이 주인공인 화면의 loading.tsx 가 같이 쓴다.
// 높이는 실물 부품을 잰 값이다: 이름표 12.5px 글자 줄(18) + 틈 6 + 칸(ui/text-field 의 46, compact 44).
// 세그먼트(한 덩어리 고르기)는 회색 바탕 p-1 안의 칸 줄이라 칩 줄(ChipsSkeleton)과 모양이 다르다 — 그래서 따로 둔다.
import { Bone } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

/** 이름표 한 줄 + 입력 칸. compact 는 ui/text-field 의 compact(h-11) */
export function FieldSkeleton({ label = "w-16", compact = false, className }: { label?: string; compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <Bone className={cn("h-[18px]", label)} />
      <Bone className={cn("w-full rounded-xl", compact ? "h-11" : "h-[46px]")} />
    </div>
  );
}

/** 여러 줄 입력 칸(textarea). height 는 rows 에 맞춰 부르는 쪽이 넘긴다 */
export function TextareaSkeleton({ label = "w-16", height, className }: { label?: string | null; height: string; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      {label && <Bone className={cn("h-[18px]", label)} />}
      <Bone className={cn("w-full rounded-xl", height)} />
    </div>
  );
}

/** 세그먼트 고르기(이름표 + 회색 바탕 안 칸 count 개). 칸 폭은 낱말 길이처럼 조금씩 다르게 */
const SEGMENT_WIDTHS = ["w-[72px]", "w-16", "w-20", "w-[68px]"];

export function SegmentedSkeleton({ count, label = "w-14", className }: { count: number; label?: string; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <Bone className={cn("mb-1.5 h-[18px]", label)} />
      <div className="flex w-full gap-1 rounded-xl bg-surface-2 p-1 sm:w-fit">
        {Array.from({ length: count }).map((_, i) => (
          <Bone key={i} className={cn("h-10 flex-1 rounded-[9px] sm:flex-none", SEGMENT_WIDTHS[i % SEGMENT_WIDTHS.length])} />
        ))}
      </div>
    </div>
  );
}
