// 상품 매핑 뼈대 — 머리, 대기열 마디 제목, 여섯 칸 표(상품, 후보 게임, 유사도, 매장, 확인 시각, 판정 버튼).
// 상품과 후보 칸은 실물에서 이름 아래 작은 꼬리 줄(바코드, 영문 제목)이 붙어 두 줄이다.
import { SkeletonBody, SectionHeadSkeleton } from "@/components/ui/skeleton";
import { AdminHeadSkeleton, DataTableSkeleton } from "@/components/admin/skeletons";
import { PRODUCT_QUEUE_COLS } from "@/lib/admin/table-cols";

const ROWS = 8;

export default function AdminProductsLoading() {
  return (
    <SkeletonBody>
      <AdminHeadSkeleton width="w-36" leadLines={2} />
      <div className="flex flex-col gap-3">
        <SectionHeadSkeleton width="w-60" />
        <DataTableSkeleton
          cols={PRODUCT_QUEUE_COLS}
          cells={["h-9 w-4/5", "h-9 w-3/4", "h-4 w-8", "h-4 w-2/3", "h-4 w-24", "h-8 w-[120px] rounded-[9px]"]}
          rows={ROWS}
        />
      </div>
    </SkeletonBody>
  );
}
