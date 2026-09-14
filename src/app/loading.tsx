// 루트 로딩 — 홈/검색 등 공통 스켈레톤. 실제 화면과 같은 셸(Page), 카드 표면을 써야 전환이 튀지 않는다.
import { cardClass, Page } from "@/components/ui/page";

const SKELETON_CARDS = 8;

export default function RootLoading() {
  return (
    <Page pad="home" gap={36} aria-busy="true" aria-label="불러오는 중">
      <div className="flex flex-col gap-2">
        <div className="skeleton h-4 w-40 rounded" />
        <div className="skeleton h-9 w-80 max-w-full rounded" />
        <div className="skeleton h-4 w-[420px] max-w-full rounded" />
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(238px,1fr))] gap-4">
        {Array.from({ length: SKELETON_CARDS }).map((_, i) => (
          <div key={i} className={cardClass("overflow-hidden")}>
            <div className="skeleton aspect-[460/215]" />
            <div className="flex flex-col gap-2 p-[15px]">
              <div className="skeleton h-4 w-3/4 rounded" />
              <div className="skeleton h-3 w-1/2 rounded" />
            </div>
          </div>
        ))}
      </div>
    </Page>
  );
}
