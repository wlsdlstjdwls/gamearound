// 인디 목록 뼈대 — 제목과 설명, 명예의 전당 안내 판, 검색칸 줄, 인디 카드 격자(1, 2, 3, 4열, 목업처럼 넓은 화면 한 줄 넷).
// 높이는 2026-11-20 실측(390px: 설명 21, 안내 판 106 / 1440px: 머리 63, 안내 판 67, 검색칸 40, 틈 20). 단계 칩은 화면에서 걷혀(2026-11-16) 뼈대에서도 뺐다
// 카드 한 장의 뼈대는 슈퍼루키, 플레이테스트와 같이 쓴다(components/indie/indie-card-skeleton).
import { HOME_GRID_CLASS } from "@/lib/games/grid";
import { IndieCardSkeleton } from "@/components/indie/indie-card-skeleton";
import { Bone, SkeletonPage } from "@/components/ui/skeleton";

const SKELETON_CARDS = 8; // 4열 두 줄 — 첫 화면만 채우면 된다

export default function IndieLoading() {
  return (
    <SkeletonPage gap={20}>
      {/* 좁은 화면은 제목도 설명도 숨긴다(indie/page) — 머리 자리를 통째로 걷는다 */}
      <div className="flex flex-col gap-2.5 max-sm:hidden">
        <Bone className="h-8 w-48" />
        <div className="flex h-[21px] items-center">
          <Bone className="h-4 w-72 max-w-full" />
        </div>
      </div>
      <Bone className="h-[106px] rounded-[var(--radius-md)] sm:h-[67px]" />
      {/* 검색칸 줄 — 좁은 화면(650 이하)은 화면처럼 걷는다(머리띠 칸이 인디를 찾는다, components/search-box) */}
      <div className="flex justify-end max-tab:hidden">
        <Bone className="h-10 w-full rounded-xl md:w-[322px]" />
      </div>
      <div className={HOME_GRID_CLASS}>
        {Array.from({ length: SKELETON_CARDS }).map((_, i) => (
          <IndieCardSkeleton key={i} />
        ))}
      </div>
    </SkeletonPage>
  );
}
