"use client";
// 요금 설정 미리 보기(2026-10-29, 사용자 "설정하기 이쁘게", 같은 날 "왼쪽 폼, 오른쪽 미리 보기로"). 넓은 화면은 오른쪽 기둥에 붙어 따라온다. 저장 전 지금 고친 값으로 실제 요금 카드(components/payments/plan-cards)를 그린다.
// 문구 칸 이름(이름 위 작은 줄, 값 아래 강조 줄 등)만으로는 카드 어디에 서는지 알 수 없었다 — 고치는 자리 옆에 결과를 둔다.
// 값은 처음 결제하는 사람 기준이다(첫 결제 할인이 걸린 모습). 카드 단추는 고를 글이 없는 빈 상태로 그린다 — 미리 보기에서 결제로 넘어가지 않게.
import { PlanCards } from "@/components/payments/plan-cards";
import { Panel } from "@/components/admin/pricing-form/sections";
import { PRICING_ADMIN_MESSAGES as M } from "@/lib/pricing/admin-messages";
import { priceBook, sellingTiers } from "@/lib/pricing/quote";
import type { PricingSettings, TierKey } from "@/lib/pricing/settings";

/** tier 를 주면 그 카드 한 장만(문구를 고치는 카드). 없으면 판매 중인 카드 전부를 위아래로 쌓는다 */
export function PricingPreview({ value, tier }: { value: PricingSettings; tier?: TierKey }) {
  const book = priceBook(value, { productsPaid: false, membershipPaid: false }, new Date());
  const selling = sellingTiers(value);
  // 고치는 카드는 판매를 꺼 두었어도 보인다 — 문구를 고치는 중인데 미리 보기가 비면 안 된다
  const active = tier ? { single: tier === "single", bundle: tier === "bundle", membership: tier === "membership" } : selling;
  return (
    <Panel title={M.previewTitle}>
      {/* 관리자 판 안이라 카드 그림자, 테두리가 겹친다 — 옅은 바탕 위에 올려 실제 화면과 같은 대비로 본다 */}
      <div inert className="rounded-[var(--radius-inset)] bg-bg p-3 sm:p-4">
        <PlanCards
          copy={value.copy}
          book={book}
          active={active}
          stack
          credits={value.membership.boostCredits}
          membership={null}
          single={[]}
          bundle={[]}
          bundleNeedsPromo={false}
        />
      </div>
    </Panel>
  );
}
