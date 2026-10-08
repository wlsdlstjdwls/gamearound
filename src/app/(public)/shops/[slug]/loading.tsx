// 매장 페이지 뼈대 — 좁은 폭(tight), 매장 이름, 정보 줄(왼쪽 이름표, 오른쪽 값), 소개, 상품 판 목록.
// 상품 줄은 56px 사진 + 이름 + 값이 회청 판(Panel) 위에 서므로 뼈대도 판 모양 그대로 둔다.
import { panelClass, ROWS } from "@/components/ui/page";
import { Bone, PageHeadSkeleton, SectionHeadSkeleton, SkeletonPage, TextLinesSkeleton } from "@/components/ui/skeleton";

const FACT_ROWS = 4; // 주소, 전화, 영업시간, 누리집
const LISTING_ROWS = 4;

export default function ShopLoading() {
  return (
    <SkeletonPage width="tight" gap={26}>
      <PageHeadSkeleton width="w-56" />

      <div className={ROWS}>
        {Array.from({ length: FACT_ROWS }).map((_, i) => (
          <div key={i} className="flex justify-between gap-4 py-[13px]">
            <Bone className="h-4 w-14" />
            <Bone className="h-4 w-40" />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <SectionHeadSkeleton width="w-20" />
        <TextLinesSkeleton lines={2} />
      </div>

      <div className="flex flex-col gap-3">
        <SectionHeadSkeleton width="w-24" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: LISTING_ROWS }).map((_, i) => (
            <div key={i} className={panelClass("flex items-center gap-3 px-4 py-3")}>
              <Bone className="size-14 shrink-0 rounded-[var(--radius-sm)]" />
              <div className="flex flex-1 items-center justify-between gap-3">
                <Bone className="h-4 w-2/5" />
                <Bone className="h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
