// 회사 상세 스켈레톤 — 되돌아가기 링크, 큰 회사 이름과 정체 한 줄, 오른쪽 숫자 칸들, 설명 문단, 역할 칩이 붙은 마디 제목, 4열 카드 격자.
//
// 실물(companies/[slug]/page)은 상세 셸(pad="detail", gap 40)이고 머리에 큰 제목(hero)과 숫자가 한 줄에 선다.
// 루트 스켈레톤은 홈 셸이라 위 여백부터 달랐고, 머리 없이 카드부터 떠서 본문이 올 때 격자가 통째로 내려갔다.
import { GameGridSkeleton } from "@/components/game-card-skeleton";
import { Bone, PageHeadSkeleton, SkeletonPage, TextLinesSkeleton } from "@/components/ui/skeleton";
import { HOME_GRID_CLASS } from "@/lib/games/grid";

const STATS = 3; // 등록된 게임, 지금 할인 중, 공식 사이트
const ROLE_CHIPS = 3; // 전체, 개발, 배급
const SKELETON_CARDS = 8; // 4열 두 줄

export default function CompanyDetailLoading() {
  return (
    <SkeletonPage pad="detail" gap={40}>
      <div className="flex flex-col gap-4">
        <Bone className="h-[22px] w-24" />
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="flex min-w-0 flex-col gap-2">
            <PageHeadSkeleton size="hero" width="w-72" />
            <Bone className="h-4 w-56 max-w-full" />
          </div>
          <div className="grid grid-cols-2 gap-x-7 gap-y-5 sm:grid-cols-3">
            {Array.from({ length: STATS }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <Bone className="h-3 w-16" />
                <Bone className="h-7 w-14 sm:h-8" />
              </div>
            ))}
          </div>
        </div>
        <TextLinesSkeleton lines={2} className="max-w-[620px] border-t border-line pt-4" />
      </div>

      <section className="flex flex-col gap-[18px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Bone className="h-[26px] w-40 sm:h-[30px]" />
          {/* 역할 칩은 sm 크기(26px)라 ChipsSkeleton(기본 칩 높이)을 쓰지 않는다 */}
          <div className="flex gap-1.5">
            {Array.from({ length: ROLE_CHIPS }).map((_, i) => (
              <Bone key={i} className="h-[26px] w-12 rounded-full" />
            ))}
          </div>
        </div>
        <GameGridSkeleton cards={SKELETON_CARDS} gridClass={HOME_GRID_CLASS} />
      </section>
    </SkeletonPage>
  );
}
