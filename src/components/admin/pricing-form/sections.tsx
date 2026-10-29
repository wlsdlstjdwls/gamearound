"use client";
// 요금 설정 폼의 값과 판매 판(PricesSection)과 판 껍데기(Panel). 상태는 바깥(pricing-form)이 쥐고 patch 로 고친다.
// 값 칸은 숫자만 받는다(ui/number-field — 치는 동안은 친 글 그대로라 Ctrl+Z 가 먹는다). 범위 검증은 저장 단추가 같은 스키마로 한 번에 한다.
// 2026-10-29(사용자 "설정하기 이쁘게"): 상품은 광고(7일), 구독(매달) 두 묶음으로 가른다. 카드 문구 판은 copy-section 으로 뗐다.
// 같은 날 둘째 손질(사용자 "판매 상품 영역이 불필요한 공백이 많고 컴팩트하지 않다"): 묶음 판 둘을 표 한 장으로 접었다.
// 상품 이름이 왼쪽 끝, 값 칸이 오른쪽 끝에 떨어져 넓은 화면에서 줄 가운데가 비었고, 멤버십 이용권 칸은 따로 한 단을 먹었다.
// 이제 한 줄에 상품, 기간, 값, 이용권, 판매가 붙어 선다. 넓은 화면에서도 표 폭을 묶어(max-w) 눈이 줄 끝까지 가지 않게 한다.
// 같은 날 저녁(사용자 "추가도 안 되고 이게 뭐야", "자유롭게 상품을 추가하고 삭제"): 광고 상품이 관리자가 만드는 목록이 됐다(lib/pricing/settings).
// 신세계TV 백오피스 그리드 문법을 따른다 — 표 머리 오른쪽에 "상품 추가", 줄 끝에 지우기, 새 줄과 바뀐 줄은 저장 전까지 꼬리표로 표시.
// 이름, 자리, 기간, 값, 판매를 줄 안에서 바로 고친다(줄을 눌러 따로 여는 판을 두지 않는다 — 칸 다섯이라 한 줄에 다 선다).
// 멤버십은 지우거나 더하는 상품이 아니라 맨 아래 고정 줄이다. 자리 칸 자리에 "매달 이용권" 을 둔다.
import type { Patch } from "@/components/admin/pricing-form";
import { sectionCardClass } from "@/components/ui/page";
import { cn } from "@/lib/cn";
import { Switch } from "@/components/ui/switch";
import { NumberField } from "@/components/ui/number-field";
import { PRICING_ADMIN_MESSAGES as M, SLOT_CHOICES, slotChoiceOf, TIER_LABELS, type SlotChoice } from "@/lib/pricing/admin-messages";
import { MAX_PRODUCTS, MEMBERSHIP_KEY, type CatalogProduct, type PricingSettings } from "@/lib/pricing/settings";
import { TextField } from "@/components/ui/text-field";
import { FormSelect } from "@/components/ui/select/fields";
import { Button } from "@/components/ui/button";
import { PlusIcon, XIcon } from "@/components/ui/icons";

type SectionProps = { value: PricingSettings; patch: Patch };
/** saved: 마지막으로 저장한 값. 줄마다 바뀐 것을 표시하는 데 쓴다 */
type PricesProps = SectionProps & { saved: PricingSettings };

