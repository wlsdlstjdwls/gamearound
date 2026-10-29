"use client";
// 요금 설정 폼의 프로모션 판(2026-10-28). 사용자: "첫 달 할인, 첫 결제 할인 같은 프로모션을 관리자가 설정하게".
// 한 줄이 프로모션 하나 — 딱지 글, 대상, 방식(비율/값), 누구에게(누구나/처음 결제), 기간, 켜기. 겹쳐 깎지 않고 가장 싼 하나만 쓰는 규칙은
// 판 머리 설명이 말한다(lib/pricing/quote). 지운 줄은 저장 전까지 "되돌리기" 로 살릴 수 있다(pricing-form).
// 기간은 한국 날짜다 — 끝일 23:59:59 까지 걸린다.
// 2026-10-29(사용자 "설정하기 이쁘게"): 줄 머리에 지금 단계 꼬리표(꺼짐, 시작 전, 진행 중, 끝남)와 한 문장 요약을 둔다 —
// 켜 두었는데 기간이 지나 안 걸리는 행사를 칸을 다 읽어야 알 수 있었다.
// 같은 날 둘째 손질: 목록 표 + 고른 줄 상세. 같은 날 밤(사용자 "메뉴랑 버튼만 가져다 두고 화면 구성은 그대로"): 신세계TV 백오피스 일반프로모션 꼴로
// 다시 짰다 — 위 조회조건(사용여부, 진행상태, 대상, 프로모션명), 왼쪽 프로모션 목록(공통 그리드), 오른쪽 상세 탭(기본정보, 혜택, 적용대상).
// 미리 보기는 탭이 아니라 탭 옆 기둥이다(2026-10-30, 사용자 "탭 이동해야지만 보이네") — 혜택 값을 고치며 바로 본다.
// 고객에게 보이는 이름(딱지 글)을 백오피스처럼 "고객노출명" 으로 부른다. 혜택 탭은 정가와 할인가를 계산해 보인다(lib/pricing/quote 와 같은 셈).
import { useState } from "react";
import type { Patch } from "@/components/admin/pricing-form";
import { PHASE_TONE } from "@/components/admin/pricing-form/phase-tone";
import { PricingPreview } from "@/components/admin/pricing-form/preview";
import { targetLabel } from "@/components/admin/pricing-form/sections";
import { DataGrid, type GridCol } from "@/components/admin/screen/data-grid";
import { Field, FieldPair, FormSection, MasterDetail, ReadValue, SearchBand, SearchItem, WithAside } from "@/components/admin/screen/layout";
import { DateField } from "@/components/ui/date-field";
import { NumberField } from "@/components/ui/number-field";
import { FormSelect } from "@/components/ui/select/fields";
import { Switch } from "@/components/ui/switch";
import { Tag } from "@/components/ui/tag";
import { TextField } from "@/components/ui/text-field";
import { formatPrice } from "@/lib/currency";
import { promotionPhase, quote } from "@/lib/pricing/quote";
import { PRICING_ADMIN_MESSAGES as M } from "@/lib/pricing/admin-messages";
import { isBundleProduct, MEMBERSHIP_KEY, type PricingSettings, type Promotion, type TierKey } from "@/lib/pricing/settings";

/** 새 줄의 첫 값 — 가장 흔히 쓸 "처음 결제하는 사람 10% 할인" */
const NEW_PROMO_PERCENT = 10;


function deal(p: Promotion): string {
  return p.kind === "percent" ? M.dealPercent(p.value) : M.dealPrice(formatPrice(p.value));
}

export function newPromotionId(): string {
  return `promo-${Date.now().toString(36)}`;
}

/** 프로모션 한 줄을 더한 설정. 화면 툴바의 입력이 쓴다. 꺼진 채로 생긴다 */
export function withNewPromotion(d: PricingSettings, id: string): PricingSettings {
  return {
    ...d,
    promotions: [...d.promotions, { id, active: false, label: M.newPromoLabel, target: d.products[0]?.id ?? MEMBERSHIP_KEY, kind: "percent", value: NEW_PROMO_PERCENT, audience: "first", startsOn: null, endsOn: null }],
  };
}

/** 프로모션이 걸리는 요금 카드. 미리 보기 탭이 그 카드를 보인다 */
function tierOfTarget(s: PricingSettings, target: string): TierKey {
  if (target === MEMBERSHIP_KEY) return "membership";
  const p = s.products.find((x) => x.id === target);
  return p && isBundleProduct(p) ? "bundle" : "single";
}

