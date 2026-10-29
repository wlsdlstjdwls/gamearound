"use client";
// 요금 설정 폼(2026-10-28). 2026-10-29 화면을 둘로 나눴다 — 상품과 가격(/admin/pricing, part "catalog": 판매 상품, 카드 문구)과
// 할인 행사(/admin/discounts, part "discounts"). 저장 값은 그대로 설정 하나라 두 화면 다 전체를 저장한다 — 보이지 않는 판의 값은 읽은 그대로 간다.
// 두 화면 모두 아래에 미리 보기(preview)를 둔다. 할인을 켜면 카드 값이 어떻게 바뀌는지가 곧 확인이다.
//
// 설정 전체를 로컬 상태 하나로 쥐고, 판마다 그 일부를 고친다(pricing-form/sections, promotions). 칸을 칠 때마다 저장하지 않는다 —
// 값 하나 바꾸는 도중의 반쪽 요금표가 주문에 쓰이면 안 된다. 저장은 단추로 한 번, 서버와 같은 스키마(lib/pricing/settings)로 먼저 막는다.
// 저장에 실패하면 고친 값은 그대로 둔다(되돌리면 친 글이 날아간다) — "되돌리기" 는 따로 누른다.
import { useState, useTransition } from "react";
import { savePricingAction } from "@/app/(admin)/admin/pricing/actions";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { PricesSection } from "@/components/admin/pricing-form/sections";
import { CopySection } from "@/components/admin/pricing-form/copy-section";
import { PromotionsSection } from "@/components/admin/pricing-form/promotions";
import { PricingPreview } from "@/components/admin/pricing-form/preview";
import { PRICING_ADMIN_MESSAGES as M } from "@/lib/pricing/admin-messages";
import { pricingSettingsSchema, type PricingSettings, type TierKey } from "@/lib/pricing/settings";

export type Patch = (fn: (draft: PricingSettings) => PricingSettings) => void;

/** 저장 전 정리 — 줄 목록의 빈 줄을 뺀다. 치는 동안은 빈 줄을 두어야 다음 줄을 칠 수 있다(sections 의 LinesField) */
function normalize(s: PricingSettings): PricingSettings {
  const clean = (ls: readonly string[]) => ls.map((l) => l.trim()).filter(Boolean);
  return {
    ...s,
    copy: {
      single: { ...s.copy.single, lines: clean(s.copy.single.lines) },
      bundle: { ...s.copy.bundle, lines: clean(s.copy.bundle.lines) },
      membership: { ...s.copy.membership, lines: clean(s.copy.membership.lines), benefits: clean(s.copy.membership.benefits) },
    },
  };
}

export function PricingForm({ initial, part }: { initial: PricingSettings; part: "catalog" | "discounts" }) {
  const [saved, setSaved] = useState(initial);
  const [value, setValue] = useState(initial);
  const [note, setNote] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  /** 문구를 고치는 카드. 미리 보기가 같은 카드를 따라간다 */
  const [tier, setTier] = useState<TierKey>("single");
  const dirty = JSON.stringify(value) !== JSON.stringify(saved);
  const valid = pricingSettingsSchema.safeParse(normalize(value)).success;
  const patch: Patch = (fn) => {
    setNote(null);
    setValue((v) => fn(v));
  };

  const save = () => {
    const next = normalize(value);
    start(async () => {
      const r = await savePricingAction(next);
      if (r.ok) {
        setSaved(next);
        setValue(next);
        setNote({ tone: "success", text: M.saved });
      } else setNote({ tone: "error", text: r.error });
    });
  };

  return (
    <div className="flex flex-col gap-5 pb-24">
      {/* 넓은 화면은 왼쪽 폼, 오른쪽 미리 보기(2026-10-29 사용자). 미리 보기는 sticky 라 긴 폼을 내려도 따라온다 */}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          {part === "catalog" ? (
            <>
              <PricesSection value={value} patch={patch} />
              <CopySection value={value} patch={patch} tier={tier} onTier={setTier} />
            </>
          ) : (
            <PromotionsSection value={value} patch={patch} />
          )}
        </div>
        <div className="xl:sticky xl:top-[calc(var(--header-h)+16px)] xl:max-h-[calc(100svh-var(--header-h)-32px)] xl:overflow-y-auto xl:overscroll-contain">
          <PricingPreview value={value} tier={part === "catalog" ? tier : undefined} />
        </div>
      </div>

      {/* 저장 줄은 화면 아래에 붙여 둔다 — 세 판이 길어 맨 아래까지 내려야 저장이 보이면 고친 채 떠나기 쉽다 */}
      <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-panel)] bg-surface px-4 py-3 shadow-3">
        <span className="text-[13px] text-mut" aria-live="polite">
          {note ? <FormMessage tone={note.tone}>{note.text}</FormMessage> : !valid ? <span className="text-danger">{M.invalid}</span> : dirty ? M.dirty : null}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" disabled={!dirty || pending} onClick={() => patch(() => saved)}>
            {M.reset}
          </Button>
          <Button variant="accent" size="sm" loading={pending} loadingLabel={M.saving} disabled={!dirty || !valid} onClick={save}>
            {M.save}
          </Button>
        </div>
      </div>
    </div>
  );
}
