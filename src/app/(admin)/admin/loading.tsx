// 수집 현황 뼈대 — 머리(제목, 설명 문단, 오른쪽 다시 돌리기 버튼), 24시간 합계 판 한 줄, 소스 카드 격자.
// 소스 카드는 실물(SourceCard)처럼 흰 판에 이름 두 줄과 상태 배지, 그 아래 지표 줄 넷, 가져온 게임 단추, 로그 링크다.
// 에러 맛보기는 실패한 소스에만 붙어 그리지 않는다.
// 격자 틀(최소 250px auto-fit)이 실물과 같아야 카드 수가 같은 줄 수로 접힌다.
import { Bone, PageHeadSkeleton, SkeletonBody } from "@/components/ui/skeleton";
import { panelClass, raisedClass } from "@/components/ui/page";

const SOURCE_CARDS = 9; // 붙어 있는 소스 수 언저리 — 실물 카드 수보다 적으면 본문이 올 때 줄이 늘어난다
const TOTALS = 4; // 신규 게임, 가격 기록, 실행, 실패
const METRICS = 4;

export default function AdminOverviewLoading() {
  return (
    <SkeletonBody className="gap-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex max-w-full flex-col gap-1.5">
          <PageHeadSkeleton width="w-32" />
          <Bone className="h-4 w-[600px] max-w-full" />
        </div>
        <Bone className="h-10 w-32 rounded-[9px]" />
      </div>

      <div className={panelClass("flex flex-wrap items-center gap-x-8 gap-y-3 px-5 py-4")}>
        <Bone className="h-3 w-16" />
        {Array.from({ length: TOTALS }).map((_, i) => (
          <div key={i} className="flex items-baseline gap-2">
            <Bone className="h-3.5 w-14" />
            <Bone className="h-6 w-12" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(250px,100%),1fr))] gap-3">
        {Array.from({ length: SOURCE_CARDS }).map((_, i) => (
          <div key={i} className={raisedClass("flex flex-col gap-2.5 p-4")}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col gap-1">
                <Bone className="h-4 w-24" />
                <Bone className="h-3 w-14" />
              </div>
              <Bone className="h-[22px] w-14 rounded-full" />
            </div>
            <div className="flex flex-col gap-2">
              {Array.from({ length: METRICS }).map((_, j) => (
                <div key={j} className="flex justify-between gap-3">
                  <Bone className="h-3.5 w-16" />
                  <Bone className={j === 0 ? "h-3.5 w-32" : "h-3.5 w-14"} />
                </div>
              ))}
            </div>
            {/* 가져온 게임 시트 단추와 로그 링크 — 실물 카드 높이의 절반이 이 둘이다(2026-10-08 캡처 비교: 뼈대 140 대 실물 335) */}
            <Bone className="mt-1 h-9 w-[124px] rounded-full" />
            <Bone className="h-3.5 w-24" />
          </div>
        ))}
      </div>
    </SkeletonBody>
  );
}
