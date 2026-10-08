// 인디 상세 뼈대 — 되돌아가기, 어두운 머리 판(왼쪽 460:215 대표 그림 + 오른쪽 제목 묶음),
// 그 아래 본문 열(소개 마디 카드)과 오른쪽 320px 정보 카드.
// 게임 상세 뼈대(세로 커버 + 가격 표)와 배치가 달라 따로 둔다 — 여기는 그림이 가로로 크고 가격 칸이 없다.
// 머리 판 안의 막대는 surface-3 이 아니라 그냥 skeleton 이다. 실물 판이 ink 라 색은 어차피 다르고, 자리만 맞으면 된다.
import { sectionCardClass } from "@/components/ui/page";
import { Bone, SectionHeadSkeleton, SkeletonPage, TextLinesSkeleton } from "@/components/ui/skeleton";

const INFO_ROWS = 5; // 개발, 단계, 플랫폼, 출시, 올린 날

export default function IndieDetailLoading() {
  return (
    <SkeletonPage pad="detail" gap={24}>
      <Bone className="h-4 w-24" />

      <div className="grid items-center gap-6 rounded-[var(--radius-panel)] bg-surface-2 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-9 lg:p-8">
        <Bone className="aspect-[460/215] w-full rounded-[var(--radius-md)]" />
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Bone className="h-4 w-20" />
            <Bone className="h-[32px] w-4/5 sm:h-[41px]" />
            <Bone className="h-5 w-full" />
          </div>
          <div className="flex gap-1.5">
            <Bone className="h-7 w-14 rounded-full" />
            <Bone className="h-7 w-16 rounded-full" />
          </div>
          <div className="flex gap-2">
            <Bone className="h-11 w-28 rounded-full" />
            <Bone className="h-11 w-24 rounded-full" />
          </div>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className={sectionCardClass("flex flex-col gap-3")}>
          <SectionHeadSkeleton width="w-28" />
          <TextLinesSkeleton lines={6} className="max-w-[720px] gap-3" />
        </div>

        <div className={sectionCardClass("flex flex-col gap-4")}>
          <div className="flex items-center gap-3">
            <Bone className="size-11 shrink-0 rounded-full" />
            <div className="flex flex-col gap-1.5">
              <Bone className="h-4 w-20" />
              <Bone className="h-3.5 w-28" />
            </div>
          </div>
          <div className="flex flex-col gap-2.5 border-t border-line pt-3">
            {Array.from({ length: INFO_ROWS }).map((_, i) => (
              <div key={i} className="flex justify-between gap-4">
                <Bone className="h-4 w-12" />
                <Bone className="h-4 w-24" />
              </div>
            ))}
          </div>
          <Bone className="h-10 w-full rounded-xl" />
        </div>
      </div>
    </SkeletonPage>
  );
}
