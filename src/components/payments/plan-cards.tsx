// 요금 카드 셋(2026-10-28, /indie/mine/plans).
//
// 순서는 싼 것부터 — 낱개 → 묶음(추천) → 멤버십. 사용자(10-28 셋째 요청): "왼쪽에서 오른쪽으로 갈수록 비싼 대신 혜택도 많게".
// 윗단 카드는 아랫단의 모든 것을 품는다. 그래서 윗단은 "낱개에 더해", "묶음에 더해" 머리 아래에 **더해지는 것만** 보라 "+" 줄로 적는다 —
// 같은 줄을 카드마다 되풀이하면 무엇이 달라지는지가 묻힌다(사용자: "한 단계 높을수록 바뀌는 점을 강조해야지, 티가 안 난다").
// 가운데 묶음만 테두리로 띄워 주로 팔 상품을 가리킨다. 맨 윗단 "모든 혜택" 은 채운 보라 딱지 — 한 화면에 하나뿐인 강조다.
//
// 값, 이름, 문구는 관리자가 바꾸는 요금 설정(lib/pricing/settings)에서 온다 — 이 파일은 모양만 정한다. 값은 사는 사람 처지(첫 결제인가)와
// 프로모션까지 매긴 값 묶음(lib/pricing/quote 의 PriceBook)을 받는다. 판매를 멈춘 단(active=false)은 카드를 세우지 않는다.
// 그은 값은 근거가 있는 값만 쓴다(components/payments/price-tag): 정가, 묶음이면 낱개 정가 합.
// 지금 받는 것(바로 노출, 이용권 즉시 채움)을 값 바로 아래 둔다 — 나중 이득보다 지금 이득을 크게 느낀다(현재 편향).
// 구매 단추는 components/payments/plan-cta — 카드에서 바로 결제 화면으로 간다.
// data-preview-spot 은 관리자 미리 보기가 "지금 고치는 칸이 카드 어디인가" 를 가리킬 자리 표시다(lib/pricing/preview-spots). 공개 화면에서는 아무 일도 안 한다.
import Link from "next/link";
import { PlanCta, type PlanCtaGroup } from "@/components/payments/plan-cta";
import { buttonClass } from "@/components/ui/button";
import { CheckIcon, PlusIcon } from "@/components/ui/icons";
import { sectionCardClass } from "@/components/ui/page";
import { Clamp } from "@/components/ui/tooltip";
import { Tag } from "@/components/ui/tag";
import { PriceTag } from "@/components/payments/price-tag";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/currency";
import { MONTH_DAYS_APPROX } from "@/lib/membership/plan";
import { PLANS_MESSAGES as M } from "@/lib/payments/plans-messages";
import { perDay, type PriceBook, type Quote } from "@/lib/pricing/quote";
import { PLAN_SPOTS } from "@/lib/pricing/preview-spots";
import { DEFAULT_TONES, type BadgeTone, type BoxTone, type ToneValue } from "@/lib/pricing/copy-tones";
import { boxTone, textTone, ToneBadge } from "@/components/payments/copy-tone";
import { fillCopy, type PricingSettings } from "@/lib/pricing/settings";
import { ROUTES } from "@/lib/routes";

/**
 * "이름: 설명" 한 줄. 이름은 굵게, 설명은 옅게. 줄은 꺾지 않는다(10-28 사용자: "줄바꿈 되지 않고 한 줄씩") —
 * 문구를 카드 폭(좁은 화면 약 300px)에 들게 짧게 쓰고, 그래도 넘치면 잘라 툴팁으로 전문을 보인다(ui/tooltip 의 Clamp)
 */
function Line({ text, strong }: { text: string; strong?: boolean }) {
  const at = text.indexOf(": ");
  const name = at < 0 ? text : text.slice(0, at);
  const rest = at < 0 ? "" : text.slice(at + 2);
  return (
    <Clamp lines={1} text={at < 0 ? text : `${name} ${rest}`} className="min-w-0 flex-1">
      <b className={strong ? "font-bold text-ink" : "font-semibold text-ink-2"}>{name}</b>
      {rest && <span className="text-mut"> {rest}</span>}
    </Clamp>
  );
}

/** 이 단에 든 것(회색 체크) */
function Included({ lines }: { lines: readonly string[] }) {
  return (
    <ul data-preview-spot={PLAN_SPOTS.lines} className="flex flex-col gap-2.5 text-[13.5px]">
      {lines.map((line) => (
        <li key={line} className="flex items-center gap-2">
          <CheckIcon size={15} className="shrink-0 text-mut" />
          <Line text={line} />
        </li>
      ))}
    </ul>
  );
}

