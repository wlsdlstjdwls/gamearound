// 알림함 뼈대 — 제목과 건수 한 줄, 흰 판 안 알림 줄(동그란 그림 + 글 두 줄). 줄 높이가 본문과 같아야 본문이 올 때 화면이 튀지 않는다.
import { Bone, PageHeadSkeleton, SkeletonPage } from "@/components/ui/skeleton";

const SKELETON_ROWS = 8; // 첫 화면에 보이는 만큼

export default function NotificationsLoading() {
  return (
    <SkeletonPage gap={22}>
      <PageHeadSkeleton width="w-24" />
      <div className="flex flex-col divide-y divide-line-soft overflow-hidden rounded-[var(--radius-panel)] bg-surface shadow-hair">
        {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
          <div key={i} className="flex items-center gap-3.5 px-4 py-3.5 sm:px-5">
            <Bone className="size-9 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Bone className="h-4 w-3/5" />
              <Bone className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
