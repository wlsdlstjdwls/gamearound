// 상세 페이지 스켈레톤
export default function GameDetailLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[var(--page-w)] flex-col gap-7 px-7 pt-6 pb-20" aria-busy="true" aria-label="게임 정보를 불러오는 중">
      <div className="flex flex-wrap gap-6">
        <div className="skeleton aspect-[3/4] w-[190px] shrink-0 rounded-xl" />
        <div className="flex min-w-[280px] flex-1 flex-col gap-4">
          <div className="skeleton h-8 w-2/3 rounded" />
          <div className="skeleton h-4 w-1/3 rounded" />
          <div className="skeleton h-[84px] w-full rounded-xl" />
          <div className="flex gap-2">
            <div className="skeleton h-6 w-16 rounded-full" />
            <div className="skeleton h-6 w-16 rounded-full" />
            <div className="skeleton h-6 w-16 rounded-full" />
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="skeleton h-72 rounded-xl" />
        <div className="skeleton h-40 rounded-xl" />
      </div>
    </div>
  );
}
