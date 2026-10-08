// 인디 목록 뼈대 — 어두운 머리 판(IndieListHero), 단계 칩 다섯, 인디 카드 격자(1, 2, 3열).
// 게임 카드 뼈대를 쓰지 않는 이유: 인디 카드는 제목 한 줄 + 한 줄 소개 두 줄 + 단계 배지 줄이라
// 게임 카드(제목 두 줄 + 배지 + 값)와 줄 구성이 다르다. 커버와 껍데기는 같은 상수를 쓴다.
// 머리 판은 실물이 ink 면이라 회색 막대 대신 같은 둥글기의 큰 면 하나로 자리만 잡는다(높이는 넓은 화면 실측 약 300px).
import { CARD_SHELL, COVER_CLASS } from "@/components/game-card";
import { Bone, ChipsSkeleton, SkeletonPage } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { INDIE_STAGES } from "@/lib/indie/constants";

const SKELETON_CARDS = 6; // 3열 두 줄 — 첫 화면만 채우면 된다

export default function IndieLoading() {
  return (
    <SkeletonPage gap={22}>
      <Bone className="h-[420px] rounded-[var(--radius-panel)] md:h-[300px]" />
      <ChipsSkeleton count={INDIE_STAGES.length + 1} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: SKELETON_CARDS }).map((_, i) => (
          <div key={i} className={CARD_SHELL} aria-hidden>
            <div className={cn(COVER_CLASS, "skeleton")} />
            <div className="flex flex-col gap-1.5 px-1">
              <Bone className="h-[21px] w-3/5" />
              <Bone className="h-4 w-full" />
              <Bone className="h-4 w-4/5" />
              <div className="flex items-center gap-2 pt-1">
                <Bone className="h-5 w-14 rounded-full" />
                <Bone className="h-3.5 w-28" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
