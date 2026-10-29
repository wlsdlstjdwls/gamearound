"use client";
// 요금 설정 폼의 값과 판매 판(PricesSection)과 판 껍데기(Panel). 상태는 바깥(pricing-form)이 쥐고 patch 로 고친다.
// 값 칸은 숫자만 받는다(친 글에서 숫자만 남긴다). 범위 검증은 저장 단추가 같은 스키마로 한 번에 한다.
// 2026-10-29(사용자 "설정하기 이쁘게"): 상품은 광고(7일), 구독(매달) 두 묶음으로 가른다. 카드 문구 판은 copy-section 으로 뗐다.
// 같은 날 둘째 손질(사용자 "판매 상품 영역이 불필요한 공백이 많고 컴팩트하지 않다"): 묶음 판 둘을 표 한 장으로 접었다.
// 상품 이름이 왼쪽 끝, 값 칸이 오른쪽 끝에 떨어져 넓은 화면에서 줄 가운데가 비었고, 멤버십 이용권 칸은 따로 한 단을 먹었다.
// 이제 한 줄에 상품, 기간, 값, 이용권, 판매가 붙어 선다. 넓은 화면에서도 표 폭을 묶어(max-w) 눈이 줄 끝까지 가지 않게 한다.
import type { Patch } from "@/components/admin/pricing-form";
import { sectionCardClass } from "@/components/ui/page";
import { cn } from "@/lib/cn";
import { Switch } from "@/components/ui/switch";
import { TextField } from "@/components/ui/text-field";
import { PRICED_KEY_LABELS, PRICING_ADMIN_MESSAGES as M, TIER_LABELS } from "@/lib/pricing/admin-messages";
import type { PricingSettings } from "@/lib/pricing/settings";

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
}: {
  label: string;
  cycle: string;
  amount: number;
  active: boolean;
  onAmount: (n: number) => void;
  onActive: () => void;
  credits?: { value: number; onChange: (n: number) => void };
}) {
  return (
    <li className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-t border-line-soft py-2.5 first:border-t-0", ROW_GRID)}>
      <p className={cn("text-[14px] font-semibold", active ? "text-ink" : "text-dim")}>{label}</p>
      <span className="hidden text-[13px] text-dim sm:block">{cycle}</span>
      <div className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto">
        <TextField
          label={`${label} ${M.colPrice}`}
          hideLabel
          inputMode="numeric"
          value={amount ? amount.toLocaleString("ko-KR") : ""}
          onChange={(e) => onAmount(toInt(e.target.value))}
          trailing={<span className="pr-2 text-[13px] text-dim">{M.won}</span>}
          className="text-right tabular-nums"
          compact
        />
      </div>
      <div className="col-span-2 row-start-3 sm:col-span-1 sm:row-start-auto">
        {credits ? (
          <TextField
            label={`${label} ${M.colCredits}`}
            hideLabel
            inputMode="numeric"
            value={String(credits.value)}
            onChange={(e) => credits.onChange(toInt(e.target.value))}
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

export function PricesSection({ value, patch }: SectionProps) {
  const product = (key: keyof PricingSettings["products"]) => (
    <PriceRow
      key={key}
      label={PRICED_KEY_LABELS[key]}
      cycle={M.cycleAds}
      amount={value.products[key].amount}
      active={value.products[key].active}
      onAmount={(n) => patch((d) => ({ ...d, products: { ...d.products, [key]: { ...d.products[key], amount: n } } }))}
      onActive={() => patch((d) => ({ ...d, products: { ...d.products, [key]: { ...d.products[key], active: !d.products[key].active } } }))}
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
          />
        </ul>
        <p className="mt-1 text-[12px] text-dim">{M.membershipNote}</p>
      </div>
    </Panel>
  );
}
