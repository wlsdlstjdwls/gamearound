// 라운지 홈 뼈대(2026-11-18 시안 C) — 실물(app/(public)/lounge/page)과 같은 순서로 선다:
// 머리(설명, 단추) | 왼쪽: 급상승 넷, 내 개발 현황 | 오른쪽 인디 게임 최근 소식(380) | 각주.
// 2026-11-20 실물 순서에 다시 맞췄다 — 11-18 에 걷은 통계 띠, 플레이테스트, 인원 모집/개발 팁 자리가 뼈대에 남아 있어 실물이 올 때 화면이 통째로 바뀌었다.
// 통계 띠는 로그인 여부를 뼈대가 모른다 — 라운지에 오는 사람 대부분이 로그인한 개발자라 그 모양으로 그린다.
// 게시판 홈 뼈대(community/home-skeleton)와 갈라 둔 이유: 라운지 홈만 위 블록 셋이 있고 게시판 고르기 카드가 없다.
import { cn } from "@/lib/cn";
import { Bone, SkeletonPage } from "@/components/ui/skeleton";

/** 실물의 줄 수와 같다: 급상승(RISING_LIMIT) */
const RISING_ROWS = 4;
/** 오른쪽 "인디 게임 최근 소식" 줄 수(lounge/page 의 RECENT_INDIE_LIMIT) */
const SIDE_ROWS = 4;

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
      {/* 머리는 실물(lounge/page 의 PageHead menuScreen leadRow)과 같다: 좁은 폭은 설명 한 줄 + "글 작성"(36px) 한 줄, 넓은 폭은 제목 + 단추 둘 + 설명 */}
      <div className="flex flex-col gap-2.5 max-sm:flex-row max-sm:items-start max-sm:gap-3">
        <div className="flex items-center justify-between gap-4 max-sm:contents">
          <Bone className="h-[30px] w-36 max-sm:hidden sm:h-[37px]" />
          <div className="flex gap-2 max-sm:order-last max-sm:shrink-0">
            <Bone className="hidden h-8 w-24 rounded-xl sm:block" />
            <Bone className="h-9 w-[87px] rounded-xl sm:h-10 sm:w-24" />
          </div>
        </div>
        {/* 설명은 390px 에서 두 줄로 꺾인다(실측 머리 51 = 7 + 22 x 2). 넓은 화면은 한 줄 24px */}
        <div className="flex min-w-0 flex-col max-sm:flex-1 max-sm:pt-[7px]">
          <span className="flex h-[22px] items-center sm:h-6">
            <Bone className="h-4 w-full max-w-full sm:w-[420px]" />
          </span>
          <span className="flex h-[22px] items-center sm:hidden">
            <Bone className="h-4 w-3/5" />
          </span>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-7">
          {/* 급상승 넷(news-blocks 의 RisingBlock). 좁은 폭은 순위 | 제목(첫 줄 말고는 두 줄로 잡는다, 실측 101 / 124) | 회색 두 줄,
              넓은 폭은 순위 | 그림 | 딱지, 제목, 작성자 | 반응 기둥(실측 95) */}
          <div className="flex flex-col gap-2.5">
            <Head title="w-24" />
            <div className={cn(BOX, "divide-y divide-line-soft")}>
              {Array.from({ length: RISING_ROWS }).map((_, i) => (
                <div key={i} className="grid grid-cols-[24px_minmax(0,1fr)] items-start gap-x-3 px-4 py-4 sm:grid-cols-[40px_88px_minmax(0,1fr)_auto] sm:items-center sm:gap-x-3.5 sm:px-5 sm:py-3.5">
                  <Bone className="h-6 w-5 justify-self-center" />
                  <Bone className="hidden aspect-[460/215] w-[88px] rounded-[var(--radius-xs)] sm:block" />
                  <div className="flex min-w-0 flex-col gap-1">
                    <Bone className={cn("h-[22px] max-sm:mb-0.5", TITLE_WIDTHS[i % TITLE_WIDTHS.length])} />
                    {i > 0 && <Bone className="h-[22px] w-2/5 sm:hidden" />}
                    <Bone className="h-[18px] w-36 sm:-order-1" />
                    <Bone className="h-[19px] w-24" />
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
          {/* 내 개발 현황(lounge/home-blocks 의 DevStatusCard) — 로그인한 사람에게만 선다. 라운지에 오는 사람 대부분이 로그인한 개발자라 그 모양으로 그린다 */}
          <div className="flex flex-col gap-2.5">
            <Head title="w-28" />
            <EmptyBox />
          </div>
        </div>

        {/* 인디 게임 최근 소식(SidePanel): 줄 넷(실측 86) + 이용 가이드 */}
        <div className="flex flex-col gap-2.5">
          <Head title="w-32" />
          <div className={cn(BOX, "flex flex-col gap-2.5 p-3.5")}>
            {Array.from({ length: SIDE_ROWS }).map((_, i) => (
              <div key={i} className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--radius-inset)] bg-surface-4 p-3 sm:grid-cols-[52px_minmax(0,1fr)_auto]">
                <Bone className="size-12 rounded-[10px] sm:size-[52px]" />
                <div className="flex min-w-0 flex-col gap-1">
                  <Bone className="h-5 w-28" />
                  <Bone className="h-3.5 w-24" />
                  <Bone className="h-3.5 w-20" />
                </div>
                <Bone className="h-8 w-[84px] rounded-full" />
              </div>
            ))}
            <div className="mt-1 flex flex-col gap-2 border-t border-line-soft px-1.5 pb-1 pt-4">
              <Bone className="h-5 w-28" />
              <Bone className="h-3.5 w-full" />
              <Bone className="h-3.5 w-full" />
              <Bone className="h-3.5 w-4/5" />
              <Bone className="h-3.5 w-3/5" />
              <Bone className="h-4 w-24" />
            </div>
          </div>
        </div>
      </div>
      <Bone className="h-3.5 w-72 max-w-full" />
    </SkeletonPage>
  );
}
