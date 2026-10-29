"use client";
// 요금 설정 폼의 프로모션 판(2026-10-28). 사용자: "첫 달 할인, 첫 결제 할인 같은 프로모션을 관리자가 설정하게".
// 한 줄이 프로모션 하나 — 딱지 글, 대상, 방식(비율/값), 누구에게(누구나/처음 결제), 기간, 켜기. 겹쳐 깎지 않고 가장 싼 하나만 쓰는 규칙은
// 판 머리 설명이 말한다(lib/pricing/quote). 지운 줄은 저장 전까지 "되돌리기" 로 살릴 수 있다(pricing-form).
// 기간은 한국 날짜다 — 끝일 23:59:59 까지 걸린다.
// 2026-10-29(사용자 "설정하기 이쁘게"): 줄 머리에 지금 단계 꼬리표(꺼짐, 시작 전, 진행 중, 끝남)와 한 문장 요약을 둔다 —
// 켜 두었는데 기간이 지나 안 걸리는 행사를 칸을 다 읽어야 알 수 있었다.
// 같은 날 둘째 손질(사용자 "관리자 화면이 어렵다", 신세계TV 백오피스 참고): 목록 표 + 고른 줄 상세로 바꿨다. 프로모션마다 칸 일곱이
// 펼쳐진 카드가 쌓이면 무엇이 걸려 있는지 훑을 수 없었다. 위 표는 한 줄에 한 행사(켜기, 상태, 대상, 할인, 기간)를 보이고,
// 고치는 칸은 고른 한 줄만 아래에 편다. 켜고 끄기는 표에서 바로 한다(가장 자주 하는 일).
import { Panel } from "@/components/admin/pricing-form/sections";
import { NumberField } from "@/components/ui/number-field";
import type { Patch } from "@/components/admin/pricing-form";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { FormSelect } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tag, type TagTone } from "@/components/ui/tag";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/currency";
import { promotionPhase, type PromotionPhase } from "@/lib/pricing/quote";
import { TextField } from "@/components/ui/text-field";
import { PRICING_ADMIN_MESSAGES as M } from "@/lib/pricing/admin-messages";
import { targetLabel } from "@/components/admin/pricing-form/sections";
import { MEMBERSHIP_KEY, type PricingSettings, type Promotion } from "@/lib/pricing/settings";

/** 새 줄의 첫 값 — 가장 흔히 쓸 "처음 결제하는 사람 10% 할인" */
const NEW_PROMO_PERCENT = 10;

const PHASE_TONE: Record<PromotionPhase, TagTone> = { off: "neutral", upcoming: "info", live: "ok", ended: "outline" };

function deal(p: Promotion): string {
  return p.kind === "percent" ? M.dealPercent(p.value) : M.dealPrice(formatPrice(p.value));
}

function period(p: Promotion): string {
  return p.startsOn || p.endsOn ? M.periodRange(p.startsOn ?? M.periodOpen, p.endsOn ?? M.periodOpen) : M.periodAlways;
}

function summary(s: PricingSettings, p: Promotion): string {
  return M.promoSummary(targetLabel(s, p.target), M.audienceLabels[p.audience], deal(p), period(p));
}

/** 표의 칸 폭. 머리 줄과 몸 줄이 같은 틀을 쓴다 */
const PROMO_GRID = "md:grid md:grid-cols-[52px_minmax(0,1.5fr)_minmax(0,1.1fr)_96px_minmax(0,1fr)_minmax(0,1.2fr)] md:items-center md:gap-3";