function columns(s: PricingSettings, now: Date): GridCol<Promotion>[] {
  return [
    {
      key: "phase",
      label: M.promoFieldPhase,
      width: "72px",
      value: (p) => M.phaseLabels[promotionPhase(p, now)],
      render: (p) => {
        const phase = promotionPhase(p, now);
        return <Tag tone={PHASE_TONE[phase]}>{M.phaseLabels[phase]}</Tag>;
      },
    },
    { key: "name", label: M.promoSearchName, width: "minmax(120px,1fr)", value: (p) => p.label || M.newPromoLabel },
    { key: "target", label: M.promoSearchTarget, width: "minmax(100px,0.8fr)", value: (p) => targetLabel(s, p.target) },
    { key: "deal", label: M.colDeal, width: "88px", align: "right", value: (p) => p.value, text: deal },
  ];
}

function Search(props: { use: string; phase: string; target: string; name: string; s: PricingSettings; on: (k: "use" | "phase" | "target" | "name", v: string) => void }) {
  const { s, on } = props;
  const all = { value: "all", label: M.searchAll };
  return (
    <SearchBand label={M.searchLabel}>
      <SearchItem label={M.promoSearchUse}>
        <FormSelect name="ps-use" label={M.promoSearchUse} hideLabel size="md" value={props.use} onChange={(v) => on("use", v)} options={[all, { value: "on", label: M.useLabels.on }, { value: "off", label: M.useLabels.off }]} />
      </SearchItem>
      <SearchItem label={M.promoSearchPhase}>
        <FormSelect
          name="ps-phase"
          label={M.promoSearchPhase}
          hideLabel
          size="md"
          value={props.phase}
          onChange={(v) => on("phase", v)}
          options={[all, ...(["live", "upcoming", "ended", "off"] as const).map((k) => ({ value: k, label: M.phaseLabels[k] }))]}
        />
      </SearchItem>
      <SearchItem label={M.promoSearchTarget}>
        <FormSelect
          name="ps-target"
          label={M.promoSearchTarget}
          hideLabel
          size="md"
          value={props.target}
          onChange={(v) => on("target", v)}
          options={[all, ...[...s.products.map((x) => x.id), MEMBERSHIP_KEY].map((k) => ({ value: k, label: targetLabel(s, k) }))]}
        />
      </SearchItem>
      <SearchItem label={M.promoSearchName} htmlFor="ps-name">
        <TextField id="ps-name" label={M.promoSearchName} hideLabel value={props.name} onChange={(e) => on("name", e.target.value)} compact />
      </SearchItem>
    </SearchBand>
  );
}

