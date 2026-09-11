// 상세 페이지 스켈레톤
export default function GameDetailLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="게임 정보를 불러오는 중">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-[240px_1fr]">
          <div className="aspect-[460/215] rounded-lg bg-slate-800 sm:aspect-[3/4]" />
          <div className="space-y-3">
            <div className="h-8 w-2/3 rounded bg-slate-800" />
            <div className="h-4 w-1/3 rounded bg-slate-800" />
            <div className="h-4 w-1/2 rounded bg-slate-800" />
            <div className="flex gap-2">
              <div className="h-5 w-12 rounded-full bg-slate-800" />
              <div className="h-5 w-12 rounded-full bg-slate-800" />
              <div className="h-5 w-12 rounded-full bg-slate-800" />
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="h-72 rounded-xl border border-slate-800 bg-slate-900/60" />
        <div className="h-40 rounded-xl border border-slate-800 bg-slate-900/60" />
      </div>
    </div>
  );
}
