// 슈퍼루키 뼈대 — 제목과 설명, 인디 카드 격자(인디 목록과 같은 1~4열), 맨 아래 뽑는 기준 각주.
// 카드 제목 앞 "N일 전 등록" 딱지는 카드 한 줄 안이라 높이를 바꾸지 않는다.
import { IndieCardSkeleton } from "@/components/indie/indie-card-skeleton";
import { PageHeadSkeleton, SkeletonPage, Bone } from "@/components/ui/skeleton";
import { HOME_GRID_CLASS } from "@/lib/games/grid";

const SKELETON_CARDS = 8; // 4열 두 줄 — 실물은 최대 12장이지만 첫 화면만 채우면 된다

export default function RookiesLoading() {
  return (
    <SkeletonPage gap={22}>
      <PageHeadSkeleton width="w-32" desc={1} />
      <div className={HOME_GRID_CLASS}>
        {Array.from({ length: SKELETON_CARDS }).map((_, i) => (
          <IndieCardSkeleton key={i} />
        ))}
      </div>
      <Bone className="h-3.5 w-80 max-w-full" />
    </SkeletonPage>
  );
}
