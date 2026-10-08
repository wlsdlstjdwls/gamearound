// 관리자 화면 폴백 뼈대 — 제 loading.tsx 가 없는 관리자 화면이 받는다.
//
// 없을 때 무슨 일이 벌어졌냐면: 관리자 화면은 전부 force-dynamic 이라 메뉴를 누르면 서버가
// 다 그릴 때까지 아무 일도 일어나지 않았고, 가장 가까운 로딩 경계가 루트(app/loading.tsx)라
// 마침내 뜨는 것도 **메뉴까지 통째로 지운 홈 모양 스켈레톤**이었다. 이 파일이 관리자 레이아웃 곁((admin))에 있으면
// 경계가 본문으로 내려온다 — 메뉴는 그대로 있고 본문만 바뀐다.
//
// 2026-10-08: 화면마다 제 모양의 뼈대를 따로 두었다(수집 현황, 할 일, 실행 로그, 매칭, 상품, 회사, 특전, 인디,
// 게임 수정, 입점 심사). 여기는 그 밖의 화면을 위한 가장 흔한 모양 — 머리와 헤어라인 줄 목록 — 만 남긴다.
import { Bone, RowsSkeleton, SkeletonBody } from "@/components/ui/skeleton";
import { AdminHeadSkeleton } from "@/components/admin/skeletons";

const ROWS = 8;

export default function AdminLoading() {
  return (
    <SkeletonBody>
      <AdminHeadSkeleton />
      <RowsSkeleton
        rows={ROWS}
        renderRow={(i) => (
          <div className="flex items-center gap-3 py-[13px]">
            <Bone className={i % 2 ? "h-4 w-2/5" : "h-4 w-1/2"} />
            <Bone className="ml-auto h-4 w-24" />
            <Bone className="h-8 w-[120px] rounded-[9px]" />
          </div>
        )}
      />
    </SkeletonBody>
  );
}
