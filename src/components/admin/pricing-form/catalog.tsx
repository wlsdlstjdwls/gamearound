"use client";
// 상품등록 화면 본문(2026-10-29 밤, 사용자 "메뉴랑 버튼만 가져다 두고 화면 구성은 그대로네").
// 신세계TV 백오피스 상품등록 꼴: 위 조회조건, 왼쪽 상품 목록(판매중지는 흐리게), 오른쪽 고른 상품의 상세 탭(기초정보, 가격정보, 카드문구).
// 앞 판은 판매 상품 표 한 장에 모든 칸을 늘어놓고 카드 문구 판을 그 아래 따로 두었다 — 어느 문구가 어느 상품 것인지 이어지지 않았다.
// 이제 상품을 고르면 그 상품의 이름, 자리, 기간, 판매, 값, 걸린 프로모션, 카드 문구가 한 자리에 모인다.
// 멤버십은 지우거나 더하는 상품이 아니라 목록 맨 아래 고정 줄이다. 상태는 바깥(pricing-form)이 쥐고 patch 로 고친다.
import { FULL_ROW } from "@/components/admin/screen/form-grid";
import { useState } from "react";
import type { Patch } from "@/components/admin/pricing-form";
import { CopySection } from "@/components/admin/pricing-form/copy-section";
import { StatusTag } from "@/components/admin/pricing-form/status-tag";
import { PricingPreview } from "@/components/admin/pricing-form/preview";
import { CodeName, Field, FieldPair, FormSection, MasterDetail, ReadValue, SearchBand, SearchItem, WithAside } from "@/components/admin/screen/layout";
import { DataGrid, type GridCol } from "@/components/admin/screen/data-grid";
import { ProgramLink } from "@/components/admin/screen/program-link";
import { ADMIN_NAV } from "@/lib/admin/messages";
import { hasErrorUnder, type FieldErrors } from "@/lib/admin/validation";
import { NumberField } from "@/components/ui/number-field";
import { FormSelect } from "@/components/ui/select/fields";
import { Switch } from "@/components/ui/switch";
import { TextField } from "@/components/ui/text-field";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/currency";
import { ROUTES } from "@/lib/routes";
import { PRICING_ADMIN_MESSAGES as M, SLOT_CHOICES, slotChoiceOf, TIER_LABELS, type SlotChoice } from "@/lib/pricing/admin-messages";
import { PLAN_SPOTS } from "@/lib/pricing/preview-spots";
import { bundleListPrice, defaultBundleParts, discountRate, promotionStatus } from "@/lib/pricing/quote";
import { isBundleProduct, MEMBERSHIP_KEY, type CatalogProduct, type PricingSettings, type TierKey } from "@/lib/pricing/settings";

type Kind = SlotChoice | "membership";
type Row = { key: string; kind: Kind; name: string; days: number | null; amount: number; active: boolean };

const SLOT_SETS: Record<SlotChoice, CatalogProduct["slots"]> = { indie: ["indie_top"], pin: ["promo_pin"], both: ["indie_top", "promo_pin"] };

/** 고른 줄의 카드 갈래 — 카드 문구 탭과 미리 보기가 따라간다 */
export function tierOfKey(s: PricingSettings, key: string | null): TierKey {
  if (key === MEMBERSHIP_KEY) return "membership";
  const p = s.products.find((x) => x.id === key);
  return p && isBundleProduct(p) ? "bundle" : "single";
}

function rowsOf(s: PricingSettings): Row[] {
  return [
    ...s.products.map((p) => ({ key: p.id, kind: slotChoiceOf(p.slots) as Kind, name: p.name, days: p.days, amount: p.amount, active: p.active })),
    { key: MEMBERSHIP_KEY, kind: "membership" as const, name: TIER_LABELS.membership, days: null, amount: s.membership.amount, active: s.membership.active },
  ];
}

const COLUMNS: GridCol<Row>[] = [
  { key: "kind", label: M.searchKind, width: "64px", value: (r) => M.rowKindLabels[r.kind], render: (r) => <span className="text-[12px] text-mut">{M.rowKindLabels[r.kind]}</span> },
  { key: "name", label: M.searchName, width: "minmax(96px,1fr)", value: (r) => r.name || M.newProductName },
  { key: "amount", label: M.fieldPrice, width: "80px", align: "right", value: (r) => r.amount, text: (r) => formatPrice(r.amount) },
  {
    key: "sale",
    label: M.searchSale,
    width: "72px",
    align: "center",
    value: (r) => r.active,
    text: (r) => (r.active ? M.saleLabels.on : M.saleLabels.off),
    render: (r) => <span className={r.active ? "text-acc" : "text-dim"}>{r.active ? M.saleLabels.on : M.saleLabels.off}</span>,
  },
];