/** count: 제목 옆 건수(백오피스 목록 머리의 "전체 N건") */
/** action: 제목 줄 오른쪽 끝 단추(백오피스 그리드 머리의 행 추가 자리). lead 를 비우면 설명 줄을 안 그린다 */
export function Panel({ title, count, lead, action, children }: { title: string; count?: number; lead?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className={sectionCardClass("flex flex-col gap-3")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="flex items-baseline gap-1.5 text-[15px] font-bold text-ink">
            {title}
            {count !== undefined && <span className="text-[13px] font-semibold tabular-nums text-acc">{count}</span>}
          </h2>
          {lead && <p className="text-[12.5px] leading-[1.6] text-dim">{lead}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** 표의 칸 폭. 머리 줄과 몸 줄이 같은 틀을 써야 칸이 세로로 맞는다. 상품, 자리, 기간, 값, 판매, 지우기 */
const ROW_GRID = "sm:grid sm:grid-cols-[minmax(0,1fr)_176px_92px_132px_52px_36px] sm:items-center sm:gap-2.5";

/** 새 상품의 첫 값. 지금 파는 낱개와 같은 꼴(인디 목록 7일)로 시작해 관리자가 고친다. 판매는 꺼 둔다 — 반쯤 만든 상품이 바로 팔리지 않게 */
const NEW_PRODUCT: Omit<CatalogProduct, "id" | "name"> = { slots: ["indie_top"], days: 7, amount: 6_900, active: false };

function newProductId(): string {
  return `ad-${crypto.randomUUID().slice(0, 8)}`;
}

/** 상품 한 줄을 더한 설정. 표 머리의 상품 추가와 화면 툴바의 입력(F8)이 같이 쓴다 */
export function withNewProduct(d: PricingSettings): PricingSettings {
  return { ...d, products: [...d.products, { ...NEW_PRODUCT, slots: [...NEW_PRODUCT.slots], id: newProductId(), name: M.newProductName }] };
}

const SLOT_SETS: Record<SlotChoice, CatalogProduct["slots"]> = { indie: ["indie_top"], pin: ["promo_pin"], both: ["indie_top", "promo_pin"] };

type Mark = "new" | "changed" | null;

/** 줄의 꼬리표 — 새 줄, 바뀐 줄. 저장 전에 무엇을 고쳤는지 훑게 한다(백오피스의 변경 행 표시) */
function RowMark({ kind }: { kind: Mark }) {
  if (!kind) return null;
  return <span className="shrink-0 rounded-full bg-acc px-1.5 py-px text-[10.5px] font-bold text-on-ink">{kind === "new" ? M.newRow : M.changed}</span>;
}

function rowClass(mark: Mark) {
  return cn(
    "-mx-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-2 rounded-lg border-t border-line-soft px-2 py-2 transition-colors first:border-t-0",
    ROW_GRID,
    mark && "bg-acc-soft/60",
  );
}

function ProductRow({ p, mark, onChange, onRemove }: { p: CatalogProduct; mark: Mark; onChange: (next: CatalogProduct) => void; onRemove: () => void }) {
  const toggle = <Switch on={p.active} label={`${p.name} ${M.onSale}`} onToggle={() => onChange({ ...p, active: !p.active })} />;
  return (
    <li className={rowClass(mark)}>
      <div className="flex min-w-0 items-center gap-1.5">
        <TextField label={M.colProduct} hideLabel value={p.name} onChange={(e) => onChange({ ...p, name: e.target.value })} compact wrapperClassName="min-w-0 flex-1" />
        <RowMark kind={mark} />
      </div>
      {/* 좁은 화면은 판매 단추가 이름 옆에 선다 */}
      <div className="col-start-2 row-start-1 flex justify-end sm:hidden">{toggle}</div>
      <FormSelect
        name={`slots-${p.id}`}
        label={`${p.name} ${M.colSlots}`}
        hideLabel
        size="md"
        value={slotChoiceOf(p.slots)}
        onChange={(v) => onChange({ ...p, slots: [...SLOT_SETS[v as SlotChoice]] })}
        options={SLOT_CHOICES.map((c) => ({ value: c, label: M.slotChoices[c] }))}
        className="col-span-2 sm:col-span-1"
      />
      <NumberField
        label={`${p.name} ${M.colCycle}`}
        hideLabel
        value={p.days}
        onValue={(n) => onChange({ ...p, days: n })}
        trailing={<span className="pr-2 text-[13px] text-dim">{M.daysUnit}</span>}
        className="text-right tabular-nums"
        compact
      />
      <NumberField
        label={`${p.name} ${M.colPrice}`}
        hideLabel
        value={p.amount}
        onValue={(n) => onChange({ ...p, amount: n })}
        trailing={<span className="pr-2 text-[13px] text-dim">{M.won}</span>}
        className="text-right tabular-nums"
        compact
      />
      <div className="hidden justify-center sm:flex">{toggle}</div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={M.removeProduct(p.name)}
        className="press tap col-span-2 inline-flex h-9 items-center justify-center gap-1 rounded-lg text-[12.5px] text-dim transition-colors duration-fast hover:bg-danger-soft hover:text-danger sm:col-span-1 sm:size-9"
      >
        <XIcon size={16} />
        <span aria-hidden className="sm:hidden">
          {M.remove}
        </span>
      </button>
    </li>
  );
}

function MembershipRow({ value, saved, patch }: PricesProps) {
  const m = value.membership;
  const changed = m.amount !== saved.membership.amount || m.active !== saved.membership.active || m.boostCredits !== saved.membership.boostCredits;
  const toggle = (
    <Switch on={m.active} label={`${TIER_LABELS.membership} ${M.onSale}`} onToggle={() => patch((d) => ({ ...d, membership: { ...d.membership, active: !d.membership.active } }))} />
  );
  return (
    <li className={rowClass(changed ? "changed" : null)}>
      <p className={cn("flex items-center gap-1.5 px-1 text-[14px] font-semibold", m.active ? "text-ink" : "text-dim")}>
        {TIER_LABELS.membership}
        <RowMark kind={changed ? "changed" : null} />
      </p>
      <div className="col-start-2 row-start-1 flex justify-end sm:hidden">{toggle}</div>
      {/* 멤버십은 자리 대신 매달 주는 이용권 수를 고친다 */}
      <div className="col-span-2 sm:col-span-1">
        <NumberField
          label={`${TIER_LABELS.membership} ${M.colCredits}`}
          hideLabel
          value={m.boostCredits}
          onValue={(n) => patch((d) => ({ ...d, membership: { ...d.membership, boostCredits: n } }))}
          leading={<span className="whitespace-nowrap pl-3 text-[12.5px] text-dim">{M.colCredits}</span>}
          trailing={<span className="pr-2 text-[13px] text-dim">{M.creditsUnit}</span>}
          className="text-right tabular-nums"
          compact
        />
      </div>
      <span className="hidden px-1 text-right text-[13px] text-dim sm:block">{M.cycleMonthly}</span>
      <NumberField
        label={`${TIER_LABELS.membership} ${M.colPrice}`}
        hideLabel
        value={m.amount}
        onValue={(n) => patch((d) => ({ ...d, membership: { ...d.membership, amount: n } }))}
        trailing={<span className="pr-2 text-[13px] text-dim">{M.won}</span>}
        className="text-right tabular-nums"
        compact
      />
      <div className="hidden justify-center sm:flex">{toggle}</div>
      <span aria-hidden className="hidden sm:block" />
    </li>
  );
}

export function PricesSection({ value, saved, patch }: PricesProps) {
  const savedById = new Map(saved.products.map((p) => [p.id, p]));
  const markOf = (p: CatalogProduct): Mark => {
    const before = savedById.get(p.id);
    if (!before) return "new";
    return JSON.stringify(before) === JSON.stringify(p) ? null : "changed";
  };
  const update = (id: string, next: CatalogProduct) => patch((d) => ({ ...d, products: d.products.map((x) => (x.id === id ? next : x)) }));
  // 지우면 그 상품을 겨눈 프로모션도 같이 지운다 — 남겨 두면 걸 데 없는 할인이라 저장이 막힌다(settings 스키마). 되돌리기로 둘 다 살아난다
  const remove = (id: string) => patch((d) => ({ ...d, products: d.products.filter((x) => x.id !== id), promotions: d.promotions.filter((x) => x.target !== id) }));
  const add = () => patch(withNewProduct);
  const removed = saved.products.filter((p) => !value.products.some((x) => x.id === p.id)).length;
  const full = value.products.length >= MAX_PRODUCTS;

  return (
    <Panel
      title={M.pricesTitle}
      count={value.products.length + 1}
      lead={M.pricesLead}
      action={
        <Button variant="secondary" size="sm" onClick={add} disabled={full} className="shrink-0">
          <PlusIcon size={15} />
          {M.addProduct}
        </Button>
      }
    >
      <div className="max-w-[920px]">
        <div aria-hidden className={cn("hidden border-b border-line pb-1.5 text-[12px] font-semibold text-mut", ROW_GRID)}>
          <span>{M.colProduct}</span>
          <span>{M.colSlots}</span>
          <span className="text-right">{M.colCycle}</span>
          <span className="text-right">{M.colPrice}</span>
          <span className="text-center">{M.onSale}</span>
          <span />
        </div>
        <ul>
          {value.products.map((p) => (
            <ProductRow key={p.id} p={p} mark={markOf(p)} onChange={(next) => update(p.id, next)} onRemove={() => remove(p.id)} />
          ))}
          {value.products.length === 0 && <li className="py-4 text-center text-[13px] text-dim">{M.productsEmpty}</li>}
          <MembershipRow value={value} saved={saved} patch={patch} />
        </ul>
        <p className="mt-1.5 text-[12px] text-dim">
          {removed > 0 && <span className="mr-2 font-semibold text-danger">{M.removedNote(removed)}</span>}
          {full ? M.productsFull(MAX_PRODUCTS) : M.membershipNote}
        </p>
      </div>
    </Panel>
  );
}

/** 프로모션 대상 고르기와 줄 머리가 쓰는 이름. 광고 상품은 관리자가 지은 이름, 멤버십은 고정 이름. 지운 상품은 그 사실을 말한다 */
export function targetLabel(s: PricingSettings, id: string): string {
  if (id === MEMBERSHIP_KEY) return TIER_LABELS.membership;
  return s.products.find((p) => p.id === id)?.name ?? M.goneProduct;
}
