// 매장 찾기 뼈대 — 제목 행 오른쪽 검색칸, 그 아래 헤어라인 목록(좁은 화면 한 줄, sm 둘, lg 셋).
// 매장 줄은 이름 한 줄 + 주소, 전화 한 줄이라 카드 격자를 빌리면 높이가 세 배로 튄다.
import { cn } from "@/lib/cn";
import { Bone, SkeletonPage } from "@/components/ui/skeleton";
import { ROWS } from "@/components/ui/page";

const SKELETON_ROWS = 12; // 1, 2, 3열에서 모두 나눠떨어진다

export default function ShopsLoading() {
  return (
    <SkeletonPage gap={26}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Bone className="h-[30px] w-32 sm:h-[37px]" />
        <div className="flex flex-1 gap-2 sm:flex-none">
          <Bone className="h-10 flex-1 rounded-xl sm:w-[220px] sm:flex-none" />
          <Bone className="h-10 w-16 rounded-[9px]" />
        </div>
      </div>
      <div className={cn(ROWS, "sm:grid sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-3")}>
        {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5 py-[13px]">
            <Bone className="h-[19px] w-2/5" />
            <Bone className="h-3.5 w-4/5" />
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
