// 위시리스트 뼈대 — 제목과 "N개 중 M개 할인 중" 한 줄, 오른쪽 정렬 칩 둘, 그 아래 가로 줄 격자(최소 320px 칸).
// 줄 하나는 104x60 커버 + 제목 + 플랫폼별 값 두세 줄이다. 게임 카드 격자(세로 카드)를 빌리면
// 줄 높이가 세 배쯤 커져 본문이 올 때 화면이 위로 당겨진다.
import { Bone, ChipsSkeleton, SkeletonPage } from "@/components/ui/skeleton";

const SKELETON_ROWS = 6; // 넓은 화면 3열 두 줄
const PRICE_LINES = 2;

export default function WishlistLoading() {
  return (
    <SkeletonPage gap={26}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex flex-col gap-1.5">
          <Bone className="h-[30px] w-36 sm:h-[37px]" />
          <Bone className="h-4 w-52" />
        </div>
        <ChipsSkeleton count={2} />
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] gap-x-6 gap-y-7">
        {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
          <div key={i} className="flex gap-3.5 border-t border-line-soft py-4">
            <Bone className="h-[60px] w-[104px] shrink-0 rounded-[var(--radius-inset)]" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Bone className="h-5 w-3/5" />
              {Array.from({ length: PRICE_LINES }).map((_, j) => (
                <Bone key={j} className="h-4 w-4/5" />
              ))}
              <Bone className="h-3.5 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
