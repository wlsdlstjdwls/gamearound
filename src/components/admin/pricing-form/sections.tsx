"use client";
// 요금 설정 폼의 값과 판매 판(PricesSection)과 판 껍데기(Panel). 상태는 바깥(pricing-form)이 쥐고 patch 로 고친다.
// 값 칸은 숫자만 받는다(ui/number-field — 치는 동안은 친 글 그대로라 Ctrl+Z 가 먹는다). 범위 검증은 저장 단추가 같은 스키마로 한 번에 한다.
// 2026-10-29(사용자 "설정하기 이쁘게"): 상품은 광고(7일), 구독(매달) 두 묶음으로 가른다. 카드 문구 판은 copy-section 으로 뗐다.
// 같은 날 둘째 손질(사용자 "판매 상품 영역이 불필요한 공백이 많고 컴팩트하지 않다"): 묶음 판 둘을 표 한 장으로 접었다.
// 상품 이름이 왼쪽 끝, 값 칸이 오른쪽 끝에 떨어져 넓은 화면에서 줄 가운데가 비었고, 멤버십 이용권 칸은 따로 한 단을 먹었다.
// 이제 한 줄에 상품, 기간, 값, 이용권, 판매가 붙어 선다. 넓은 화면에서도 표 폭을 묶어(max-w) 눈이 줄 끝까지 가지 않게 한다.
import type { Patch } from "@/components/admin/pricing-form";
import { sectionCardClass } from "@/components/ui/page";
import { cn } from "@/lib/cn";
import { Switch } from "@/components/ui/switch";
import { NumberField } from "@/components/ui/number-field";
import { PRICED_KEY_LABELS, PRICING_ADMIN_MESSAGES as M, TIER_LABELS } from "@/lib/pricing/admin-messages";
import type { PricingSettings } from "@/lib/pricing/settings";

type SectionProps = { value: PricingSettings; patch: Patch };
/** saved: 마지막으로 저장한 값. 줄마다 바뀐 것을 표시하는 데 쓴다 */
type PricesProps = SectionProps & { saved: PricingSettings };

/** count: 제목 옆 건수(백오피스 목록 머리의 "전체 N건") */
export function Panel({ title, count, lead, children }: { title: string; count?: number; lead: string; children: React.ReactNode }) {
  return (
    <section className={sectionCardClass("flex flex-col gap-3")}>
      <div className="flex flex-col gap-0.5">
        <h2 className="flex items-baseline gap-1.5 text-[15px] font-bold text-ink">
          {title}
          {count !== undefined && <span className="text-[13px] font-semibold tabular-nums text-acc">{count}</span>}
        </h2>
        <p className="text-[12.5px] leading-[1.6] text-dim">{lead}</p>
      </div>
      {children}
    </section>
  );
}

/** 표의 칸 폭. 머리 줄과 몸 줄이 같은 틀을 써야 칸이 세로로 맞는다 */
const ROW_GRID = "sm:grid sm:grid-cols-[minmax(0,1fr)_56px_148px_116px_72px] sm:items-center sm:gap-3";

