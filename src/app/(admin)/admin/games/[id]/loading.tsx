// 게임 수정 뼈대 — 머리(경로 한 줄, 제목, 영문 제목과 주소 한 줄, 설명), 그 아래 마디 다섯:
// 기본 정보, 검색 별칭, 세대 업그레이드, 플랫폼별 값, 스토어 연결 표.
// 마디의 몸은 대부분 고침 폼(correction-form 등)이다 — 회색 면 한 장에 폼 이름 한 줄, 입력 줄 하나, 현재 값 한 줄.
// 맨 아래 고친 기록 표는 첫 화면 밖이라 그리지 않는다. 화면 높이를 넘는 뼈대는 아무도 보지 않는다.
import { Bone, PageHeadSkeleton, SkeletonBody } from "@/components/ui/skeleton";
import { AdminH2Skeleton, DataTableSkeleton } from "@/components/admin/skeletons";
import { panelClass } from "@/components/ui/page";
import { GAME_REF_COLS } from "@/lib/admin/table-cols";

const PLATFORM_FORMS = 2;
const REF_ROWS = 4;

/** 고침 폼 한 장 — 실물은 sm 부터 [12rem 필드 고르기 | 값 | 잠금 | 저장] 한 줄이다 */
function FormPanelBone() {
  return (
    <div className={panelClass("flex flex-col gap-2.5 p-4")}>
      <Bone className="h-4 w-32" />
      <div className="grid gap-2 sm:grid-cols-[12rem_1fr_auto_auto]">
        <Bone className="h-9 rounded-lg" />
        <Bone className="h-9 rounded-lg" />
        <Bone className="h-9 w-14 rounded-lg" />
        <Bone className="h-9 w-16 rounded-[9px]" />
      </div>
      <Bone className="h-3 w-40" />
    </div>
  );
}

export default function AdminGameLoading() {
  return (
    <SkeletonBody className="gap-8">
      <div className="flex flex-col gap-1.5">
        <Bone className="h-3.5 w-28" />
        <PageHeadSkeleton width="w-72" />
        <Bone className="h-4 w-80 max-w-full" />
        <Bone className="mt-1 h-4 w-[460px] max-w-full" />
      </div>

      <div className="flex flex-col gap-3">
        <AdminH2Skeleton width="w-20" />
        <FormPanelBone />
      </div>

      <div className="flex flex-col gap-3">
        <AdminH2Skeleton width="w-24" />
        <div className="flex flex-wrap gap-1.5">
          <Bone className="h-[30px] w-24 rounded-[var(--radius-panel)]" />
          <Bone className="h-[30px] w-20 rounded-[var(--radius-panel)]" />
          <Bone className="h-[30px] w-28 rounded-[var(--radius-panel)]" />
        </div>
        <FormPanelBone />
      </div>

      <div className="flex flex-col gap-3">
        <AdminH2Skeleton width="w-24" />
        <FormPanelBone />
      </div>

      <div className="flex flex-col gap-3">
        <AdminH2Skeleton width="w-28" />
        {Array.from({ length: PLATFORM_FORMS }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Bone className="h-3 w-[420px] max-w-full" />
            <FormPanelBone />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <AdminH2Skeleton width="w-24" />
        <DataTableSkeleton
          cols={GAME_REF_COLS}
          cells={["h-4 w-20", "h-4 w-3/4", "h-4 w-full", "h-[22px] w-14 rounded-[5px]", "h-4 w-8", "h-8 w-[124px] rounded-[9px]"]}
          rows={REF_ROWS}
        />
      </div>
    </SkeletonBody>
  );
}
