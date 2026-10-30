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
import { StatusTag, statusText } from "@/components/admin/pricing-form/status-tag";
import { PricingPreview } from "@/components/admin/pricing-form/preview";
import { targetLabel } from "@/components/admin/pricing-form/sections";
import { DataGrid, type GridCol } from "@/components/admin/screen/data-grid";
import { CodeName, Field, FieldPair, FormSection, MasterDetail, ReadValue, SearchBand, SearchItem, WithAside } from "@/components/admin/screen/layout";
import { DateField } from "@/components/ui/date-field";
import { NumberField } from "@/components/ui/number-field";
import { FormSelect } from "@/components/ui/select/fields";
import { TextField } from "@/components/ui/text-field";
import { formatPrice } from "@/lib/currency";
import { kstDateKey } from "@/lib/format";
import { promotionStatus, quote } from "@/lib/pricing/quote";
import { PRICING_ADMIN_MESSAGES as M } from "@/lib/pricing/admin-messages";
import { hasErrorUnder, type FieldErrors } from "@/lib/admin/validation";
import { isBundleProduct, MEMBERSHIP_KEY, PROMOTION_STOP_REASONS, type PricingSettings, type Promotion, type TierKey } from "@/lib/pricing/settings";

/** 새 줄의 첫 값 — 가장 흔히 쓸 "처음 결제하는 사람 10% 할인" */
const NEW_PROMO_PERCENT = 10;


/** 관리자용 코드명. 앞 판 줄은 코드명이 없어 고객노출명으로 대신한다 */
function codeName(p: Promotion): string {
  return p.name || p.label || M.newPromoLabel;
}

/** 이 프로모션 하나만 걸렸다고 보고 낸 값. 기간, 대상, 진행상태와 상관없이 할인 크기만 본다 */
function discountedOf(s: PricingSettings, p: Promotion, now: Date): number {
  return quote({ ...s, promotions: [{ ...p, active: true, startsOn: null, endsOn: null, audience: "all" }] }, p.target, { everPaid: false }, now).amount;
}


export function newPromotionId(): string {
  return `promo-${Date.now().toString(36)}`;
}

/** 프로모션 한 줄을 더한 설정. 화면 툴바의 입력이 쓴다. 중단(운영 중단)으로 생기고, 시작일은 오늘(한국 날짜), 끝일은 비운다(2026-10-30 사용자) */
export function withNewPromotion(d: PricingSettings, id: string): PricingSettings {
  return {
    ...d,
    promotions: [...d.promotions, { id, active: false, name: M.newPromoLabel, label: M.newPromoLabel, target: d.products[0]?.id ?? MEMBERSHIP_KEY, kind: "percent", value: NEW_PROMO_PERCENT, audience: "first", startsOn: kstDateKey(new Date()), endsOn: null }],
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
    { key: "status", label: M.promoFieldPhase, width: "72px", align: "center", tip: true, value: (p) => statusText(promotionStatus(p, now)), render: (p) => <StatusTag status={promotionStatus(p, now)} reason={false} /> },
    { key: "name", label: M.promoSearchName, width: "minmax(96px,1fr)", value: codeName },
    { key: "target", label: M.promoSearchTarget, width: "minmax(80px,0.8fr)", value: (p) => targetLabel(s, p.target) },
    // 할인가 = 이 프로모션이 걸렸을 때 내는 값(비율 할인도 원으로). 할인 방식, 값은 상세에서 본다
    { key: "deal", label: M.colDeal, width: "80px", align: "right", value: (p) => discountedOf(s, p, now), text: (p) => formatPrice(discountedOf(s, p, now)) },
  ];
}

