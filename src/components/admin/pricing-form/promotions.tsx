"use client";
// 요금 설정 폼의 프로모션 판(2026-10-28). 사용자: "첫 달 할인, 첫 결제 할인 같은 프로모션을 관리자가 설정하게".
// 한 줄이 프로모션 하나 — 딱지 글, 대상, 방식(비율/값), 누구에게(누구나/처음 결제), 기간, 켜기. 겹쳐 깎지 않고 가장 싼 하나만 쓰는 규칙은
// 판 머리 설명이 말한다(lib/pricing/quote). 지운 줄은 저장 전까지 "되돌리기" 로 살릴 수 있다(pricing-form).
// 기간은 한국 날짜다 — 끝일 23:59:59 까지 걸린다.
// 2026-10-29(사용자 "설정하기 이쁘게"): 줄 머리에 지금 단계 꼬리표(꺼짐, 시작 전, 진행 중, 끝남)와 한 문장 요약을 둔다 —
// 켜 두었는데 기간이 지나 안 걸리는 행사를 칸을 다 읽어야 알 수 있었다.
import { Panel, toInt } from "@/components/admin/pricing-form/sections";
import type { Patch } from "@/components/admin/pricing-form";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { FormSelect } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tag, type TagTone } from "@/components/ui/tag";
import { formatPrice } from "@/lib/currency";
import { promotionPhase, type PromotionPhase } from "@/lib/pricing/quote";
import { TextField } from "@/components/ui/text-field";
import { PRICED_KEY_LABELS, PRICING_ADMIN_MESSAGES as M } from "@/lib/pricing/admin-messages";
import { PRICED_KEYS, type PricingSettings, type Promotion } from "@/lib/pricing/settings";

/** 새 줄의 첫 값 — 가장 흔히 쓸 "처음 결제하는 사람 10% 할인" */
const NEW_PROMO_PERCENT = 10;

const PHASE_TONE: Record<PromotionPhase, TagTone> = { off: "neutral", upcoming: "info", live: "ok", ended: "outline" };

function summary(p: Promotion): string {
  const deal = p.kind === "percent" ? M.dealPercent(p.value) : M.dealPrice(formatPrice(p.value));
  const period = p.startsOn || p.endsOn ? M.periodRange(p.startsOn ?? M.periodOpen, p.endsOn ?? M.periodOpen) : M.periodAlways;
  return M.promoSummary(PRICED_KEY_LABELS[p.target], M.audienceLabels[p.audience], deal, period);
}

export function PromotionsSection({ value, patch }: { value: PricingSettings; patch: Patch }) {
  const set = (i: number, next: Partial<Promotion>) => patch((d) => ({ ...d, promotions: d.promotions.map((p, j) => (j === i ? { ...p, ...next } : p)) }));
  const remove = (i: number) => patch((d) => ({ ...d, promotions: d.promotions.filter((_, j) => j !== i) }));
  const add = () =>
    patch((d) => ({
      ...d,
      promotions: [
        ...d.promotions,
        { id: `promo-${Date.now().toString(36)}`, active: false, label: M.newPromoLabel, target: "boost_indie_7d", kind: "percent", value: NEW_PROMO_PERCENT, audience: "first", startsOn: null, endsOn: null },
      ],
    }));

  const now = new Date();
  return (
    <Panel title={M.promosTitle} lead={M.promosLead}>
      {value.promotions.length === 0 && <p className="text-[13px] text-dim">{M.promosEmpty}</p>}
      <ul className="flex flex-col gap-3">
        {value.promotions.map((p, i) => (
          <li key={p.id} className="grid gap-3 rounded-xl bg-surface-2 p-3.5 sm:grid-cols-4">
            <div className="flex items-center justify-between gap-3 sm:col-span-4">
              <div className="flex min-w-0 items-center gap-2.5">
                <Switch on={p.active} label={`${p.label} ${M.promoActive}`} onToggle={() => set(i, { active: !p.active })} />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[14px] font-bold text-ink">{p.label || M.newPromoLabel}</span>
                    <Tag tone={PHASE_TONE[promotionPhase(p, now)]}>{M.phaseLabels[promotionPhase(p, now)]}</Tag>
                  </span>
                  <span className="text-[12.5px] text-dim">{summary(p)}</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => remove(i)}>
                {M.removePromo}
              </Button>
            </div>
            <div className="sm:col-span-2">
              <TextField label={M.promoLabel} value={p.label} onChange={(e) => set(i, { label: e.target.value })} compact />
            </div>
            <div className="sm:col-span-2">
              <FormSelect
                name={`target-${p.id}`}
                label={M.promoTarget}
                size="lg"
                value={p.target}
                onChange={(v) => set(i, { target: v as Promotion["target"] })}
                options={PRICED_KEYS.map((k) => ({ value: k, label: PRICED_KEY_LABELS[k] }))}
              />
            </div>
            <FormSelect
              name={`kind-${p.id}`}
              label={M.promoKind}
              size="lg"
              value={p.kind}
              onChange={(v) => set(i, { kind: v as Promotion["kind"] })}
              options={(["percent", "price"] as const).map((k) => ({ value: k, label: M.kindLabels[k] }))}
            />
            <TextField label={M.promoValue} inputMode="numeric" value={p.value ? p.value.toLocaleString("ko-KR") : ""} onChange={(e) => set(i, { value: toInt(e.target.value) })} compact />
            <div className="sm:col-span-2">
              <FormSelect
                name={`audience-${p.id}`}
                label={M.promoAudience}
                size="lg"
                value={p.audience}
                onChange={(v) => set(i, { audience: v as Promotion["audience"] })}
                options={(["first", "all"] as const).map((k) => ({ value: k, label: M.audienceLabels[k] }))}
              />
            </div>
            <div className="sm:col-span-2">
              <DateField label={M.promoStarts} value={p.startsOn} max={p.endsOn} onChange={(v) => set(i, { startsOn: v })} />
            </div>
            <div className="sm:col-span-2">
              <DateField label={M.promoEnds} value={p.endsOn} min={p.startsOn} onChange={(v) => set(i, { endsOn: v })} />
            </div>
          </li>
        ))}
      </ul>
      <div>
        <Button variant="secondary" size="sm" onClick={add}>
          {M.addPromo}
        </Button>
      </div>
    </Panel>
  );
}
