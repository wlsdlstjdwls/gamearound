// 구독상품, 프로모션 화면 머리의 "요금 화면 열기"(2026-10-29 사용자 "새 탭으로 열리게"). 두 화면이 같이 쓴다.
// 같은 탭으로 가면 저장 안 한 폼을 떠나게 된다 — 새 탭에 실제 요금 화면을 열어 두고 견주며 고친다.
import { buttonClass } from "@/components/ui/button";
import { PRICING_ADMIN_MESSAGES as M } from "@/lib/pricing/admin-messages";
import { ROUTES } from "@/lib/routes";

export function PricingPreviewLink() {
  return (
    <a href={ROUTES.makerPlans} target="_blank" rel="noopener" className={buttonClass({ variant: "secondary", size: "sm" })}>
      {M.preview}
      <span className="sr-only"> {M.newWindow}</span>
    </a>
  );
}
