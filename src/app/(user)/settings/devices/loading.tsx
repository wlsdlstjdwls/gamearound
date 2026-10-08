// 내 기기 뼈대 — 좁은 폭(tight), 제목 + 옆 설명, 기기 판(Panel) 목록.
// 설정(settings/loading)이 부모 경계라 이 파일이 없으면 이 화면에서 설정의 마디 넷이 떴다.
// 판 하나는 이름 + 사양 한 줄 + 오른쪽 단추 둘이다.
import { panelClass } from "@/components/ui/page";
import { Bone, SkeletonPage } from "@/components/ui/skeleton";

const SKELETON_DEVICES = 2;

export default function DevicesLoading() {
  return (
    <SkeletonPage width="tight" gap={18}>
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <Bone className="h-[30px] w-28 sm:h-[37px]" />
        <Bone className="h-4 w-56" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: SKELETON_DEVICES }).map((_, i) => (
          <div key={i} className={panelClass("flex flex-wrap items-start justify-between gap-2 p-4")}>
            <div className="flex flex-col gap-1.5">
              <Bone className="h-[18px] w-32" />
              <Bone className="h-3.5 w-52" />
            </div>
            <div className="flex gap-1.5">
              <Bone className="h-8 w-14 rounded-[9px]" />
              <Bone className="h-8 w-14 rounded-[9px]" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
