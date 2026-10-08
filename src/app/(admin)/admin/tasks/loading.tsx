// 할 일 판 뼈대 — 머리(제목 + 건수), 버튼 줄(왼쪽 더하기, 오른쪽 지난 일), 거르기 줄, 그리고 칸 셋의 판.
//
// 판 모양은 task-board 를 따른다: 넓은 화면은 회색 골 셋(sm 둘, lg 셋)에 칸 머리와 흰 카드들,
// 좁은 화면은 위에 칸 이름 탭 한 줄이 서고 칸은 한 번에 하나만 보인다(골 없이 카드만).
// 카드 높이는 실물의 본문 112px(CARD_BODY_HEIGHT) + 아래 담당자 줄 약 30px 이다 — 판은 카드 수로 높이가 정해지니
// 이 높이가 어긋나면 본문이 올 때 판 전체가 늘었다 줄어든다.
import { Bone, PageHeadSkeleton, SkeletonBody } from "@/components/ui/skeleton";
import { raisedClass } from "@/components/ui/page";
import { cn } from "@/lib/cn";

const COLUMNS = 3; // lib/admin/tasks 의 BOARD_STATUSES(할 일, 하는 중, 끝)
const CARDS_PER_COLUMN = [3, 2, 2];

function CardBone() {
  return (
    <div className={raisedClass("flex flex-col overflow-hidden")}>
      <div className="flex h-[112px] flex-col gap-2 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Bone className="h-[18px] flex-1" />
          <Bone className="h-[22px] w-10 rounded-[6px]" />
        </div>
        <Bone className="h-3 w-full" />
        <Bone className="h-3 w-4/5" />
        <Bone className="mt-auto h-4 w-24 rounded-[6px]" />
      </div>
      <div className="flex items-center gap-1 px-2.5 pb-2">
        <Bone className="size-6 rounded-full" />
        <Bone className="ml-auto h-3 w-12" />
      </div>
    </div>
  );
}

export default function TasksLoading() {
  return (
    <SkeletonBody>
      <div className="flex flex-col gap-3">
        <PageHeadSkeleton width="w-28" />
        <div className="flex items-center justify-between gap-2">
          <Bone className="h-10 w-[104px] rounded-[9px]" />
          <Bone className="h-8 w-20 rounded-[9px]" />
        </div>
      </div>

      <div className="flex flex-col gap-3" aria-hidden>
        {/* 거르기 줄 — 넓은 화면은 보기 전환 판 + 분류 고르기 + 급한 일, 좁은 화면은 고르기 둘 */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-x-3">
          <Bone className="hidden h-[38px] w-48 rounded-xl sm:block" />
          <Bone className="h-9 w-[108px] rounded-[var(--radius-sm)] sm:hidden" />
          <Bone className="h-9 w-[108px] rounded-[var(--radius-sm)] sm:w-[150px]" />
          <Bone className="h-9 w-20 rounded-xl" />
        </div>

        {/* 좁은 화면의 칸 이름 탭 */}
        <Bone className="h-11 w-full rounded-xl sm:hidden" />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: COLUMNS }).map((_, c) => (
            <div
              key={c}
              className={cn(
                "flex min-w-0 flex-col gap-2 rounded-xl bg-surface-2 sm:min-h-[140px] sm:p-2",
                "max-sm:bg-transparent",
                // 좁은 화면은 첫 칸만 보인다 — 실물도 칸을 옆으로 넘겨 한 번에 하나만 보여 준다
                c > 0 && "max-sm:hidden",
              )}
            >
              <div className="hidden items-center justify-between px-1 py-0.5 sm:flex">
                <Bone className="h-4 w-16" />
                <Bone className="h-4 w-6 rounded-full" />
              </div>
              {Array.from({ length: CARDS_PER_COLUMN[c] }).map((_, i) => (
                <CardBone key={i} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </SkeletonBody>
  );
}