function Search(props: { phase: string; target: string; name: string; s: PricingSettings; on: (k: "phase" | "target" | "name", v: string) => void }) {
  const { s, on } = props;
  const all = { value: "all", label: M.searchAll };
  return (
    <SearchBand label={M.searchLabel}>
      <SearchItem label={M.promoSearchPhase}>
        <FormSelect
          name="ps-phase"
          label={M.promoSearchPhase}
          hideLabel
          size="md"
          value={props.phase}
          onChange={(v) => on("phase", v)}
          options={[all, ...(["live", "stopped"] as const).map((k) => ({ value: k, label: M.statusLabels[k] }))]}
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
function Detail({ value, p, set, errors }: { value: PricingSettings; p: Promotion; set: (next: Partial<Promotion>) => void; errors: FieldErrors }) {
  const now = new Date();
  const at = `promotions.${value.promotions.indexOf(p)}`;
  const err = (k: string) => errors[`${at}.${k}`];
  const regular = p.target === MEMBERSHIP_KEY ? value.membership.amount : (value.products.find((x) => x.id === p.target)?.amount ?? 0);
  const discounted = discountedOf(value, p, now);
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-baseline gap-2 px-1">
        <span className="text-[16px] font-extrabold text-ink">{codeName(p)}</span>
      </p>
      {/* 탭을 걷었다 — 탭 셋에 칸이 열 남짓이라 탭은 칸을 숨기기만 했다(2026-10-30 사용자). 대상은 정가를 정하는 칸이라 혜택 묶음 맨 앞에 둔다 */}
      <WithAside aside={<PricingPreview value={value} tier={tierOfTarget(value, p.target)} />}>
        <FormSection title={M.promoSectionBasic} labelWidth="100px">
          <Field label={M.promoFieldCode} htmlFor={`pn-${p.id}`} required wide>
            <CodeName code={p.id}>
              <TextField id={`pn-${p.id}`} label={M.promoFieldCode} hideLabel value={p.name ?? p.label} onChange={(e) => set({ name: e.target.value })} error={err("name")} compact />
            </CodeName>
          </Field>
          {/* 진행상태는 진행 중, 중단 둘만 고른다(2026-10-30 사용자). 중단이면 사유를 곁에 고른다 — 사유는 여럿일 수 있다(가격변동 중단 등).
              진행 중으로 두어도 기간 밖이면 걸리지 않는다 — 그때는 딱지가 "중단 | 시작 전" 처럼 기간이 정한 사유를 보인다 */}
          <Field label={M.promoFieldPhase} required>
            <FormSelect
              name={`ps-${p.id}`}
              label={M.promoFieldPhase}
              hideLabel
              size="lg"
              value={p.active ? "live" : "stopped"}
              onChange={(v) => set(v === "live" ? { active: true, stopReason: null } : { active: false, stopReason: p.stopReason ?? "manual" })}
              options={(["live", "stopped"] as const).map((k) => ({ value: k, label: M.statusLabels[k] }))}
            />
          </Field>
          {!p.active && (
            <Field label={M.promoFieldStopReason} required>
              <FormSelect
                name={`pr-${p.id}`}
                label={M.promoFieldStopReason}
                hideLabel
                size="lg"
                value={p.stopReason ?? "manual"}
                onChange={(v) => set({ stopReason: v as (typeof PROMOTION_STOP_REASONS)[number] })}
                options={PROMOTION_STOP_REASONS.map((k) => ({ value: k, label: M.stopReasonLabels[k] }))}
              />
            </Field>
          )}
          <Field label={M.promoFieldName} htmlFor={`pl-${p.id}`} required wide>
            <TextField id={`pl-${p.id}`} label={M.promoFieldName} hideLabel value={p.label} onChange={(e) => set({ label: e.target.value })} error={err("label")} compact />
          </Field>
          <Field label={M.promoSectionPeriod} wide error={err("endsOn") ?? err("startsOn")}>
            <FieldPair
              from={<DateField label={M.promoStarts} hideLabel value={p.startsOn} max={p.endsOn} onChange={(v) => set({ startsOn: v })} />}
              to={<DateField label={M.promoEnds} hideLabel value={p.endsOn} min={p.startsOn} onChange={(v) => set({ endsOn: v })} />}
            />
          </Field>
        </FormSection>
        <FormSection title={M.promoSectionBenefit}>
          <Field label={M.promoTarget} required wide error={p.target !== MEMBERSHIP_KEY && !value.products.some((x) => x.id === p.target) ? errors.promotions : undefined}>
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
            <FormSelect name={`pk-${p.id}`} label={M.promoKind} hideLabel size="lg" value={p.kind} onChange={(v) => set({ kind: v as Promotion["kind"] })} options={(["price", "percent"] as const).map((k) => ({ value: k, label: M.kindLabels[k] }))} />
          </Field>
          <Field label={M.promoValue} htmlFor={`pv-${p.id}`} required>
            <NumberField id={`pv-${p.id}`} label={M.promoValue} hideLabel value={p.value} onValue={(n) => set({ value: n })} error={err("value")} trailing={<span className="pr-2 text-[13px] text-dim">{p.kind === "percent" ? "%" : M.won}</span>} className="text-right tabular-nums" compact />
          </Field>
          <Field label={M.promoAudience} required wide>
            <FormSelect name={`pa-${p.id}`} label={M.promoAudience} hideLabel size="lg" value={p.audience} onChange={(v) => set({ audience: v as Promotion["audience"] })} options={(["first", "all"] as const).map((k) => ({ value: k, label: M.audienceLabels[k] }))} />
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
export function PromotionsScreen({ value, saved, errors, patch, selected, onSelect }: { value: PricingSettings; saved: PricingSettings; errors: FieldErrors; patch: Patch; selected: string | null; onSelect: (id: string | null) => void }) {
  const [f, setF] = useState({ phase: "all", target: "all", name: "" });
  const now = new Date();
  const rows = value.promotions.filter(
    (p) =>
      (f.phase === "all" || promotionStatus(p, now).state === f.phase) &&
      (f.target === "all" || p.target === f.target) &&
      (!f.name.trim() || codeName(p).includes(f.name.trim()) || p.label.includes(f.name.trim())),
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
            fileKey={(p) => ({ code: p.id, name: codeName(p) })}
            selected={selected}
            onSelect={onSelect}
            autoSelectFirst
            rowState={(p) => (hasErrorUnder(errors, `promotions.${value.promotions.indexOf(p)}`) ? "error" : !savedById.has(p.id) ? "new" : savedById.get(p.id) !== JSON.stringify(p) ? "changed" : undefined)}
            rowTone={(p) => (p.active ? undefined : "muted")}
            searchable
            empty={M.promoListEmpty}
            fit
          />
        }
        detail={current ? <Detail key={current.id} value={value} p={current} set={set} errors={errors} /> : <p className="rounded-xl bg-surface-2 px-4 py-6 text-center text-[13px] text-dim">{M.promoPickHint}</p>}
      />
    </div>
  );
}
