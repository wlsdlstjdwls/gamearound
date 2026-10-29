"use client";
// 요금 설정 폼의 두 판 — 값과 판매(PricesSection), 요금 카드 문구(CopySection). 상태는 바깥(pricing-form)이 쥐고 patch 로 고친다.
// 값 칸은 숫자만 받는다(친 글에서 숫자만 남긴다). 범위 검증은 저장 단추가 같은 스키마로 한 번에 한다.
// 줄 목록(혜택 줄, 멤버십 혜택)은 여러 줄 칸에 한 줄 하나로 받는다 — 줄마다 칸을 두면 줄을 늘리고 줄이는 단추가 판을 덮는다.
// 2026-10-29(사용자 "설정하기 이쁘게"): 상품은 광고(7일), 구독(매달) 두 묶음으로 가르고, 카드 문구는 세 카드를 한꺼번에 늘어놓던 것을
// 카드 탭 하나씩으로 바꿨다. 탭 안 칸은 카드에 서는 자리 순서(머리, 값 아래, 혜택, 단추)로 묶는다 — 미리 보기(preview)와 같은 순서로 읽힌다.
import type { Patch } from "@/components/admin/pricing-form";
import { FIELD_LABEL_CLASS } from "@/components/ui/field-classes";
import { sectionCardClass } from "@/components/ui/page";
import { Switch } from "@/components/ui/switch";
import { DetailTabs } from "@/components/ui/tabs";
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

type TextKey = "name" | "eyebrow" | "summary" | "tag" | "now" | "base" | "hint" | "cta";
/** 카드에 서는 자리 순서. 낱개 카드에는 혜택 머리(base)가 없다 — 맨 아랫단이라 "OO에 더해" 가 없다 */
const COPY_GROUPS: { title: keyof typeof M; fields: TextKey[]; lines?: boolean }[] = [
  { title: "groupHead", fields: ["name", "eyebrow", "summary", "tag"] },
  { title: "groupPrice", fields: ["now"] },
  { title: "groupBenefits", fields: ["base"], lines: true },
  { title: "groupAction", fields: ["cta", "hint"] },
];

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
  const setText = (tier: TierKey, field: TextKey, text: string) => patch((d) => ({ ...d, copy: { ...d.copy, [tier]: { ...d.copy[tier], [field]: text } } }));
  const setLines = (tier: TierKey, field: "lines" | "benefits", next: string[]) => patch((d) => ({ ...d, copy: { ...d.copy, [tier]: { ...d.copy[tier], [field]: next } } }));
  const tierPanel = (tier: TierKey) => (
    <div className="flex flex-col gap-3">
      {COPY_GROUPS.map((g) => {
        const fields = g.fields.filter((f) => !(tier === "single" && f === "base"));
        return (
          <fieldset key={g.title} className="grid gap-3 rounded-[var(--radius-inset)] bg-surface-2 p-3.5 sm:grid-cols-2">
            <legend className="sr-only">{M[g.title] as string}</legend>
            <p aria-hidden className="text-[12.5px] font-bold text-mut sm:col-span-2">
              {M[g.title] as string}
            </p>
            {fields.map((field) => (
              <TextField key={field} label={M.fields[field]} value={value.copy[tier][field]} onChange={(e) => setText(tier, field, e.target.value)} compact />
            ))}
            {g.lines && <LinesField id={`${tier}-lines`} label={M.fields.lines} lines={value.copy[tier].lines} onChange={(next) => setLines(tier, "lines", next)} />}
            {g.lines && tier === "membership" && <LinesField id="membership-benefits" label={M.fields.benefits} lines={value.copy.membership.benefits} onChange={(next) => setLines("membership", "benefits", next)} />}
          </fieldset>
        );
      })}
    </div>
  );
  return (
    <Panel title={M.copyTitle} lead={M.copyLead}>
      <DetailTabs label={M.copyTabs} tabs={(Object.keys(TIER_LABELS) as TierKey[]).map((tier) => ({ key: tier, label: TIER_LABELS[tier], panel: tierPanel(tier) }))} />
    </Panel>
  );
}
