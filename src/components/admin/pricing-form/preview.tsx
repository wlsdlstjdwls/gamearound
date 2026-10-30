"use client";
// 요금 설정 미리 보기(2026-10-29, 사용자 "설정하기 이쁘게", 같은 날 "왼쪽 폼, 오른쪽 미리 보기로"). 넓은 화면은 오른쪽 기둥에 붙어 따라온다. 저장 전 지금 고친 값으로 실제 요금 카드(components/payments/plan-cards)를 그린다.
// 문구 칸 이름(이름 위 작은 줄, 값 아래 강조 줄 등)만으로는 카드 어디에 서는지 알 수 없었다 — 고치는 자리 옆에 결과를 둔다.
// 값은 처음 결제하는 사람 기준이다(첫 결제 할인이 걸린 모습). 카드 단추는 글이 있는 사람 꼴로 그려 단추 글(cta)이 보이게 한다 — 판이 inert 라 결제로 넘어가지 않는다.
// 2026-10-29 밤(사용자 "미리 보기 문구도 없애서 공간 확보", "메이커 멤버십 고르면 스크롤 생기네"): 판 제목과 설명을 걷고 카드만 세운다.
// 카드가 남은 높이보다 길면 줄여서 다 보이게 한다(FitHeight) — 안쪽 스크롤은 카드 아래쪽(단추, 혜택 끝줄)을 가려 "어떻게 보이나" 를 못 답했다.
// 줄이는 것은 넓은 화면의 오른쪽 기둥(바깥이 max-height 를 준 자리)뿐이다. 좁은 화면은 폼 아래 제 크기로 선다.

import { useLayoutEffect, useRef, useState } from "react";
import { PreviewSpotlight } from "@/components/admin/screen/preview-spot";
import { PlanCards } from "@/components/payments/plan-cards";
import type { PlanCtaGroup } from "@/components/payments/plan-cta";
import { PRICING_ADMIN_MESSAGES as M } from "@/lib/pricing/admin-messages";
import { priceBook, sellingTiers } from "@/lib/pricing/quote";
import type { PricingSettings, TierKey } from "@/lib/pricing/settings";

/**
 * 미리 보기 카드가 고를 글 한 벌. 비워 두면 카드가 "글이 없는 사람" 꼴(게임 등록하기 단추)로 서서
 * 관리자가 고친 단추 글이 보이지 않았다(2026-10-30 사용자). 판은 inert 라 눌리지 않고, 주소는 쓰이지 않는다
 */
const PREVIEW_TARGET: PlanCtaGroup[] = [{ title: "", items: [{ id: "preview", title: "", href: "#" }] }];

/** 더 줄이면 글자를 못 읽는다. 이보다 길면 그때는 바깥 기둥이 굴러간다 */
const MIN_SCALE = 0.6;
/** 카드가 제 모양으로 서는 가장 좁은 폭(px, 판 안쪽 여백 포함). 기둥이 이보다 좁으면 이 폭으로 그리고 통째로 줄인다 — 좁은 칸에 밀어 넣으면 글이 잘렸고, 300 은 카드가 판 밖으로 삐져나갔다(2026-10-30) */
const CARD_MIN_W = 330;

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
      const byHeight = Number.isFinite(limit) && natural > limit ? limit / natural : 1;
      const width = outer.current?.clientWidth ?? CARD_MIN_W;
      const byWidth = width < CARD_MIN_W ? width / CARD_MIN_W : 1;
      const scale = Math.max(MIN_SCALE, Math.min(byHeight, byWidth));
      setFit({ scale, height: natural * scale });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // 기둥 폭이 바뀌어도(목록 폭, 상세 묶음이 바뀌는 렌더) 다시 잰다 — 창 크기만 보면 기둥 밖으로 카드가 삐져나갔다
    if (outer.current) ro.observe(outer.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  return (
    <div ref={outer} style={fit.scale < 1 ? { height: fit.height } : undefined}>
      <div ref={inner} className="origin-top-left" style={{ minWidth: CARD_MIN_W, width: fit.scale < 1 ? `${100 / fit.scale}%` : undefined, transform: fit.scale < 1 ? `scale(${fit.scale})` : undefined }}>
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
      {/* 폼 칸에 포커스가 들어가면 그 칸이 바꾸는 카드 자리에 테두리를 겹친다(screen/preview-spot, 2026-10-30 사용자) */}
      <PreviewSpotlight>
        <section aria-label={M.previewTitle} inert className="rounded-[var(--radius-panel)] bg-bg p-3">
          <PlanCards
            copy={value.copy}
            book={book}
            active={active}
            stack
            // 고친 카드 한 장만 그려도 묶음 권유 줄은 실제 판매 상태를 따른다(2026-10-30 사용자 "카드 아래 빨간 안내가 미리 보기에 안 보인다")
            upsell={selling.bundle}
            credits={value.membership.boostCredits}
            membership={null}
            single={PREVIEW_TARGET}
            bundle={PREVIEW_TARGET}
            bundleNeedsPromo={false}
          />
        </section>
      </PreviewSpotlight>
    </FitHeight>
  );
}