function Search({ kind, sale, name, onKind, onSale, onName }: { kind: string; sale: string; name: string; onKind: (v: string) => void; onSale: (v: string) => void; onName: (v: string) => void }) {
  return (
    <SearchBand label={M.searchLabel}>
      <SearchItem label={M.searchKind}>
        <FormSelect
          name="search-kind"
          label={M.searchKind}
          hideLabel
          size="md"
          value={kind}
          onChange={onKind}
          options={[{ value: "all", label: M.searchAll }, ...(["indie", "pin", "both", "membership"] as const).map((k) => ({ value: k, label: M.rowKindLabels[k] }))]}
        />
      </SearchItem>
      <SearchItem label={M.searchSale}>
        <FormSelect
          name="search-sale"
          label={M.searchSale}
          hideLabel
          size="md"
          value={sale}
          onChange={onSale}
          options={[{ value: "all", label: M.searchAll }, { value: "on", label: M.saleLabels.on }, { value: "off", label: M.saleLabels.off }]}
        />
      </SearchItem>
      <SearchItem label={M.searchName} htmlFor="search-name">
        <TextField id="search-name" label={M.searchName} hideLabel value={name} onChange={(e) => onName(e.target.value)} compact />
      </SearchItem>
    </SearchBand>
  );
}

/** 판매가(묶음이면 낱개 합과 할인율). 상품 정보 묶음 안에 선다(2026-10-30 사용자 "판매가는 상품 정보에, 하루 값은 지워") */
function PriceFields({ value, patch, rowKey, errors }: { value: PricingSettings; patch: Patch; rowKey: string; errors: FieldErrors }) {
  const isMembership = rowKey === MEMBERSHIP_KEY;
  const p = value.products.find((x) => x.id === rowKey);
  const amount = isMembership ? value.membership.amount : (p?.amount ?? 0);
  const setAmount = (n: number) =>
    isMembership ? patch((d) => ({ ...d, membership: { ...d.membership, amount: n } })) : patch((d) => ({ ...d, products: d.products.map((x) => (x.id === rowKey ? { ...x, amount: n } : x)) }));
  const list = p && isBundleProduct(p) ? bundleListPrice(value, p) : 0;
  const error = isMembership ? errors["membership.amount"] : errors[`products.${value.products.findIndex((x) => x.id === rowKey)}.amount`];
  return (
    <>
      <Field label={M.fieldPrice} htmlFor="price-amount" required spot={PLAN_SPOTS.amount}>
        <NumberField id="price-amount" label={M.fieldPrice} hideLabel value={amount} onValue={setAmount} error={error} trailing={<span className="pr-2 text-[13px] text-dim">{M.won}</span>} className="text-right tabular-nums" compact />
      </Field>
      {list > 0 && (
        <>
          <Field label={M.fieldBundleList} spot={PLAN_SPOTS.list}>
            <ReadValue align="right">{formatPrice(list)}</ReadValue>
          </Field>
          <Field label={M.fieldRate} spot={PLAN_SPOTS.rate}>
            <ReadValue align="right">{`${discountRate(list, amount)}%`}</ReadValue>
          </Field>
        </>
      )}
    </>
  );
}