// 값 칸 이름표는 감추고 단위를 칸 안에 둔다(2026-10-28, 컴팩트 회차). 낭독기에는 "OO 값" 으로 읽힌다.
// 좁은 화면은 표가 아니라 줄마다 두 단(이름 | 판매, 값 | 이용권)으로 접는다
function PriceRow({
  label,
  cycle,
  amount,
  active,
  onAmount,
  onActive,
  credits,
  changed,
}: {
  label: string;
  cycle: string;
  amount: number;
  active: boolean;
  onAmount: (n: number) => void;
  onActive: () => void;
  credits?: { value: number; onChange: (n: number) => void };
  /** 저장 전 바뀐 줄. 옅은 파랑 바탕과 꼬리표로 무엇을 고쳤는지 저장 전에 훑게 한다(백오피스의 변경 행 표시) */
  changed: boolean;
}) {
  return (
    <li className={cn("-mx-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-lg border-t border-line-soft px-2 py-2.5 transition-colors first:border-t-0", ROW_GRID, changed && "bg-acc-soft/60")}>
      <p className={cn("flex items-center gap-1.5 text-[14px] font-semibold", active ? "text-ink" : "text-dim")}>
        {label}
        {changed && <span className="rounded-full bg-acc px-1.5 py-px text-[10.5px] font-bold text-on-ink">{M.changed}</span>}
      </p>
      <span className="hidden text-[13px] text-dim sm:block">{cycle}</span>
      <div className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto">
        <NumberField
          label={`${label} ${M.colPrice}`}
          hideLabel
          value={amount}
          onValue={onAmount}
          trailing={<span className="pr-2 text-[13px] text-dim">{M.won}</span>}
          className="text-right tabular-nums"
          compact
        />
      </div>
      <div className="col-span-2 row-start-3 sm:col-span-1 sm:row-start-auto">
        {credits ? (
          <NumberField
            label={`${label} ${M.colCredits}`}
            hideLabel
            value={credits.value}
            onValue={credits.onChange}
            trailing={<span className="pr-2 text-[13px] text-dim">{M.creditsUnit}</span>}
            className="text-right tabular-nums"
            compact
          />
        ) : (
          <span aria-hidden className="hidden text-center text-[13px] text-dim-2 sm:block">
            -
          </span>
        )}
      </div>
      <div className="col-start-2 row-start-1 flex justify-end sm:col-start-auto sm:row-start-auto sm:justify-center">
        <Switch on={active} label={`${label} ${M.onSale}`} onToggle={onActive} />
      </div>
    </li>
  );
}

export function PricesSection({ value, saved, patch }: PricesProps) {
  const product = (key: keyof PricingSettings["products"]) => (
    <PriceRow
      key={key}
      label={PRICED_KEY_LABELS[key]}
      cycle={M.cycleAds}
      amount={value.products[key].amount}
      active={value.products[key].active}
      onAmount={(n) => patch((d) => ({ ...d, products: { ...d.products, [key]: { ...d.products[key], amount: n } } }))}
      onActive={() => patch((d) => ({ ...d, products: { ...d.products, [key]: { ...d.products[key], active: !d.products[key].active } } }))}
      changed={value.products[key].amount !== saved.products[key].amount || value.products[key].active !== saved.products[key].active}
    />
  );
  return (
    <Panel title={M.pricesTitle} lead={M.pricesLead}>
      <div className="max-w-[760px]">
        <div aria-hidden className={cn("hidden border-b border-line pb-1.5 text-[12px] font-semibold text-mut", ROW_GRID)}>
          <span>{M.colProduct}</span>
          <span>{M.colCycle}</span>
          <span className="text-right">{M.colPrice}</span>
          <span className="text-right">{M.colCredits}</span>
          <span className="text-center">{M.onSale}</span>
        </div>
        <ul>
          {product("boost_indie_7d")}
          {product("pin_promo_7d")}
          {product("bundle_7d")}
          <PriceRow
            label={TIER_LABELS.membership}
            cycle={M.cycleMonthly}
            amount={value.membership.amount}
            active={value.membership.active}
            onAmount={(n) => patch((d) => ({ ...d, membership: { ...d.membership, amount: n } }))}
            onActive={() => patch((d) => ({ ...d, membership: { ...d.membership, active: !d.membership.active } }))}
            credits={{ value: value.membership.boostCredits, onChange: (n) => patch((d) => ({ ...d, membership: { ...d.membership, boostCredits: n } })) }}
            changed={value.membership.amount !== saved.membership.amount || value.membership.active !== saved.membership.active || value.membership.boostCredits !== saved.membership.boostCredits}
          />
        </ul>
        <p className="mt-1 text-[12px] text-dim">{M.membershipNote}</p>
      </div>
    </Panel>
  );
}