/** 아랫단에 더해지는 것(보라 "+"). base: "스파크에 더해" 같은 머리 */
function Adds({ base, lines }: { base: string; lines: readonly string[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {base && (
        <p data-preview-spot={PLAN_SPOTS.base} className="text-[12.5px] font-semibold text-mut">
          {base}
        </p>
      )}
      <ul data-preview-spot={PLAN_SPOTS.lines} className="flex flex-col gap-2.5 text-[13.5px]">
        {lines.map((line) => (
          <li key={line} className="flex items-center gap-2">
            <span aria-hidden className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-acc text-on-ink">
              <PlusIcon size={12} />
            </span>
            <Line text={line} strong />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 작은 줄(기간 | 크기), 이름, 딱지, 한 줄 정의. 세 카드가 같은 꼴이라 이름만 바꿔 읽어도 단계가 보인다 */
function Head({ eyebrow, name, tag, summary }: { eyebrow: string; name: string; tag?: React.ReactNode; summary: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p data-preview-spot={PLAN_SPOTS.eyebrow} className="text-[12px] font-semibold text-mut">
        {eyebrow}
      </p>
      <div className="flex items-center justify-between gap-2">
        <h2 data-preview-spot={PLAN_SPOTS.name} className="text-[20px] font-extrabold tracking-[-0.03em] text-ink">
          {name}
        </h2>
        {tag && <span data-preview-spot={PLAN_SPOTS.tag}>{tag}</span>}
      </div>
      <p data-preview-spot={PLAN_SPOTS.summary} className="text-[14px] font-semibold text-ink-2">
        {summary}
      </p>
    </div>
  );
}

/** 값 바로 아래 "지금 받는 것" 한 줄 */
function Now({ tone = DEFAULT_TONES.now, children }: { tone?: ToneValue<BoxTone>; children: React.ReactNode }) {
  const paint = boxTone(tone, "rounded-xl px-3 py-2 text-[13px] font-semibold");
  return (
    <p data-preview-spot={PLAN_SPOTS.now} className={paint.className} style={paint.style}>
      {children}
    </p>
  );
}

/** 값 칸 높이를 카드끼리 맞춘다 — 그은 값, 아끼는 금액 줄이 있는 카드와 없는 카드의 아래 줄이 어긋나지 않게 */
const PRICE_BOX = "lg:min-h-[92px]";

type Props = {
  copy: PricingSettings["copy"];
  book: PriceBook;
  /** 판매 중인 단 */
  active: { single: boolean; bundle: boolean; membership: boolean };
  /** 멤버십 이용권 수(문구의 {credits}) */
  credits: number;
  /** 이용 중이면 남은 이용권. 없으면 null */
  membership: { credits: number } | null;
  /** 카드 단추가 고를 글. 낱개는 둘 다, 묶음은 인디 게임만(묶음 주문의 주 대상이 인디 게임이다) */
  single: PlanCtaGroup[];
  bundle: PlanCtaGroup[];
  /** 홍보 글이 없어 묶음을 살 수 없나 */
  bundleNeedsPromo: boolean;
  /** 늘 한 줄에 한 장(관리자 미리 보기처럼 좁은 기둥 안에 그릴 때). 화면 폭 기준 3칸이 좁은 기둥에서도 걸려 카드가 찌그러졌다 */
  stack?: boolean;
  /** 낱개 카드 아래 묶음 권유 줄(hint)을 세우나. 없으면 묶음 카드가 서는지(active.bundle)를 따른다 — 관리자 미리 보기는 카드 한 장만 그려도 실제 판매 상태로 보인다 */
  upsell?: boolean;
};

const GRID_COLS = { 1: "", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3" } as const;

export function PlanCards({ copy, book, active, credits, membership, single, bundle, bundleNeedsPromo, stack = false, upsell }: Props) {
  const empty = { href: ROUTES.indieNew, action: M.noIndieAction };
  // 낱개는 부스트, 고정 둘 중 하나라 값이 다르면 싼 쪽에 "부터" 를 붙인다
  const singleQuote = book.pin.amount < book.boost.amount ? book.pin : book.boost;
  const singleFrom = book.pin.amount !== book.boost.amount;
  const saving = Math.max(0, book.bundleList - book.bundle.amount);
  const vars = { saving: formatPrice(saving), credits: String(credits), price: formatPrice(singleQuote.amount) };
  const fill = (t: string) => fillCopy(t, vars);
  const fillAll = (ls: readonly string[]) => ls.map(fill);
  const count = [active.single, active.bundle, active.membership].filter(Boolean).length as 1 | 2 | 3;
  // 배지, 띠, 안내 색은 관리자가 고른 값(copy 의 ~Tone), 없으면 고르기 전 색(lib/pricing/copy-tones)
  const tag = (t: string, tone: ToneValue<BadgeTone>) => (t ? <ToneBadge tone={tone}>{t}</ToneBadge> : undefined);
  const hint = textTone(copy.single.hintTone ?? DEFAULT_TONES.hint, "text-[13px] font-semibold");

  return (
    <div className={cn("grid items-stretch gap-3", !stack && GRID_COLS[Math.max(1, count) as 1 | 2 | 3])}>
      {active.single && (
        <section data-preview-spot={PLAN_SPOTS.card} className={sectionCardClass("flex flex-col gap-4")}>
          <Head eyebrow={copy.single.eyebrow} name={copy.single.name} summary={fill(copy.single.summary)} tag={tag(copy.single.tag, copy.single.tagTone ?? DEFAULT_TONES.tag.single)} />
          <div data-preview-spot={PLAN_SPOTS.price} className={PRICE_BOX}>
            <PriceTag quote={singleQuote}>{singleFrom && <span className="text-[13px] text-mut">{M.from}</span>}</PriceTag>
          </div>
          {copy.single.now && <Now tone={copy.single.nowTone}>{copy.single.now}</Now>}
          <Included lines={fillAll(copy.single.lines)} />
          {copy.single.hint && (upsell ?? active.bundle) && (
            <p data-preview-spot={PLAN_SPOTS.hint} className={hint.className} style={hint.style}>
              {fill(copy.single.hint)}
            </p>
          )}
          <div data-preview-spot={PLAN_SPOTS.cta} className="mt-auto flex flex-col">
            <PlanCta label={copy.single.cta} variant="secondary" groups={single} empty={empty} />
          </div>
        </section>
      )}

      {active.bundle && (
        <section data-preview-spot={PLAN_SPOTS.card} className={sectionCardClass("flex flex-col gap-4 ring-2 ring-acc")}>
          <Head eyebrow={copy.bundle.eyebrow} name={copy.bundle.name} summary={fill(copy.bundle.summary)} tag={tag(copy.bundle.tag, copy.bundle.tagTone ?? DEFAULT_TONES.tag.bundle)} />
          <div data-preview-spot={PLAN_SPOTS.price} className={PRICE_BOX}>
            <PriceTag quote={book.bundle} list={book.bundleList}>
              {saving > 0 && <span className="text-[13px] font-semibold text-danger">{M.saving(formatPrice(saving))}</span>}
            </PriceTag>
          </div>
          {copy.bundle.now && <Now tone={copy.bundle.nowTone}>{copy.bundle.now}</Now>}
          <Adds base={copy.bundle.base} lines={fillAll(copy.bundle.lines)} />
          <div data-preview-spot={PLAN_SPOTS.cta} className="mt-auto flex flex-col">
            <PlanCta label={copy.bundle.cta} variant="accent" groups={bundle} empty={empty} note={bundleNeedsPromo ? M.bundleNeedsPromo : undefined} />
          </div>
        </section>
      )}

      {active.membership && (
        <section data-preview-spot={PLAN_SPOTS.card} className={sectionCardClass("flex flex-col gap-4")}>
          <Head
            eyebrow={copy.membership.eyebrow}
            name={copy.membership.name}
            summary={fill(copy.membership.summary)}
            tag={membership ? <Tag tone="ok">{M.membershipActive}</Tag> : tag(copy.membership.tag, copy.membership.tagTone ?? DEFAULT_TONES.tag.membership)}
          />
          <div data-preview-spot={PLAN_SPOTS.price} className={PRICE_BOX}>
            <MembershipPrice quote={book.membership} />
          </div>
          {copy.membership.now && <Now tone={copy.membership.nowTone}>{membership ? M.membershipCredits(membership.credits) : copy.membership.now}</Now>}
          <Adds base={copy.membership.base} lines={fillAll(copy.membership.lines)} />
          <Link href={ROUTES.membership} data-preview-spot={PLAN_SPOTS.cta} className={buttonClass({ variant: membership ? "secondary" : "primary", fullWidth: true, className: "mt-auto" })}>
            {membership ? M.membershipManage : copy.membership.cta}
          </Link>
        </section>
      )}
    </div>
  );
}

/**
 * 멤버십 값. 첫 달 할인이 걸리면 "첫 달" 값을 크게, 다음 달부터의 값을 바로 아래 숨김없이 적는다 —
 * 첫 달만 보이고 이후 값을 감추면 구독 함정이 된다. 할인이 없으면 "매달" 값과 하루 값
 */
export function MembershipPrice({ quote }: { quote: Quote }) {
  const intro = quote.amount < quote.regular;
  return (
    <PriceTag quote={quote} prefix={intro ? M.firstMonth : M.perMonth}>
      <span className="text-[13px] text-mut">{intro ? M.thenMonthly(formatPrice(quote.regular)) : M.perDayApprox(formatPrice(perDay(quote.regular, MONTH_DAYS_APPROX)))}</span>
    </PriceTag>
  );
}
