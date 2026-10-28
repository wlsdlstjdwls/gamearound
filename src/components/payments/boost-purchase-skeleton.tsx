// 노출 자리 구매 판 뼈대 — 인디 게임 광고 걸기(/indie/mine/[id]/boost), 홍보 글 고정(/board/mine/[id]/pin)이 같은 판(boost-purchase)을 쓴다.
// 좁은 폭, 제목과 설명, 흰 판 하나: 상품 이름 + 글 제목, 안내 점 줄 넷, "이것만 / 같이 사기" 고르기 두 칸, 값 줄, 결제 수단 위젯 자리, 결제 단추.
// 이용권 단추, 진행 중 광고 안내, 판매 중단 안내는 사람과 설정에 따라 서는 조건부 블록이라 그리지 않는다.
import { sectionCardClass } from "@/components/ui/page";
import { Bone, PageHeadSkeleton, SkeletonPage } from "@/components/ui/skeleton";

/** 안내 점 줄 수 — PRODUCT_COPY 의 points 가 부스트, 고정 모두 넷이다(lib/payments/messages) */
const POINTS = 4;

export function BoostPurchaseSkeleton() {
  return (
    <SkeletonPage width="tight" gap={20}>
      <PageHeadSkeleton width="w-44" desc={1} />
      <div className={sectionCardClass("flex flex-col gap-4")}>
        <div className="flex flex-col gap-1.5">
          <Bone className="h-4 w-20" />
          <Bone className="h-6 w-56 max-w-full" />
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: POINTS }).map((_, i) => (
            <Bone key={i} className={i === POINTS - 1 ? "h-4 w-3/5" : "h-4 w-full"} />
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <Bone className="mb-2 h-4 w-28" />
          <div className="grid gap-2 sm:grid-cols-2">
            <Bone className="h-[72px] rounded-[var(--radius-md)]" />
            <Bone className="h-[72px] rounded-[var(--radius-md)]" />
          </div>
        </div>
        <div className="flex items-end justify-between border-t border-line pt-4">
          <Bone className="h-5 w-12" />
          <Bone className="h-7 w-28" />
        </div>
        {/* 결제 수단 위젯(min-h-24)과 약관 동의, 결제 단추 */}
        <Bone className="h-24 w-full rounded-[var(--radius-md)]" />
        <Bone className="h-12 w-full rounded-[var(--radius-md)]" />
        <Bone className="h-[46px] w-full rounded-xl" />
      </div>
    </SkeletonPage>
  );
}
