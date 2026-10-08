// 뉴스 목록 스켈레톤 — 제목 + 헤어라인 줄(72x48 썸네일, 제목 두 줄, 매체와 시각 한 줄).
//
// 줄 모양은 components/news-list 의 한 줄을 잰 값이다(썸네일 h-12 w-[72px], 위아래 13px).
// 카드 격자로 기다리면 기사 줄이 올 때 높이가 전혀 다른 화면으로 바뀌었다.
import { Bone, PageHeadSkeleton, RowsSkeleton, SkeletonPage } from "@/components/ui/skeleton";

const NEWS_ROWS = 10; // 실물 한 장은 NEWS_PAGE_SIZE 30 — 첫 화면만 채운다

export default function NewsLoading() {
  return (
    <SkeletonPage gap={30}>
      <PageHeadSkeleton width="w-28" />
      <RowsSkeleton
        rows={NEWS_ROWS}
        renderRow={(i) => (
          <div className="flex gap-3 py-[13px]">
            <Bone className="h-12 w-[72px] shrink-0 rounded-[7px]" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Bone className={i % 3 === 1 ? "h-4 w-3/5" : "h-4 w-11/12"} />
              <Bone className="h-3 w-40" />
            </div>
          </div>
        )}
      />
    </SkeletonPage>
  );
}
