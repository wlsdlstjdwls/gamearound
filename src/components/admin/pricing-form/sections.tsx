"use client";
// 요금 설정 폼의 두 판 — 값과 판매(PricesSection), 요금 카드 문구(CopySection). 상태는 바깥(pricing-form)이 쥐고 patch 로 고친다.
// 값 칸은 숫자만 받는다(친 글에서 숫자만 남긴다). 범위 검증은 저장 단추가 같은 스키마로 한 번에 한다.
// 줄 목록(혜택 줄, 멤버십 혜택)은 여러 줄 칸에 한 줄 하나로 받는다 — 줄마다 칸을 두면 줄을 늘리고 줄이는 단추가 판을 덮는다.
import type { Patch } from "@/components/admin/pricing-form";
import { FIELD_LABEL_CLASS } from "@/components/ui/field-classes";
import { sectionCardClass } from "@/components/ui/page";
import { Switch } from "@/components/ui/switch";
import { TextField, TEXTAREA_CLASS } from "@/components/ui/text-field";
import { PRICED_KEY_LABELS, PRICING_ADMIN_MESSAGES as M, TIER_LABELS } from "@/lib/pricing/admin-messages";
import type { PricingSettings, TierKey } from "@/lib/pricing/settings";

type SectionProps = { value: PricingSettings; patch: Patch };

/** 친 글에서 숫자만. 비면 0(검증이 막는다) */
export function toInt(raw: string): number {
  const digits = raw.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
}

export function Panel({ title, lead, children }: { title: string; lead: string; children: React.ReactNode }) {
  return (
    <section className={sectionCardClass("flex flex-col gap-4")}>
      <div className="flex flex-col gap-1">
        <h2 className="text-[15px] font-bold text-ink">{title}</h2>
        <p className="text-[13px] leading-[1.6] text-mut">{lead}</p>
      </div>
      {children}
    </section>
  );
}

function PriceRow({ label, amount, active, onAmount, onActive, extra }: { label: string; amount: number; active: boolean; onAmount: (n: number) => void; onActive: () => void; extra?: React.ReactNode }) {
  return (
    <div className="grid gap-3 border-t border-line-soft pt-3 first:border-t-0 first:pt-0 sm:grid-cols-[minmax(0,1fr)_160px_auto] sm:items-end">
      <p className="text-[14px] font-semibold text-ink">{label}</p>
      <TextField label={M.amount} inputMode="numeric" value={amount ? amount.toLocaleString("ko-KR") : ""} onChange={(e) => onAmount(toInt(e.target.value))} compact />
      <div className="flex items-center gap-2 pb-2">
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
      <div className="flex flex-col gap-3">
        {product("boost_indie_7d")}
        {product("pin_promo_7d")}
        {product("bundle_7d")}
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
      </div>
    </Panel>
  );
}

const TEXT_FIELDS = ["name", "eyebrow", "summary", "tag", "now", "base", "hint", "cta"] as const;

function LinesField({ id, label, lines, onChange }: { id: string; label: string; lines: readonly string[]; onChange: (next: string[]) => void }) {
  return (
    <div className="flex flex-col gap-1.5 sm:col-span-2">
      <label htmlFor={id} className={FIELD_LABEL_CLASS}>
        {label}
      </label>
      <textarea
        id={id}
        rows={Math.max(3, lines.length + 1)}
        className={TEXTAREA_CLASS}
        value={lines.join("\n")}
        // 치는 동안은 빈 줄도 그대로 둔다(엔터 뒤 빈 줄이 바로 사라지면 다음 줄을 칠 수 없다). 저장할 때 걸러낸다(pricing-form 의 normalize)
        onChange={(e) => onChange(e.target.value.split("\n"))}
      />
    </div>
  );
}

export function CopySection({ value, patch }: SectionProps) {
  const setText = (tier: TierKey, field: (typeof TEXT_FIELDS)[number], text: string) => patch((d) => ({ ...d, copy: { ...d.copy, [tier]: { ...d.copy[tier], [field]: text } } }));
  const setLines = (tier: TierKey, field: "lines" | "benefits", next: string[]) => patch((d) => ({ ...d, copy: { ...d.copy, [tier]: { ...d.copy[tier], [field]: next } } }));
  return (
    <Panel title={M.copyTitle} lead={M.copyLead}>
      {(Object.keys(TIER_LABELS) as TierKey[]).map((tier) => (
        <fieldset key={tier} className="grid gap-3 border-t border-line pt-4 first-of-type:border-t-0 first-of-type:pt-0 sm:grid-cols-2">
          <legend className="mb-1 text-[14px] font-bold text-ink">{TIER_LABELS[tier]}</legend>
          {TEXT_FIELDS.map((field) => (
            <TextField key={field} label={M.fields[field]} value={value.copy[tier][field]} onChange={(e) => setText(tier, field, e.target.value)} compact />
          ))}
          <LinesField id={`${tier}-lines`} label={M.fields.lines} lines={value.copy[tier].lines} onChange={(next) => setLines(tier, "lines", next)} />
          {tier === "membership" && <LinesField id="membership-benefits" label={M.fields.benefits} lines={value.copy.membership.benefits} onChange={(next) => setLines("membership", "benefits", next)} />}
        </fieldset>
      ))}
    </Panel>
  );
}