/** 고른 프로모션의 상세 */
function Detail({ value, p, set }: { value: PricingSettings; p: Promotion; set: (next: Partial<Promotion>) => void }) {
  const now = new Date();
  const phase = promotionPhase(p, now);
  const regular = p.target === MEMBERSHIP_KEY ? value.membership.amount : (value.products.find((x) => x.id === p.target)?.amount ?? 0);
  const discounted = quote({ ...value, promotions: [{ ...p, active: true, startsOn: null, endsOn: null, audience: "all" }] }, p.target, { everPaid: false }, now).amount;
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-baseline gap-2 px-1">
        <span className="text-[16px] font-extrabold text-ink">{p.label || M.newPromoLabel}</span>
        <Tag tone={PHASE_TONE[phase]}>{M.phaseLabels[phase]}</Tag>
      </p>
      {/* 탭을 걷었다 — 탭 셋에 칸이 열 남짓이라 탭은 칸을 숨기기만 했다(2026-10-30 사용자). 대상은 정가를 정하는 칸이라 혜택 묶음 맨 앞에 둔다 */}
      <WithAside aside={<PricingPreview value={value} tier={tierOfTarget(value, p.target)} />}>
        <FormSection title={M.promoSectionBasic}>
          <Field label={M.promoFieldCode}>
            <ReadValue>{p.id}</ReadValue>
          </Field>
          <Field label={M.promoFieldName} htmlFor={`pl-${p.id}`} required hint={M.promoFieldNameHint}>
            <TextField id={`pl-${p.id}`} label={M.promoFieldName} hideLabel value={p.label} onChange={(e) => set({ label: e.target.value })} compact />
          </Field>
          {/* 사용여부와 진행상태는 한 줄 — 진행상태는 고칠 수 없는 결과라 칸 하나를 따로 쓸 까닭이 없다(2026-10-30 사용자) */}
          <Field label={M.promoFieldUse}>
            <div className="flex min-h-11 flex-wrap items-center gap-2">
              <Switch on={p.active} label={M.promoFieldUse} onToggle={() => set({ active: !p.active })} />
              <span className="text-[13px] text-mut">{p.active ? M.useLabels.on : M.useLabels.off}</span>
              <span className="ml-auto flex items-center gap-1.5 text-[12px] text-dim">
                {M.promoFieldPhase}
                <Tag tone={PHASE_TONE[phase]}>{M.phaseLabels[phase]}</Tag>
              </span>
            </div>
          </Field>
          <Field label={M.promoSectionPeriod} hint={M.promoPeriodHint} wide>
            <FieldPair
              from={<DateField label={M.promoStarts} hideLabel value={p.startsOn} max={p.endsOn} onChange={(v) => set({ startsOn: v })} />}
              to={<DateField label={M.promoEnds} hideLabel value={p.endsOn} min={p.startsOn} onChange={(v) => set({ endsOn: v })} />}
            />
          </Field>
        </FormSection>
        <FormSection title={M.promoSectionBenefit}>
          <Field label={M.promoTarget} required wide>
            <FormSelect
              name={`pt-${p.id}`}
              label={M.promoTarget}
              hideLabel
              size="lg"
              value={p.target}
              onChange={(v) => set({ target: v })}
              options={[...value.products.map((x) => x.id), MEMBERSHIP_KEY].map((k) => ({ value: k, label: targetLabel(value, k) }))}
            />
          </Field>
          <Field label={M.promoKind} required>
            <FormSelect name={`pk-${p.id}`} label={M.promoKind} hideLabel size="lg" value={p.kind} onChange={(v) => set({ kind: v as Promotion["kind"] })} options={(["percent", "price"] as const).map((k) => ({ value: k, label: M.kindLabels[k] }))} />
          </Field>
          <Field label={M.promoValue} htmlFor={`pv-${p.id}`} required>
            <NumberField id={`pv-${p.id}`} label={M.promoValue} hideLabel value={p.value} onValue={(n) => set({ value: n })} trailing={<span className="pr-2 text-[13px] text-dim">{p.kind === "percent" ? "%" : M.won}</span>} className="text-right tabular-nums" compact />
          </Field>
          <Field label={M.promoAudience} required>
            <FormSelect name={`pa-${p.id}`} label={M.promoAudience} hideLabel size="lg" value={p.audience} onChange={(v) => set({ audience: v as Promotion["audience"] })} options={(["first", "all"] as const).map((k) => ({ value: k, label: M.audienceLabels[k] }))} />
          </Field>
          <Field label={M.promoFieldDeal}>
            <ReadValue>{deal(p)}</ReadValue>
          </Field>
          <Field label={M.promoFieldRegular}>
            <ReadValue align="right">{formatPrice(regular)}</ReadValue>
          </Field>
          <Field label={M.promoFieldPrice}>
            <ReadValue align="right">{formatPrice(discounted)}</ReadValue>
          </Field>
        </FormSection>
      </WithAside>
    </div>
  );
}

/** 고른 줄은 바깥(pricing-form)이 쥔다 — 툴바 삭제가 그 줄을 지운다 */
export function PromotionsScreen({ value, saved, patch, selected, onSelect }: { value: PricingSettings; saved: PricingSettings; patch: Patch; selected: string | null; onSelect: (id: string | null) => void }) {
  const [f, setF] = useState({ use: "all", phase: "all", target: "all", name: "" });
  const now = new Date();
  const rows = value.promotions.filter(
    (p) =>
      (f.use === "all" || (f.use === "on") === p.active) &&
      (f.phase === "all" || promotionPhase(p, now) === f.phase) &&
      (f.target === "all" || p.target === f.target) &&
      (!f.name.trim() || p.label.includes(f.name.trim())),
  );
  const savedById = new Map(saved.promotions.map((p) => [p.id, JSON.stringify(p)]));
  const current = value.promotions.find((p) => p.id === selected) ?? null;
  const set = (next: Partial<Promotion>) => current && patch((d) => ({ ...d, promotions: d.promotions.map((p) => (p.id === current.id ? { ...p, ...next } : p)) }));
  return (
    <div className="flex flex-col gap-3">
      <Search {...f} s={value} on={(k, v) => setF((x) => ({ ...x, [k]: v }))} />
      <MasterDetail
        list={
          <DataGrid
            label={M.promoListLabel}
            columns={columns(value, now)}
            rows={rows}
            rowKey={(p) => p.id}
            selected={selected}
            onSelect={onSelect}
            autoSelectFirst
            rowState={(p) => (!savedById.has(p.id) ? "new" : savedById.get(p.id) !== JSON.stringify(p) ? "changed" : undefined)}
            rowTone={(p) => (p.active ? undefined : "muted")}
            searchable
            empty={M.promoListEmpty}
            maxHeight="calc(100svh - var(--header-h) - 340px)"
          />
        }
        detail={current ? <Detail key={current.id} value={value} p={current} set={set} /> : <p className="rounded-xl bg-surface-2 px-4 py-6 text-center text-[13px] text-dim">{M.promoPickHint}</p>}
      />
    </div>
  );
}