/** 고른 줄은 바깥(pricing-form)이 쥔다 — 미리 보기가 고른 행사의 카드를 따라간다 */
export function PromotionsSection({ value, patch, selected, onSelect: setSelected }: { value: PricingSettings; patch: Patch; selected: string | null; onSelect: (id: string | null) => void }) {
  const set = (i: number, next: Partial<Promotion>) => patch((d) => ({ ...d, promotions: d.promotions.map((p, j) => (j === i ? { ...p, ...next } : p)) }));
  const remove = (i: number) => {
    const rest = value.promotions.filter((_, j) => j !== i);
    setSelected(rest[Math.max(0, i - 1)]?.id ?? null);
    patch((d) => ({ ...d, promotions: d.promotions.filter((_, j) => j !== i) }));
  };
  const add = () => {
    const id = `promo-${Date.now().toString(36)}`;
    setSelected(id);
    patch((d) => ({
      ...d,
      promotions: [...d.promotions, { id, active: false, label: M.newPromoLabel, target: d.products[0]?.id ?? MEMBERSHIP_KEY, kind: "percent", value: NEW_PROMO_PERCENT, audience: "first", startsOn: null, endsOn: null }],
    }));
  };

  const now = new Date();
  const index = value.promotions.findIndex((p) => p.id === selected);
  const current = index >= 0 ? value.promotions[index] : null;

  return (
    <Panel title={M.promosTitle} count={value.promotions.length} lead={M.promosLead}>
      {value.promotions.length === 0 ? (
        <p className="rounded-xl bg-surface-2 px-4 py-3.5 text-[13px] text-mut">{M.promosEmpty}</p>
      ) : (
        <div>
          <div aria-hidden className={cn("hidden rounded-lg bg-surface-2 px-3 py-2 text-[11.5px] font-medium text-dim", PROMO_GRID)}>
            <span>{M.promoActive}</span>
            <span>{M.colPromo}</span>
            <span>{M.promoTarget}</span>
            <span>{M.colDeal}</span>
            <span>{M.promoAudience}</span>
            <span>{M.colPeriod}</span>
          </div>
          <ul className="divide-y divide-line-soft">
            {value.promotions.map((p, i) => {
              const phase = promotionPhase(p, now);
              const on = p.id === selected;
              return (
                <li key={p.id} className={cn("relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors", PROMO_GRID, on ? "bg-acc-soft" : "hover:bg-surface-2/60")}>
                  {/* 켜기는 표 위에서 바로 한다. 줄 고르기 단추(::after 로 줄 전체를 덮는다)보다 위에 둔다 */}
                  <div className="relative z-10 shrink-0">
                    <Switch on={p.active} label={`${p.label} ${M.promoActive}`} onToggle={() => set(i, { active: !p.active })} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                    <button type="button" aria-pressed={on} onClick={() => setSelected(p.id)} className="text-left font-semibold text-ink after:absolute after:inset-0">
                      {p.label || M.newPromoLabel}
                    </button>
                    <Tag tone={PHASE_TONE[phase]}>{M.phaseLabels[phase]}</Tag>
                    {/* 좁은 화면은 칸 대신 한 문장 */}
                    <span className="text-[12px] text-dim md:hidden">{summary(value, p)}</span>
                  </div>
                  <span className="hidden text-mut md:block">{targetLabel(value, p.target)}</span>
                  <span className="hidden font-semibold tabular-nums text-ink md:block">{deal(p)}</span>
                  <span className="hidden text-mut md:block">{M.audienceLabels[p.audience]}</span>
                  <span className="hidden tabular-nums text-mut md:block">{period(p)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <div>
        <Button variant="secondary" size="sm" onClick={add}>
          {M.addPromo}
        </Button>
      </div>

      {current ? (
        <section aria-label={M.editTitle} className="flex flex-col gap-3 rounded-xl border border-line p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[12px] font-semibold text-mut">{M.editTitle}</span>
              <span className="text-[14px] font-bold text-ink">{current.label || M.newPromoLabel}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => remove(index)}>
              {M.removePromo}
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <TextField label={M.promoLabel} value={current.label} onChange={(e) => set(index, { label: e.target.value })} compact />
            </div>
            <div className="sm:col-span-2">
              <FormSelect
                name={`target-${current.id}`}
                label={M.promoTarget}
                size="lg"
                value={current.target}
                onChange={(v) => set(index, { target: v as Promotion["target"] })}
                options={[...value.products.map((x) => x.id), MEMBERSHIP_KEY].map((k) => ({ value: k, label: targetLabel(value, k) }))}
              />
            </div>
            <FormSelect
              name={`kind-${current.id}`}
              label={M.promoKind}
              size="lg"
              value={current.kind}
              onChange={(v) => set(index, { kind: v as Promotion["kind"] })}
              options={(["percent", "price"] as const).map((k) => ({ value: k, label: M.kindLabels[k] }))}
            />
            <NumberField label={M.promoValue} value={current.value} onValue={(n) => set(index, { value: n })} compact />
            <div className="sm:col-span-2">
              <FormSelect
                name={`audience-${current.id}`}
                label={M.promoAudience}
                size="lg"
                value={current.audience}
                onChange={(v) => set(index, { audience: v as Promotion["audience"] })}
                options={(["first", "all"] as const).map((k) => ({ value: k, label: M.audienceLabels[k] }))}
              />
            </div>
            <div className="sm:col-span-2">
              <DateField label={M.promoStarts} value={current.startsOn} max={current.endsOn} onChange={(v) => set(index, { startsOn: v })} />
            </div>
            <div className="sm:col-span-2">
              <DateField label={M.promoEnds} value={current.endsOn} min={current.startsOn} onChange={(v) => set(index, { endsOn: v })} />
            </div>
          </div>
        </section>
      ) : (
        value.promotions.length > 0 && <p className="text-[12.5px] text-dim">{M.editHint}</p>
      )}
    </Panel>
  );
}
