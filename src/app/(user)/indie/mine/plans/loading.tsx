// 광고, 멤버십 요금 안내 뼈대 — 제목 + 오른쪽 작은 단추 둘(광고 성과, 결제 내역) + 설명, 요금 카드 셋(넓은 화면 3열: 이름표, 이름, 요약, 값 칸,
// 지금 받는 것 띠, 혜택 줄, 구매 단추), 아래 "걸면 여기서 먼저 보여요" 판(제목, 설명, 자리 카드 넷).
import { sectionCardClass } from "@/components/ui/page";
import { Bone, SkeletonPage } from "@/components/ui/skeleton";

const PLAN_CARDS = 3; // 낱개, 묶음, 멤버십
const PLAN_LINES = 4;
const SPOTS = 4; // PLAN_SPOTS — 목록 맨 위, 홈 인디 줄, 같은 장르 상세, 게시판 홍보 맨 위

export default function PlansLoading() {
  return (
    <SkeletonPage gap={20}>
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-4">
          <Bone className="h-[30px] w-40 sm:h-[37px]" />
          <div className="flex gap-1.5">
            <Bone className="h-8 w-20 rounded-xl" />
            <Bone className="h-8 w-20 rounded-xl" />
          </div>
        </div>
        <Bone className="h-4 w-[420px] max-w-full" />
      </div>

      <div className="grid items-stretch gap-3 lg:grid-cols-3">
        {Array.from({ length: PLAN_CARDS }).map((_, i) => (
          <div key={i} className={sectionCardClass("flex flex-col gap-4")}>
            <div className="flex flex-col gap-1.5">
              <Bone className="h-3.5 w-16" />
              <Bone className="h-7 w-28" />
              <Bone className="h-5 w-3/4" />
            </div>
            <div className="flex flex-col gap-1.5 lg:min-h-[92px]">
              <Bone className="h-9 w-32" />
              <Bone className="h-4 w-24" />
            </div>
            <Bone className="h-9 w-full rounded-xl" />
            <div className="flex flex-col gap-2.5">
              {Array.from({ length: PLAN_LINES }).map((_, j) => (
                <Bone key={j} className={j % 2 === 0 ? "h-[18px] w-4/5" : "h-[18px] w-3/5"} />
              ))}
            </div>
            <Bone className="mt-auto h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>

      <div className={sectionCardClass("flex flex-col gap-6")}>
        <div className="flex flex-col gap-2">
          <Bone className="h-3.5 w-20" />
          <Bone className="h-[27px] w-64 max-w-full sm:h-[31px]" />
          <Bone className="h-4 w-[480px] max-w-full" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: SPOTS }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-2xl bg-acc-soft/60 p-4">
              <Bone className="h-[76px] w-full rounded-xl" />
              <div className="flex flex-col gap-1.5">
                <Bone className="h-3.5 w-16" />
                <Bone className="h-5 w-28" />
                <Bone className="h-4 w-full" />
                <Bone className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-4">
          <Bone className="h-4 w-40" />
          <Bone className="h-4 w-36" />
        </div>
      </div>
    </SkeletonPage>
  );
}
