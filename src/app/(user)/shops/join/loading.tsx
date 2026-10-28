// 입점 신청 뼈대 — 좁은 폭, 제목, 흰 판 하나 안의 번호 묶음 넷(매장, 사업자, 위치, 소개). 묶음마다 번호 동그라미 + 이름,
// 넓은 화면 2열 칸(compact 44). 위치는 온라인/오프라인 고르기 + 주소 두 칸(오프라인 기본), 소개는 세 줄 입력 칸. 맨 아래 오른쪽 보내기 단추.
import { FieldSkeleton, TextareaSkeleton } from "@/components/ui/form-skeleton";
import { sectionCardClass } from "@/components/ui/page";
import { Bone, PageHeadSkeleton, SkeletonPage } from "@/components/ui/skeleton";

/** 묶음 머리(shops/join-form 의 Group) — 번호 동그라미와 이름 */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
      <div className="flex items-center gap-2">
        <Bone className="size-5 rounded-full" />
        <Bone className={`h-5 ${title}`} />
      </div>
      <div className="grid min-w-0 items-start gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export default function ShopJoinLoading() {
  return (
    <SkeletonPage width="tight" gap={18}>
      <PageHeadSkeleton width="w-36" />
      <div className={sectionCardClass("flex flex-col gap-4")}>
        <div className="flex flex-col divide-y divide-line">
          <Group title="w-20">
            <FieldSkeleton compact label="w-14" />
            <FieldSkeleton compact label="w-20" />
          </Group>
          <Group title="w-24">
            <FieldSkeleton compact label="w-24" />
            <FieldSkeleton compact label="w-14" />
          </Group>
          <Group title="w-16">
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1 sm:col-span-2">
              <Bone className="h-9 rounded-[10px]" />
              <Bone className="h-9 rounded-[10px]" />
            </div>
            <FieldSkeleton compact label="w-10" />
            <FieldSkeleton compact label="w-16" />
          </Group>
          <Group title="w-24">
            <TextareaSkeleton label={null} height="h-[108px]" className="sm:col-span-2" />
          </Group>
        </div>
        <Bone className="ml-auto h-[46px] w-40 rounded-xl" />
      </div>
    </SkeletonPage>
  );
}
