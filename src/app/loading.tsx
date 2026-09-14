// 루트 로딩 — 홈/검색 등 공통 스켈레톤
export default function RootLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[var(--page-w)] flex-col gap-9 px-7 pt-8 pb-[90px]" aria-busy="true" aria-label="불러오는 중">
      <div className="flex flex-col gap-2">
        <div className="skeleton h-4 w-40 rounded" />
        <div className="skeleton h-9 w-80 max-w-full rounded" />
        <div className="skeleton h-4 w-[420px] max-w-full rounded" />
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(238px,1fr))] gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className="skeleton aspect-[460/215]" />
            <div className="flex flex-col gap-2 p-[15px]">
              <div className="skeleton h-4 w-3/4 rounded" />
              <div className="skeleton h-3 w-1/2 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
