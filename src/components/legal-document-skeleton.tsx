// 약관 문서 뼈대 — /terms 와 /privacy 가 같은 틀(legal-document)을 쓰니 뼈대도 한 벌이다.
// 좁은 폭, 제목 + 개정일, 연파랑 "한눈에 보기" 상자, 조항 목차 칩 여러 줄, 흰 판 안의 조항(제목 + 문단). 조항은 첫 화면만큼 셋을 그린다.
import { Bone, ChipsSkeleton, PageHeadSkeleton, SkeletonPage, TextLinesSkeleton } from "@/components/ui/skeleton";

/** 한눈에 보기 줄 수 — 두 문서 모두 summary 가 넷이다(lib/legal) */
const SUMMARY_LINES = 4;
/** 목차 칩 수 — 약관 16조, 방침 14항. 좁은 화면에서도 서너 줄이 되게 */
const TOC_CHIPS = 15;
const SECTIONS = 3;

export function LegalDocumentSkeleton() {
  return (
    <SkeletonPage width="tight" gap={20}>
      <PageHeadSkeleton width="w-40" />
      <div className="flex flex-col gap-3 rounded-[var(--radius-panel)] bg-acc-soft p-5 sm:p-6">
        <Bone className="h-5 w-20" />
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: SUMMARY_LINES }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <Bone className="size-4 shrink-0 rounded-full" />
              <Bone className={i % 2 === 0 ? "h-4 w-4/5" : "h-4 w-3/5"} />
            </div>
          ))}
        </div>
      </div>
      <ChipsSkeleton count={TOC_CHIPS} />
      <div className="flex flex-col divide-y divide-line-soft rounded-[var(--radius-panel)] bg-surface px-5 shadow-[var(--elev-card)] sm:px-7">
        {Array.from({ length: SECTIONS }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3 py-6">
            <Bone className="h-[22px] w-36" />
            <TextLinesSkeleton lines={i === 0 ? 2 : 4} />
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
