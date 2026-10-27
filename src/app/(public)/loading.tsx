// 홈 스켈레톤 — 홈의 마디 순서를 그대로 세운다: 히어로 판, 오늘의 할인 넷, 출시 예정 넷, 인디 소개 줄.
// 2026-10-27 홈에서 인기 순위, 곧 할인 마감, 뉴스, 스토어 차이 줄을 걷으며(page.tsx) 뼈대도 같이 걷었다 —
// 남겨 두면 불러오는 동안만 없는 마디가 서서, 본문이 오는 순간 화면이 반 넘게 줄어든다.
//
// 왜 루트(app/loading)가 아니라 여기인가(2026-10-08): 루트에 홈 모양을 두었더니 제 뼈대가 없는 화면이
// 전부 홈 카드 격자를 빌려 썼다(사용자: "다 똑같아"). 이제 화면마다 제 loading.tsx 가 있고,
// 루트는 인증 화면처럼 뼈대가 따로 없는 곳의 무난한 폴백만 맡는다.
import { GameCardSkeleton } from "@/components/game-card-skeleton";
import { Bone, SectionHeadSkeleton, SkeletonPage } from "@/components/ui/skeleton";
import { HOME_FOUR_GRID_CLASS, HOME_FOUR_ITEM_CLASS } from "@/lib/games/grid";

/** 할인, 출시 예정 마디의 칸 수 — 실물(page.tsx)이 넷씩이다 */
const FOUR = 4;

export default function HomeLoading() {
  return (
    <SkeletonPage pad="home" gap={48}>
      {/* 히어로 판(home/hero) — 높이를 맞춰야 본문이 와도 아래 마디가 밀리지 않는다 */}
      <div className="flex flex-col items-center gap-4 rounded-[var(--radius-panel)] bg-surface px-5 py-10 shadow-2 sm:px-8 sm:py-14">
        <Bone className="h-9 w-3/4 max-w-[480px]" />
        <Bone className="h-4 w-1/2 max-w-[320px]" />
        <Bone className="mt-2 h-12 w-full max-w-[560px] rounded-full" />
      </div>

      {[0, 1].map((section) => (
        <section key={section} className="flex flex-col gap-4">
          <SectionHeadSkeleton width={section === 0 ? "w-32" : "w-28"} action />
          <div className={HOME_FOUR_GRID_CLASS}>
            {Array.from({ length: FOUR }).map((_, i) => (
              <div key={i} className={HOME_FOUR_ITEM_CLASS}>
                <GameCardSkeleton />
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="flex flex-col gap-3">
        <SectionHeadSkeleton width="w-52" action />
        {/* 칸 폭은 ui/rail 의 li 와 같다 — 좁은 화면 80%(다음 칸이 비친다), sm 셋, lg 넷 */}
        <div className="-mx-4 flex gap-4 overflow-hidden px-4 pb-2 pt-1 sm:mx-0 sm:px-0">
          {Array.from({ length: FOUR }).map((_, i) => (
            <div key={i} className="w-[80%] shrink-0 sm:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/4)]">
              <GameCardSkeleton />
            </div>
          ))}
        </div>
      </section>
    </SkeletonPage>
  );
}
