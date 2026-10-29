"use client";
// 상품등록 화면 본문(2026-10-29 밤, 사용자 "메뉴랑 버튼만 가져다 두고 화면 구성은 그대로네").
// 신세계TV 백오피스 상품등록 꼴: 위 조회조건, 왼쪽 상품 목록(판매중지는 흐리게), 오른쪽 고른 상품의 상세 탭(기초정보, 가격정보, 카드문구).
// 앞 판은 판매 상품 표 한 장에 모든 칸을 늘어놓고 카드 문구 판을 그 아래 따로 두었다 — 어느 문구가 어느 상품 것인지 이어지지 않았다.
// 이제 상품을 고르면 그 상품의 이름, 자리, 기간, 판매, 값, 걸린 프로모션, 카드 문구가 한 자리에 모인다.
// 멤버십은 지우거나 더하는 상품이 아니라 목록 맨 아래 고정 줄이다. 상태는 바깥(pricing-form)이 쥐고 patch 로 고친다.
import Link from "next/link";
import { useState } from "react";
import type { Patch } from "@/components/admin/pricing-form";
import { CopySection } from "@/components/admin/pricing-form/copy-section";
import { PricingPreview } from "@/components/admin/pricing-form/preview";
import { Field, FormSection, MasterDetail, ReadValue, ScreenTabs, SearchBand, SearchItem } from "@/components/admin/screen/layout";
import { DataGrid, type GridCol } from "@/components/admin/screen/data-grid";
import { buttonClass } from "@/components/ui/button";
import { NumberField } from "@/components/ui/number-field";
import { FormSelect } from "@/components/ui/select/fields";
import { Switch } from "@/components/ui/switch";
import { Tag } from "@/components/ui/tag";
import { TextField } from "@/components/ui/text-field";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/currency";
import { ROUTES } from "@/lib/routes";
import { PRICING_ADMIN_MESSAGES as M, SLOT_CHOICES, slotChoiceOf, TIER_LABELS, type SlotChoice } from "@/lib/pricing/admin-messages";
import { bundleListPrice, discountRate, perDay, promotionPhase } from "@/lib/pricing/quote";
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
  { key: "kind", label: M.searchKind, width: "72px", value: (r) => M.rowKindLabels[r.kind], render: (r) => <span className="text-[12px] text-mut">{M.rowKindLabels[r.kind]}</span> },
  { key: "name", label: M.searchName, width: "minmax(120px,1fr)", value: (r) => r.name || M.newProductName },
  { key: "days", label: M.fieldDays, width: "52px", align: "right", value: (r) => r.days, text: (r) => (r.days === null ? M.cycleMonthly : `${r.days}${M.daysUnit}`) },
  { key: "amount", label: M.fieldPrice, width: "80px", align: "right", value: (r) => r.amount, text: (r) => formatPrice(r.amount) },
  {
    key: "sale",
    label: M.searchSale,
    width: "48px",
    align: "center",
    value: (r) => r.active,
    text: (r) => (r.active ? M.saleLabels.on : M.saleLabels.off),
    render: (r) => <span className={r.active ? "text-ok" : "text-dim"}>{r.active ? M.saleLabels.on : M.saleLabels.off}</span>,
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

function BasicTab({ value, patch, rowKey }: { value: PricingSettings; patch: Patch; rowKey: string }) {
  if (rowKey === MEMBERSHIP_KEY) {
    const m = value.membership;
    return (
      <FormSection title={M.sectionProduct}>
        <Field label={M.fieldCode}>
          <ReadValue>{MEMBERSHIP_KEY}</ReadValue>
        </Field>
        <Field label={M.fieldName}>
          <ReadValue>{TIER_LABELS.membership}</ReadValue>
        </Field>
        <Field label={M.fieldCycle}>
          <ReadValue>{M.cycleMonthly}</ReadValue>
        </Field>
        <Field label={M.fieldCredits} htmlFor="m-credits" required hint={M.membershipNote}>
          <NumberField id="m-credits" label={M.fieldCredits} hideLabel value={m.boostCredits} onValue={(n) => patch((d) => ({ ...d, membership: { ...d.membership, boostCredits: n } }))} trailing={<span className="pr-2 text-[13px] text-dim">{M.creditsUnit}</span>} className="text-right tabular-nums" compact />
        </Field>
        <Field label={M.fieldSale}>
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
  return (
    <FormSection title={M.sectionProduct}>
      <Field label={M.fieldCode}>
        <ReadValue>{p.id}</ReadValue>
      </Field>
      <Field label={M.fieldName} htmlFor={`name-${p.id}`} required>
        <TextField id={`name-${p.id}`} label={M.fieldName} hideLabel value={p.name} onChange={(e) => set({ name: e.target.value })} compact />
      </Field>
      <Field label={M.colSlots} required>
        <FormSelect
          name={`slots-${p.id}`}
          label={M.colSlots}
          hideLabel
          size="lg"
          value={slotChoiceOf(p.slots)}
          onChange={(v) => set({ slots: [...SLOT_SETS[v as SlotChoice]] })}
          options={SLOT_CHOICES.map((c) => ({ value: c, label: M.slotChoices[c] }))}
        />
      </Field>
      <Field label={M.fieldKind}>
        <ReadValue>{isBundleProduct(p) ? M.kindBundle : M.kindSingle}</ReadValue>
      </Field>
      <Field label={M.fieldDays} htmlFor={`days-${p.id}`} required>
        <NumberField id={`days-${p.id}`} label={M.fieldDays} hideLabel value={p.days} onValue={(n) => set({ days: n })} trailing={<span className="pr-2 text-[13px] text-dim">{M.daysUnit}</span>} className="text-right tabular-nums" compact />
      </Field>
      <Field label={M.fieldSale}>
        <div className="flex min-h-11 items-center gap-2">
          <Switch on={p.active} label={M.fieldSale} onToggle={() => set({ active: !p.active })} />
          <span className="text-[13px] text-mut">{p.active ? M.saleOn : M.saleOff}</span>
        </div>
      </Field>
    </FormSection>
  );
}

function PriceTab({ value, patch, rowKey }: { value: PricingSettings; patch: Patch; rowKey: string }) {
  const isMembership = rowKey === MEMBERSHIP_KEY;
  const p = value.products.find((x) => x.id === rowKey);
  const amount = isMembership ? value.membership.amount : (p?.amount ?? 0);
  const setAmount = (n: number) =>
    isMembership ? patch((d) => ({ ...d, membership: { ...d.membership, amount: n } })) : patch((d) => ({ ...d, products: d.products.map((x) => (x.id === rowKey ? { ...x, amount: n } : x)) }));
  const list = p && isBundleProduct(p) ? bundleListPrice(value, p) : 0;
  const promos = value.promotions.filter((x) => x.target === rowKey);
  const now = new Date();
  return (
    <>
      <FormSection title={M.sectionPrice}>
        <Field label={M.fieldPrice} htmlFor="price-amount" required hint={M.priceHint}>
          <NumberField id="price-amount" label={M.fieldPrice} hideLabel value={amount} onValue={setAmount} trailing={<span className="pr-2 text-[13px] text-dim">{M.won}</span>} className="text-right tabular-nums" compact />
        </Field>
        {p && (
          <Field label={M.fieldPerDay}>
            <ReadValue align="right">{formatPrice(perDay(amount, p.days))}</ReadValue>
          </Field>
        )}
        {list > 0 && (
          <>
            <Field label={M.fieldBundleList}>
              <ReadValue align="right">{formatPrice(list)}</ReadValue>
            </Field>
            <Field label={M.fieldRate}>
              <ReadValue align="right">{`${discountRate(list, amount)}%`}</ReadValue>
            </Field>
          </>
        )}
      </FormSection>
      <FormSection
        title={M.sectionPromos}
        action={
          <Link href={ROUTES.adminDiscounts} className={buttonClass({ variant: "secondary", size: "sm" })}>
            {M.promosEdit}
          </Link>
        }
      >
        {promos.length === 0 ? (
          <p className="text-[13px] text-dim @2xl:col-span-2">{M.promosNone}</p>
        ) : (
          <ul className="flex flex-col gap-1.5 @2xl:col-span-2">
            {promos.map((x) => {
              const phase = promotionPhase(x, now);
              return (
                <li key={x.id} className="flex flex-wrap items-center gap-2 text-[13px]">
                  <Tag tone={phase === "live" ? "ok" : phase === "upcoming" ? "acc" : "neutral"}>{M.phaseLabels[phase]}</Tag>
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
export function CatalogScreen({ value, saved, patch, selected, onSelect }: { value: PricingSettings; saved: PricingSettings; patch: Patch; selected: string | null; onSelect: (key: string) => void }) {
  const [kind, setKind] = useState("all");
  const [sale, setSale] = useState("all");
  const [name, setName] = useState("");
  const [tab, setTab] = useState("basic");
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
            selected={selected}
            onSelect={onSelect}
            autoSelectFirst
            rowState={(r) => (r.key === MEMBERSHIP_KEY ? (changedKeys.has(r.key) ? "changed" : undefined) : !savedKeys.has(r.key) ? "new" : changedKeys.has(r.key) ? "changed" : undefined)}
            rowTone={(r) => (r.active ? undefined : "muted")}
            empty={M.listEmpty}
            maxHeight="calc(100svh - var(--header-h) - 300px)"
          />
        }
        detail={
          current ? (
            <div className="flex flex-col gap-2">
              <p className="flex items-baseline gap-2 px-1">
                <span className={cn("text-[16px] font-extrabold text-ink", !current.active && "text-dim")}>{current.name || M.newProductName}</span>
                <span className="text-[12px] text-dim">{M.rowKindLabels[current.kind]}</span>
              </p>
              <ScreenTabs
                label={M.listLabel}
                active={tab}
                onChange={setTab}
                // 미리 보기는 어느 탭에서나 보인다(2026-10-30, 사용자 "탭 이동해야지만 보이네") — 값 탭에서 고친 금액도 바로 카드에 뜬다
                aside={<PricingPreview value={value} tier={tier} />}
                tabs={[
                  { key: "basic", label: M.tabBasic, panel: <BasicTab value={value} patch={patch} rowKey={current.key} /> },
                  { key: "price", label: M.tabPrice, panel: <PriceTab value={value} patch={patch} rowKey={current.key} /> },
                  {
                    key: "copy",
                    label: M.tabCopy,
                    panel: (
                      <div className="flex min-w-0 flex-col gap-2">
                        <p className="text-[12.5px] text-dim">{M.copyFor(TIER_LABELS[tier])}</p>
                        <CopySection value={value} patch={patch} tier={tier} onTier={() => {}} bare />
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          ) : (
            <p className="rounded-xl bg-surface-2 px-4 py-6 text-center text-[13px] text-dim">{M.pickHint}</p>
          )
        }
      />
    </div>
  );
}
