// 홈 스켈레톤 — 홈의 마디 순서를 그대로 세운다: 할인 격자, 옆으로 넘기는 줄, 인기 순위(두 기둥 번호 목록),
// 곧 끝나는 할인과 뉴스 두 기둥.
//
// 왜 루트(app/loading)가 아니라 여기인가(2026-10-08): 루트에 홈 모양을 두었더니 제 뼈대가 없는 화면이
// 전부 홈 카드 격자를 빌려 썼다(사용자: "다 똑같아"). 이제 화면마다 제 loading.tsx 가 있고,
// 루트는 인증 화면처럼 뼈대가 따로 없는 곳의 무난한 폴백만 맡는다.
//
// 첫 마디 제목이 PageHead 가 아니라 SectionHead 인 이유: 홈은 머리 문구를 걷어 할인 마디 제목이 곧 h1 이다(page.tsx).
// 예전 뼈대는 큰 제목 + 설명 두 줄을 그려 본문이 올 때 격자가 한 번 위로 올라갔다.
import { GameCardSkeleton, GameGridSkeleton } from "@/components/game-card-skeleton";
import { Bone, SectionHeadSkeleton, SkeletonPage } from "@/components/ui/skeleton";
import { HOME_GRID_CLASS } from "@/lib/games/grid";
import { cn } from "@/lib/cn";

/** 넓은 화면 4열 두 줄 — 첫 화면에 보이는 만큼만. 좁은 화면은 실물처럼 여덟 장에서 끊는다(page.tsx 의 nth-child(n+9)) */
const DEAL_CARDS = 8;
/** 줄 한 마디의 칸 — 넓은 화면에서 한 번에 보이는 넷(ui/rail 의 칸 폭) */
const RAIL_CARDS = 4;
/** 인기 순위 열 줄(두 기둥 x 다섯) */
const RANK_ROWS = 10;
const LIST_ROWS = 5;

export default function HomeLoading() {
  return (
    <SkeletonPage pad="home" gap={56}>
      <section className="flex flex-col gap-[22px]">
        <SectionHeadSkeleton width="w-44" action />
        <GameGridSkeleton cards={DEAL_CARDS} gridClass={HOME_GRID_CLASS} />
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeadSkeleton width="w-56" action />
        {/* 칸 폭은 ui/rail 의 li 와 같다 — 좁은 화면 80%(다음 칸이 비친다), sm 셋, lg 넷 */}
        <div className="-mx-4 flex gap-4 overflow-hidden px-4 pb-2 pt-1 sm:mx-0 sm:px-0">
          {Array.from({ length: RAIL_CARDS }).map((_, i) => (
            <div key={i} className="w-[80%] shrink-0 sm:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/4)]">
              <GameCardSkeleton />
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeadSkeleton width="w-32" action />
        {/* home/ranking 과 같은 격자 — 좁은 화면 한 기둥, sm 부터 다섯 줄씩 두 기둥 */}
        <div className="grid grid-cols-1 gap-x-10 sm:grid-flow-col sm:grid-cols-2 sm:grid-rows-5">
          {Array.from({ length: RANK_ROWS }).map((_, i) => (
            <div key={i} className={cn("flex items-center gap-3.5 py-3", i >= LIST_ROWS && "max-sm:hidden")}>
              <Bone className="h-6 w-7 shrink-0" />
              <Bone className="aspect-[460/215] w-[92px] shrink-0 rounded-[var(--radius-inset)]" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Bone className="h-4 w-3/4" />
                <Bone className="h-3.5 w-2/5" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 곧 끝나는 할인 / 최신 뉴스 — 실물과 같은 auto-fit 두 기둥 */}
      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(360px,100%),1fr))] items-start gap-x-12 gap-y-10">
        {[0, 1].map((col) => (
          <div key={col} className="flex flex-col gap-3.5">
            <SectionHeadSkeleton width="w-40" action={col === 1} />
            <div className="rows">
              {Array.from({ length: LIST_ROWS }).map((_, i) => (
                <div key={i} className="flex items-center gap-3.5 py-[13px]">
                  <Bone className={cn("shrink-0", col === 0 ? "aspect-[460/215] w-16 rounded-[var(--radius-inset)]" : "h-12 w-[72px] rounded-[7px]")} />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <Bone className="h-4 w-4/5" />
                    <Bone className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </SkeletonPage>
  );
}
