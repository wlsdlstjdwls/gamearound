"use client";
// 요금 설정 폼의 값과 판매 판(PricesSection)과 판 껍데기(Panel). 상태는 바깥(pricing-form)이 쥐고 patch 로 고친다.
// 값 칸은 숫자만 받는다(친 글에서 숫자만 남긴다). 범위 검증은 저장 단추가 같은 스키마로 한 번에 한다.
// 2026-10-29(사용자 "설정하기 이쁘게"): 상품은 광고(7일), 구독(매달) 두 묶음으로 가른다. 카드 문구 판은 copy-section 으로 뗐다.
import type { Patch } from "@/components/admin/pricing-form";
import { sectionCardClass } from "@/components/ui/page";
import { Switch } from "@/components/ui/switch";
import { TextField } from "@/components/ui/text-field";
import { PRICED_KEY_LABELS, PRICING_ADMIN_MESSAGES as M, TIER_LABELS } from "@/lib/pricing/admin-messages";
import type { PricingSettings } from "@/lib/pricing/settings";

type SectionProps = { value: PricingSettings; patch: Patch };

/** 친 글에서 숫자만. 비면 0(검증이 막는다) */
export function toInt(raw: string): number {
  const digits = raw.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
}

export function Panel({ title, lead, children }: { title: string; lead: string; children: React.ReactNode }) {
  return (
    <section className={sectionCardClass("flex flex-col gap-3")}>
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[15px] font-bold text-ink">{title}</h2>
        <p className="text-[12.5px] leading-[1.6] text-dim">{lead}</p>
      </div>
      {children}
    </section>
  );
}

// 값 칸 이름표는 감추고 단위를 칸 안에 둔다(2026-10-28, 컴팩트 회차). 줄마다 "값(원)" 이 서서 한 줄이 93px 이었다 —
// 줄 이름이 곧 무엇의 값인지 말하고, 낭독기에는 "OO 값(원)" 으로 읽힌다
function PriceRow({ label, amount, active, onAmount, onActive, extra }: { label: string; amount: number; active: boolean; onAmount: (n: number) => void; onActive: () => void; extra?: React.ReactNode }) {
  return (
    <div className="grid gap-2 border-t border-line-soft pt-2.5 first:border-t-0 first:pt-0 sm:grid-cols-[minmax(0,1fr)_160px_auto] sm:items-center sm:gap-4">
      <p className="text-[14px] font-semibold text-ink">{label}</p>
      <TextField
        label={`${label} ${M.amount}`}
        hideLabel
        inputMode="numeric"
        value={amount ? amount.toLocaleString("ko-KR") : ""}
        onChange={(e) => onAmount(toInt(e.target.value))}
        trailing={<span className="pr-2 text-[13px] text-dim">{M.won}</span>}
        className="text-right tabular-nums"
        compact
      />
      <div className="flex items-center gap-2">
        <span className="text-[12.5px] text-mut">{M.onSale}</span>
        <Switch on={active} label={`${label} ${M.onSale}`} onToggle={onActive} />
      </div>
      {extra && <div className="sm:col-span-3">{extra}</div>}
    </div>
  );
}

export function PricesSection({ value, patch }: SectionProps) {
  const product = (key: keyof PricingSettings["products"]) => (
    <PriceRow
      key={key}
      label={PRICED_KEY_LABELS[key]}
      amount={value.products[key].amount}
      active={value.products[key].active}
      onAmount={(n) => patch((d) => ({ ...d, products: { ...d.products, [key]: { ...d.products[key], amount: n } } }))}
      onActive={() => patch((d) => ({ ...d, products: { ...d.products, [key]: { ...d.products[key], active: !d.products[key].active } } }))}
    />
  );
  return (
    <Panel title={M.pricesTitle} lead={M.pricesLead}>
      <PriceGroup title={M.groupAds}>
        {product("boost_indie_7d")}
        {product("pin_promo_7d")}
        {product("bundle_7d")}
      </PriceGroup>
      <PriceGroup title={M.groupMembership}>
        <PriceRow
          label={TIER_LABELS.membership}
          amount={value.membership.amount}
          active={value.membership.active}
          onAmount={(n) => patch((d) => ({ ...d, membership: { ...d.membership, amount: n } }))}
          onActive={() => patch((d) => ({ ...d, membership: { ...d.membership, active: !d.membership.active } }))}
          extra={
            <div className="flex flex-col gap-1.5 sm:max-w-[240px]">
              <TextField
                label={M.credits}
                inputMode="numeric"
                value={String(value.membership.boostCredits)}
                onChange={(e) => patch((d) => ({ ...d, membership: { ...d.membership, boostCredits: toInt(e.target.value) } }))}
                compact
              />
              <p className="text-[12px] text-dim">{M.membershipNote}</p>
            </div>
          }
        />
      </PriceGroup>
    </Panel>
  );
}

/** 상품 묶음 하나 — 옅은 판 위에 줄들 */
function PriceGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-[var(--radius-inset)] bg-surface-2 p-3.5">
      <p className="text-[12.5px] font-bold text-mut">{title}</p>
      {children}
    </div>
  );
}
