// 루트 로딩 — 홈/검색 등 공통 스켈레톤
export default function RootLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="불러오는 중">
      <div className="h-40 rounded-2xl border border-slate-800 bg-slate-900/60" />
      <div className="h-6 w-40 rounded bg-slate-800" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
            <div className="aspect-[460/215] bg-slate-800" />
            <div className="space-y-2 p-3">
              <div className="h-4 w-3/4 rounded bg-slate-800" />
              <div className="h-3 w-1/2 rounded bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
