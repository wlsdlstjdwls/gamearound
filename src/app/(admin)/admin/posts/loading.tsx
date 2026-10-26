// 게시글 관리 뼈대 — 머리, 칸 칩 줄, 표(넓은 화면) 또는 카드(좁은 화면). 칸 수는 page 의 POST_ADMIN_COLS 와 같다.
import { SkeletonBody } from "@/components/ui/skeleton";
import { AdminChipsSkeleton, AdminHeadSkeleton, DataTableSkeleton } from "@/components/admin/skeletons";
import { POST_ADMIN_COLS } from "@/lib/admin/table-cols";

const ROWS = 8;
const TABS = 4; // services/community/admin 의 POST_ADMIN_TABS 수. 그 모듈은 DB 를 끌고 와서 뼈대가 가져오지 않는다
/** 칸마다 막대. 마지막은 숨기기 단추 모양이다 */
const CELLS = ["h-4 w-3/4", "h-4 w-12", "h-4 w-24", "h-4 w-20", "h-4 w-32", "h-8 w-[84px] rounded-[9px]"];

export default function AdminPostsLoading() {
  return (
    <SkeletonBody className="gap-5">
      <AdminHeadSkeleton width="w-24" />
      <AdminChipsSkeleton count={TABS} />
      <DataTableSkeleton cols={POST_ADMIN_COLS} cells={CELLS} rows={ROWS} />
    </SkeletonBody>
  );
}
