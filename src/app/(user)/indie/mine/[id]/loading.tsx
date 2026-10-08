// 인디 글 고치기 뼈대 — 좁은 폭(tight), 되돌아가기, 제목 + 오른쪽 "보기" 링크, 그림 칸들, 선 아래 입력 칸 묶음.
// 부모 경계(indie/mine/loading)의 목록 줄이 폼 자리에 뜨지 않게 따로 둔다.
import { Bone, PageHeadSkeleton, SectionHeadSkeleton, SkeletonPage } from "@/components/ui/skeleton";

const IMAGE_SLOTS = 4;
const FIELDS = 5; // 제목, 한 줄 소개, 개발, 단계, 본문 앞까지 — 첫 화면에 보이는 만큼

export default function IndieEditLoading() {
  return (
    <SkeletonPage width="tight" gap={24}>
      <Bone className="h-4 w-24" />
      <PageHeadSkeleton width="w-36" action="w-12" />

      <div className="flex flex-col gap-3">
        <SectionHeadSkeleton width="w-16" />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {Array.from({ length: IMAGE_SLOTS }).map((_, i) => (
            <Bone key={i} className="aspect-[460/215] rounded-[var(--radius-md)]" />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-5 border-t border-line pt-6">
        {Array.from({ length: FIELDS }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Bone className="h-4 w-20" />
            <Bone className="h-11 rounded-xl" />
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
