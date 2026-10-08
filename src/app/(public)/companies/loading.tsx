// 회사 목록 스켈레톤 — 제목 + 위아래 헤어라인 띠 안의 국가 칩 + 1/2/3열로 흐르는 회사 이름 줄.
//
// 회사에는 커버가 없다(companies/page 주석: 카드를 줄로 바꿨다). 루트의 카드 격자로 기다리면
// 커버 열두 장이 떴다가 글자 줄로 바뀌어 높이가 절반 넘게 줄었다. 줄 격자 클래스는 실물과 같다.
import { Bone, ChipsSkeleton, PageHeadSkeleton, SkeletonPage } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

const COUNTRY_CHIPS = 8; // 실물은 전체 + 회사가 있는 나라 — 넓은 화면 한두 줄
const COMPANY_ROWS = 18; // 3열 여섯 줄 — 첫 화면만 채운다
const NAME_WIDTHS = ["w-32", "w-44", "w-28", "w-40", "w-36"];

export default function CompaniesLoading() {
  return (
    <SkeletonPage gap={26}>
      <PageHeadSkeleton width="w-36" />
      <ChipsSkeleton count={COUNTRY_CHIPS} className="border-y border-line py-3" />
      <div className="rows sm:grid sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-3">
        {Array.from({ length: COMPANY_ROWS }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3 py-[13px]">
            <Bone className={cn("h-[18px] max-w-[70%]", NAME_WIDTHS[i % NAME_WIDTHS.length])} />
            <Bone className="h-3.5 w-16" />
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
