// 관리자 화면 스켈레톤.
//
// 없을 때 무슨 일이 벌어졌냐면: 관리자 화면은 전부 force-dynamic 이라 메뉴를 누르면 서버가
// 다 그릴 때까지 아무 일도 일어나지 않았고, 가장 가까운 로딩 경계가 루트(app/loading.tsx)라
// 마침내 뜨는 것도 **메뉴까지 통째로 지운 홈 모양 스켈레톤**이었다. 화면을 옮길 때마다
// 메뉴가 사라졌다 돌아오니 이동이 실제보다 훨씬 느리게 느껴진다.
//
// 이 파일이 (admin)/admin 에 있으면 경계가 본문으로 내려온다 — 메뉴는 그대로 있고 본문만 바뀐다.
// enter={false} + skeleton-delay 규칙은 다른 스켈레톤과 같다(응답이 빠르면 아예 뜨지 않는다).


const SKELETON_CARDS = 6;
const SKELETON_ROWS = 6;

export default function AdminLoading() {
  return (
    <div className="skeleton-delay flex flex-col gap-6" aria-busy="true" aria-label="불러오는 중">
      <div className="flex flex-col gap-2">
        <div className="skeleton h-8 w-56 rounded" />
        <div className="skeleton h-4 w-[420px] max-w-full rounded" />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(230px,100%),1fr))] gap-x-8 gap-y-5">
        {Array.from({ length: SKELETON_CARDS }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2.5 border-t border-line pt-3.5">
            <div className="skeleton h-4 w-24 rounded" />
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-3 w-2/3 rounded" />
          </div>
        ))}
      </div>

      <div className="rows">
        {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-[13px]">
            <div className="skeleton h-4 flex-1 rounded" />
            <div className="skeleton h-4 w-24 rounded" />
            <div className="skeleton h-7 w-[120px] rounded-[7px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
