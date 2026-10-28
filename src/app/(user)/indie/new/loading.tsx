// 내 게임 등록 뼈대 — 제목과 설명, 승인 안내 한 줄, 왼쪽 폼 판(번호 단계: 1 기본 정보 칸들과 단계 고르기 네 칸, 2 분류 칩 줄),
// 오른쪽 "내가 올린 게임" 판(340, 위쪽 브랜드색 띠, 개수, 줄마다 작은 커버 + 이름과 상태, 알약 줄).
// 폼은 길어서 첫 화면에 보이는 앞 두 단계만 그린다 — 아래 단계는 불러오는 동안 화면 밖이다.
import { FieldSkeleton } from "@/components/ui/form-skeleton";
import { Bone, ChipsSkeleton, PageHeadSkeleton, SkeletonPage } from "@/components/ui/skeleton";
import { INDIE_STAGES } from "@/lib/indie/constants";

const ASIDE_ROWS = 2; // 한 사람이 올리는 게임은 몇 개 안 된다(INDIE_POSTS_PER_USER_MAX)

/** 단계 머리(indie/form-step) — 번호 동그라미, 제목, 한 줄 도움말 */
function StepHead({ title }: { title: string }) {
  return (
    <div className="flex items-start gap-3">
      <Bone className="size-7 shrink-0 rounded-full" />
      <div className="flex flex-col gap-1.5 pt-0.5">
        <Bone className={`h-[22px] ${title}`} />
        <Bone className="h-3.5 w-52" />
      </div>
    </div>
  );
}

export default function IndieNewLoading() {
  return (
    <SkeletonPage gap={20}>
      <PageHeadSkeleton width="w-40" desc={1} />
      <Bone className="h-4 w-[460px] max-w-full" />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5 rounded-[var(--radius-panel)] bg-surface p-4 shadow-hair sm:p-6">
          <div className="flex flex-col gap-3.5">
            <StepHead title="w-24" />
            <div className="flex flex-col gap-4 sm:pl-10">
              <div className="grid gap-5 sm:grid-cols-2">
                <FieldSkeleton label="w-14" />
                <FieldSkeleton label="w-20" />
              </div>
              <FieldSkeleton label="w-20" />
              <div className="flex flex-col gap-1.5">
                <Bone className="mb-1.5 h-[18px] w-16" />
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                  {INDIE_STAGES.map((s) => (
                    <Bone key={s} className="h-[62px] rounded-[var(--radius-sm)]" />
                  ))}
                </div>
              </div>
              <FieldSkeleton label="w-24" className="sm:max-w-[50%]" />
            </div>
          </div>
          <div className="flex flex-col gap-3.5 border-t border-line-soft pt-5">
            <StepHead title="w-16" />
            <div className="flex flex-col gap-4 sm:pl-10">
              <div className="flex flex-col gap-1.5">
                <Bone className="h-[18px] w-14" />
                <ChipsSkeleton count={5} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Bone className="h-[18px] w-14" />
                <ChipsSkeleton count={6} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-[var(--radius-panel)] bg-surface p-4 [box-shadow:inset_0_3px_0_var(--acc),var(--ring-hair)]">
          <div className="flex items-center gap-2">
            <Bone className="h-6 w-28" />
            <Bone className="h-5 w-7 rounded-full" />
          </div>
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: ASIDE_ROWS }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2.5 rounded-[var(--radius-md)] bg-surface p-2.5 shadow-hair">
                <div className="flex items-start gap-3">
                  <Bone className="aspect-[16/9] w-[92px] shrink-0 rounded-[var(--radius-inset)]" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Bone className="h-5 w-24" />
                      <Bone className="h-5 w-12 rounded-[5px]" />
                    </div>
                    <Bone className="h-3.5 w-20" />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-1">
                    <Bone className="h-5 w-10 rounded-[var(--radius-xs)]" />
                    <Bone className="h-5 w-12 rounded-[var(--radius-xs)]" />
                  </div>
                  <Bone className="h-4 w-8" />
                </div>
              </div>
            ))}
          </div>
          <Bone className="h-3.5 w-full" />
          <Bone className="h-3.5 w-3/5" />
        </div>
      </div>
    </SkeletonPage>
  );
}
