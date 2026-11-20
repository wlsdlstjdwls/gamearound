// 라운지 홈 뼈대(2026-11-18 시안 C) — 실물(app/(public)/lounge/page)과 같은 순서로 선다:
// 머리(제목, 설명, 단추 둘) | 왼쪽: 내 게임 통계 넷, 플레이테스트 모집, 인원 모집과 개발 팁 나란히, 급상승 넷 | 오른쪽 내 게임 패널(380) | 각주.
// 통계 띠는 로그인 여부를 뼈대가 모른다 — 라운지에 오는 사람 대부분이 로그인한 개발자라 그 모양으로 그린다.
// 게시판 홈 뼈대(community/home-skeleton)와 갈라 둔 이유: 라운지 홈만 위 블록 셋이 있고 게시판 고르기 카드가 없다.
import { cn } from "@/lib/cn";
import { Bone, SkeletonPage } from "@/components/ui/skeleton";

/** 실물의 줄 수와 같다: 통계 칸(조회, 플레이하기 클릭, 새 찜, 댓글), 급상승(RISING_LIMIT), 새 글 줄(LATEST_ROWS 이지만 비어 선 자리가 많아 한 줄) */
const STAT_CELLS = 4;
const RISING_ROWS = 4;

const BOX = "overflow-hidden rounded-[var(--radius-md)] bg-surface shadow-hair";
const TITLE_WIDTHS = ["w-3/5", "w-1/2", "w-2/3", "w-2/5"];

function Head({ title, link = true }: { title: string; link?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <Bone className={cn("h-[22px]", title)} />
      <Bone className="hidden h-4 w-40 sm:block" />
      {link && <Bone className="ml-auto h-4 w-14" />}
    </div>
  );
}

function EmptyBox() {
  return (
    <div className={cn(BOX, "flex flex-col gap-1.5 px-5 py-5")}>
      <Bone className="h-5 w-48 max-w-full" />
      <Bone className="h-3.5 w-36" />
    </div>
  );
}

export function LoungeHomeSkeleton() {
  return (
    <SkeletonPage gap={24}>
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-4">
          <Bone className="h-[30px] w-36 sm:h-[37px]" />
          {/* 좁은 화면은 "글 작성" 하나만 선다(lounge/page 머리). 손가락 기기에서 단추는 44px 이다(390px 실측) */}
          <div className="flex gap-2">
            <Bone className="hidden h-10 w-24 rounded-xl sm:block" />
            <Bone className="h-11 w-[92px] rounded-xl sm:h-10 sm:w-24" />
          </div>
        </div>
        <Bone className="h-4 w-[420px] max-w-full" />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-7">
          <div className="flex flex-col gap-2.5">
            <Head title="w-28" />
            <div className={cn(BOX, "grid grid-cols-2 sm:grid-cols-4")}>
              {Array.from({ length: STAT_CELLS }).map((_, i) => (
                <div key={i} className="flex flex-col gap-1.5 px-5 py-4">
                  <Bone className="h-3.5 w-16" />
                  <Bone className="h-7 w-10" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            <Head title="w-32" />
            <EmptyBox />
          </div>
          <div className="grid gap-7 sm:grid-cols-2 sm:gap-4">
            {[0, 1].map((i) => (
              <div key={i} className="flex flex-col gap-2.5">
                <Head title="w-20" />
                <EmptyBox />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2.5">
            <Head title="w-24" />
            <div className={cn(BOX, "divide-y divide-line-soft")}>
              {Array.from({ length: RISING_ROWS }).map((_, i) => (
                <div key={i} className="flex items-center gap-3.5 px-4 py-3.5 sm:px-5">
                  <Bone className="h-6 w-5 shrink-0" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <Bone className="h-3.5 w-36" />
                    <Bone className={cn("h-[22px]", TITLE_WIDTHS[i % TITLE_WIDTHS.length])} />
                    <Bone className="h-4 w-24" />
                  </div>
                  <div className="hidden flex-col items-end gap-1 sm:flex">
                    <Bone className="h-4 w-10" />
                    <Bone className="h-4 w-14" />
                    <Bone className="h-4 w-14" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <Head title="w-32" link={false} />
          <div className={cn(BOX, "flex flex-col gap-2.5 p-3.5")}>
            <div className="flex flex-col gap-2 px-1.5 py-2">
              <Bone className="h-5 w-40" />
              <Bone className="h-3.5 w-32" />
              <Bone className="h-9 w-24 rounded-xl" />
            </div>
            <div className="mt-1 flex flex-col gap-2 border-t border-line-soft px-1.5 pb-1 pt-4">
              <Bone className="h-5 w-28" />
              <Bone className="h-3.5 w-full" />
              <Bone className="h-3.5 w-4/5" />
              <Bone className="h-4 w-24" />
            </div>
          </div>
        </div>
      </div>
      <Bone className="h-3.5 w-72 max-w-full" />
    </SkeletonPage>
  );
}