function BasicTab({ value, patch, rowKey, errors }: { value: PricingSettings; patch: Patch; rowKey: string; errors: FieldErrors }) {
  if (rowKey === MEMBERSHIP_KEY) {
    const m = value.membership;
    return (
      <FormSection title={M.sectionProduct} labelWidth="84px">
        <Field label={M.fieldCode} wide>
          <CodeName code={MEMBERSHIP_KEY}>
            <ReadValue>{TIER_LABELS.membership}</ReadValue>
          </CodeName>
        </Field>
        <Field label={M.fieldCycle}>
          <ReadValue>{M.cycleMonthly}</ReadValue>
        </Field>
        <Field label={M.fieldCredits} htmlFor="m-credits" required>
          <NumberField id="m-credits" label={M.fieldCredits} hideLabel value={m.boostCredits} onValue={(n) => patch((d) => ({ ...d, membership: { ...d.membership, boostCredits: n } }))} error={errors["membership.boostCredits"]} trailing={<span className="pr-2 text-[13px] text-dim">{M.creditsUnit}</span>} className="text-right tabular-nums" compact />
        </Field>
        <PriceFields value={value} patch={patch} rowKey={rowKey} errors={errors} />
        <Field label={M.fieldSale} spot={PLAN_SPOTS.card}>
          <div className="flex min-h-11 items-center gap-2">
            <Switch on={m.active} label={M.fieldSale} onToggle={() => patch((d) => ({ ...d, membership: { ...d.membership, active: !d.membership.active } }))} />
            <span className="text-[13px] text-mut">{m.active ? M.saleOn : M.saleOff}</span>
          </div>
        </Field>
      </FormSection>
    );
  }
  const p = value.products.find((x) => x.id === rowKey);
  if (!p) return null;
  const set = (next: Partial<CatalogProduct>) => patch((d) => ({ ...d, products: d.products.map((x) => (x.id === p.id ? { ...x, ...next } : x)) }));
  const at = `products.${value.products.indexOf(p)}`;
  return (
    <FormSection title={M.sectionProduct} labelWidth="84px">
      <Field label={M.fieldCode} htmlFor={`name-${p.id}`} required wide>
        <CodeName code={p.id}>
          <TextField id={`name-${p.id}`} label={M.fieldName} hideLabel value={p.name} onChange={(e) => set({ name: e.target.value })} error={errors[`${at}.name`]} compact />
        </CodeName>
      </Field>
      <Field label={M.fieldKind}>
        <ReadValue>{isBundleProduct(p) ? M.kindBundle : M.kindSingle}</ReadValue>
      </Field>
      <Field label={M.colSlots} required>
        <FormSelect
          name={`slots-${p.id}`}
          label={M.colSlots}
          hideLabel
          size="lg"
          value={slotChoiceOf(p.slots)}
          onChange={(v) => {
            const slots = [...SLOT_SETS[v as SlotChoice]];
            // 묶음으로 바꾸면 구성 상품을 같은 기간 낱개로 채워 둔다. 낱개로 돌리면 구성은 뜻이 없어 걷는다
            set({ slots, parts: slots.length > 1 ? defaultBundleParts(value, slots, p.days) : undefined });
          }}
          options={SLOT_CHOICES.map((c) => ({ value: c, label: M.slotChoices[c] }))}
        />
      </Field>
      {isBundleProduct(p) && <PartsField value={value} product={p} set={set} error={errors[`${at}.parts`]} />}
      <Field label={M.fieldDays} htmlFor={`days-${p.id}`} required>
        <NumberField id={`days-${p.id}`} label={M.fieldDays} hideLabel value={p.days} onValue={(n) => set({ days: n })} error={errors[`${at}.days`]} trailing={<span className="pr-2 text-[13px] text-dim">{M.daysUnit}</span>} className="text-right tabular-nums" compact />
      </Field>
      <PriceFields value={value} patch={patch} rowKey={rowKey} errors={errors} />
      <Field label={M.fieldSale} spot={PLAN_SPOTS.card}>
        <div className="flex min-h-11 items-center gap-2">
          <Switch on={p.active} label={M.fieldSale} onToggle={() => set({ active: !p.active })} />
          <span className="text-[13px] text-mut">{p.active ? M.saleOn : M.saleOff}</span>
        </div>
      </Field>
    </FormSection>
  );
}

/**
 * 묶음의 구성 상품 — 자리마다 낱개 상품 하나를 고른다(2026-10-31 사용자 "묶음이면 어떤 상품을 고를지 선택 가능해야").
 * 고른 상품의 값 합이 낱개 합(그을 값)이 된다. 고를 수 있는 것은 그 자리 하나짜리 상품뿐이다 — 판매 중지 상품도 고를 수 있게 둔다(기간 한정으로 잠시 끈 낱개)
 */
function PartsField({ value, product, set, error }: { value: PricingSettings; product: CatalogProduct; set: (next: Partial<CatalogProduct>) => void; error?: string }) {
  const pick = (slot: CatalogProduct["slots"][number]) => {
    const singles = value.products.filter((x) => !isBundleProduct(x) && x.slots[0] === slot);
    const current = singles.find((x) => product.parts?.includes(x.id))?.id ?? "";
    return (
      <FormSelect
        name={`part-${product.id}-${slot}`}
        label={M.partSlot[slot]}
        hideLabel
        size="lg"
        value={current}
        onChange={(id) => set({ parts: product.slots.map((s) => (s === slot ? id : (value.products.find((x) => product.parts?.includes(x.id) && x.slots[0] === s && !isBundleProduct(x))?.id ?? ""))).filter(Boolean) })}
        // 아직 안 골랐으면(구성 상품을 지운 뒤) 빈 칸을 첫 줄로 둔다 — 고르기 칸이 아무 상품이나 골라 둔 것처럼 보이지 않게
        options={[...(current ? [] : [{ value: "", label: M.partNone }]), ...singles.map((x) => ({ value: x.id, label: M.partOption(x.name, x.days, formatPrice(x.amount)) }))]}
      />
    );
  };
  return (
    <Field label={M.fieldParts} required wide error={error}>
      <FieldPair joiner="+" from={pick("indie_top")} to={pick("promo_pin")} />
    </Field>
  );
}

