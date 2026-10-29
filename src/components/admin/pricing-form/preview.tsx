"use client";
// 요금 설정 미리 보기(2026-10-29, 사용자 "설정하기 이쁘게", 같은 날 "왼쪽 폼, 오른쪽 미리 보기로"). 넓은 화면은 오른쪽 기둥에 붙어 따라온다. 저장 전 지금 고친 값으로 실제 요금 카드(components/payments/plan-cards)를 그린다.
// 문구 칸 이름(이름 위 작은 줄, 값 아래 강조 줄 등)만으로는 카드 어디에 서는지 알 수 없었다 — 고치는 자리 옆에 결과를 둔다.
// 값은 처음 결제하는 사람 기준이다(첫 결제 할인이 걸린 모습). 카드 단추는 고를 글이 없는 빈 상태로 그린다 — 미리 보기에서 결제로 넘어가지 않게.
// 2026-10-29 밤(사용자 "미리 보기 문구도 없애서 공간 확보", "메이커 멤버십 고르면 스크롤 생기네"): 판 제목과 설명을 걷고 카드만 세운다.
// 카드가 남은 높이보다 길면 줄여서 다 보이게 한다(FitHeight) — 안쪽 스크롤은 카드 아래쪽(단추, 혜택 끝줄)을 가려 "어떻게 보이나" 를 못 답했다.
// 줄이는 것은 넓은 화면의 오른쪽 기둥(바깥이 max-height 를 준 자리)뿐이다. 좁은 화면은 폼 아래 제 크기로 선다.

import { useLayoutEffect, useRef, useState } from "react";
import { PlanCards } from "@/components/payments/plan-cards";
import { PRICING_ADMIN_MESSAGES as M } from "@/lib/pricing/admin-messages";
import { priceBook, sellingTiers } from "@/lib/pricing/quote";
import type { PricingSettings, TierKey } from "@/lib/pricing/settings";

/** 더 줄이면 글자를 못 읽는다. 이보다 길면 그때는 바깥 기둥이 굴러간다 */
const MIN_SCALE = 0.6;

/** 바깥(부모)의 max-height 안에 들도록 속을 비율로 줄인다. 부모에 max-height 가 없으면(좁은 화면) 그대로 둔다 */
function FitHeight({ children }: { children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 1, height: 0 });
  useLayoutEffect(() => {
    const box = outer.current?.parentElement;
    const el = inner.current;
    if (!box || !el) return;
    const measure = () => {
      const limit = parseFloat(getComputedStyle(box).maxHeight);
      const natural = el.offsetHeight;
      const scale = Number.isFinite(limit) && natural > limit ? Math.max(MIN_SCALE, limit / natural) : 1;
      setFit({ scale, height: natural * scale });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  return (
    <div ref={outer} style={fit.scale < 1 ? { height: fit.height } : undefined}>
      <div ref={inner} className="origin-top" style={fit.scale < 1 ? { transform: `scale(${fit.scale})` } : undefined}>
        {children}
      </div>
    </div>
  );
}

/** tier 를 주면 그 카드 한 장만(문구를 고치는 카드). 없으면 판매 중인 카드 전부를 위아래로 쌓는다 */
export function PricingPreview({ value, tier }: { value: PricingSettings; tier?: TierKey }) {
  const book = priceBook(value, { productsPaid: false, membershipPaid: false }, new Date());
  const selling = sellingTiers(value);
  // 고치는 카드는 판매를 꺼 두었어도 보인다 — 문구를 고치는 중인데 미리 보기가 비면 안 된다
  const active = tier ? { single: tier === "single", bundle: tier === "bundle", membership: tier === "membership" } : selling;
  return (
    <FitHeight>
      {/* 제목은 낭독기에만 — 화면에서는 카드가 곧 미리 보기다. 옅은 바탕 위에 올려 실제 화면과 같은 대비로 본다 */}
      <section aria-label={M.previewTitle} inert className="rounded-[var(--radius-panel)] bg-bg p-3">
        <PlanCards
          copy={value.copy}
          book={book}
          active={active}
          stack
          credits={value.membership.boostCredits}
          membership={null}
          single={[]}
          bundle={[]}
          bundleNeedsPromo={false}
        />
      </section>
    </FitHeight>
  );
}