/** 이 상품에 걸린 프로모션. 고치는 곳은 프로모션등록이라 여기서는 보기만 한다 */
function PromosSection({ value, rowKey }: { value: PricingSettings; rowKey: string }) {
  const promos = value.promotions.filter((x) => x.target === rowKey);
  const now = new Date();
  return (
    <>
      <FormSection
        title={M.sectionPromos}
        action={
          <ProgramLink href={ROUTES.adminDiscounts}>{ADMIN_NAV.discounts}</ProgramLink>
        }
      >
        {promos.length === 0 ? (
          <p className={cn("text-[13px] text-dim", FULL_ROW)}>{M.promosNone}</p>
        ) : (
          <ul className={cn("flex flex-col gap-1.5", FULL_ROW)}>
            {promos.map((x) => {
              const status = promotionStatus(x, now);
              return (
                <li key={x.id} className="flex flex-wrap items-center gap-2 text-[13px]">
                  <StatusTag status={status} />
                  <span className="font-semibold text-ink">{x.label}</span>
                  <span className="text-mut">{x.kind === "percent" ? M.dealPercent(x.value) : M.dealPrice(formatPrice(x.value))}</span>
                  <span className="text-dim">{M.audienceLabels[x.audience]}</span>
                </li>
              );
            })}
          </ul>
        )}
      </FormSection>
    </>
  );
}

/** saved: 마지막 저장 값. 목록 줄의 신규, 수정 표시(백오피스 cwareAction)에 쓴다 */
export function CatalogScreen({ value, saved, errors, patch, selected, onSelect }: { value: PricingSettings; saved: PricingSettings; errors: FieldErrors; patch: Patch; selected: string | null; onSelect: (key: string) => void }) {
  const [kind, setKind] = useState("all");
  const [sale, setSale] = useState("all");
  const [name, setName] = useState("");
  const all = rowsOf(value);
  const savedRows = new Map(rowsOf(saved).map((r) => [r.key, JSON.stringify(r)]));
  const savedKeys = new Set(savedRows.keys());
  const changedKeys = new Set(all.filter((r) => savedRows.has(r.key) && savedRows.get(r.key) !== JSON.stringify(r)).map((r) => r.key));
  const rows = all.filter((r) => (kind === "all" || r.kind === kind) && (sale === "all" || (sale === "on") === r.active) && (!name.trim() || r.name.includes(name.trim())));
  const current = all.find((r) => r.key === selected) ?? null;
  const tier = tierOfKey(value, current?.key ?? null);

  return (
    <div className="flex flex-col gap-3">
      <Search kind={kind} sale={sale} name={name} onKind={setKind} onSale={setSale} onName={setName} />
      <MasterDetail
        list={
          <DataGrid
            label={M.listLabel}
            columns={COLUMNS}
            rows={rows}
            rowKey={(r) => r.key}
            fileKey={(r) => ({ code: r.key, name: r.name })}
            selected={selected}
            onSelect={onSelect}
            autoSelectFirst
            rowState={(r) => {
              const at = r.key === MEMBERSHIP_KEY ? "membership" : `products.${value.products.findIndex((p) => p.id === r.key)}`;
              if (hasErrorUnder(errors, at)) return "error";
              return r.key === MEMBERSHIP_KEY ? (changedKeys.has(r.key) ? "changed" : undefined) : !savedKeys.has(r.key) ? "new" : changedKeys.has(r.key) ? "changed" : undefined;
            }}
            rowTone={(r) => (r.active ? undefined : "muted")}
            empty={M.listEmpty}
            fit
          />
        }
        detail={
          current ? (
            <div className="flex flex-col gap-2">
              <p className="flex items-baseline gap-2 px-1">
                <span className={cn("text-[16px] font-extrabold text-ink", !current.active && "text-dim")}>{current.name || M.newProductName}</span>
                <span className="text-[12px] text-dim">{M.rowKindLabels[current.kind]}</span>
              </p>
              {/* 탭을 걷고 묶음을 쌓는다 — 탭 셋에 칸이 몇 개뿐이라 탭은 칸을 숨기고 누를 일만 늘렸다(2026-10-30 사용자). 미리 보기는 옆 기둥 그대로 */}
              <WithAside aside={<PricingPreview value={value} tier={tier} />}>
                <BasicTab value={value} patch={patch} rowKey={current.key} errors={errors} />
                <PromosSection value={value} rowKey={current.key} />
                <FormSection title={M.tabCopy} labelWidth="88px">
                  <div className={cn("flex min-w-0 flex-col gap-2", FULL_ROW)}>
                    <CopySection value={value} patch={patch} tier={tier} onTier={() => {}} errors={errors} bare />
                  </div>
                </FormSection>
              </WithAside>
            </div>
          ) : (
            <p className="rounded-xl bg-surface-2 px-4 py-6 text-center text-[13px] text-dim">{M.pickHint}</p>
          )
        }
      />
    </div>
  );
}
