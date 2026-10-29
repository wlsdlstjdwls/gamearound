"use client";
// 요금 설정 폼(2026-10-28). 2026-10-29 화면을 둘로 나눴다 — 상품과 가격(/admin/pricing, part "catalog": 판매 상품, 카드 문구)과
// 할인 행사(/admin/discounts, part "discounts"). 저장 값은 그대로 설정 하나라 두 화면 다 전체를 저장한다 — 보이지 않는 판의 값은 읽은 그대로 간다.
// 두 화면 모두 아래에 미리 보기(preview)를 둔다. 할인을 켜면 카드 값이 어떻게 바뀌는지가 곧 확인이다.
//
// 설정 전체를 로컬 상태 하나로 쥐고, 판마다 그 일부를 고친다(pricing-form/sections, promotions). 칸을 칠 때마다 저장하지 않는다 —
// 값 하나 바꾸는 도중의 반쪽 요금표가 주문에 쓰이면 안 된다. 저장은 단추로 한 번, 서버와 같은 스키마(lib/pricing/settings)로 먼저 막는다.
// 저장에 실패하면 고친 값은 그대로 둔다(되돌리면 친 글이 날아간다) — "되돌리기" 는 따로 누른다.
import { useEffect, useRef, useState, useTransition } from "react";
import { PricingPreviewLink } from "@/components/admin/pricing-preview-link";
import { savePricingAction } from "@/app/(admin)/admin/pricing/actions";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { PricesSection } from "@/components/admin/pricing-form/sections";
import { CopySection } from "@/components/admin/pricing-form/copy-section";
import { PromotionsSection } from "@/components/admin/pricing-form/promotions";
import { PricingPreview } from "@/components/admin/pricing-form/preview";
import { PRICING_ADMIN_MESSAGES as M } from "@/lib/pricing/admin-messages";
import { pricingSettingsSchema, type PricedKey, type PricingSettings, type TierKey } from "@/lib/pricing/settings";

/** 행사 대상 상품이 서는 요금 카드. 낱개 광고 둘은 같은 카드(낱개)에 선다 */
const TARGET_TIER: Record<PricedKey, TierKey> = { boost_indie_7d: "single", pin_promo_7d: "single", bundle_7d: "bundle", membership: "membership" };

/** 저장 알림이 머무는 시간. 읽고 넘어갈 만큼만 */
const SAVED_NOTE_MS = 2400;

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

/** title, lead: 화면 머리(저장 툴바)에 서는 제목과 설명. 페이지가 PageHead 대신 넘긴다 */
export function PricingForm({ initial, part, title, lead }: { initial: PricingSettings; part: "catalog" | "discounts"; title: string; lead: string }) {
  const [saved, setSaved] = useState(initial);
  const [value, setValue] = useState(initial);
  const [note, setNote] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  /** 문구를 고치는 카드. 미리 보기가 같은 카드를 따라간다 */
  const [tier, setTier] = useState<TierKey>("single");
  /** 프로모션 화면에서 고른 줄. 미리 보기는 그 행사가 걸리는 카드 한 장만 보인다 — 카드 셋을 다 쌓으면 고른 행사가 어디 걸렸는지 찾아야 했다 */
  const [promo, setPromo] = useState<string | null>(initial.promotions[0]?.id ?? null);
  const promoTarget = value.promotions.find((p) => p.id === promo)?.target;
  const promoTier = promoTarget ? TARGET_TIER[promoTarget] : undefined;
  const dirty = JSON.stringify(value) !== JSON.stringify(saved);
  const valid = pricingSettingsSchema.safeParse(normalize(value)).success;
  // "저장했어요" 는 잠깐 말하고 사라진다 — 남아 있으면 다음에 고칠 때 옛 소식이 섞인다
  useEffect(() => {
    if (note?.tone !== "success") return;
    const t = window.setTimeout(() => setNote(null), SAVED_NOTE_MS);
    return () => window.clearTimeout(t);
  }, [note]);
  const patch: Patch = (fn) => {
    setNote(null);
    setValue((v) => fn(v));
  };

  // 저장 단축키 Ctrl+S(맥은 Cmd+S), 백오피스의 저장 F9 와 같은 자리다. 브라우저의 "페이지 저장" 창은 막는다.
  // 바뀐 값을 둔 채 탭을 닫거나 새로 고치면 브라우저가 한 번 묻는다(백오피스의 미저장 확인)
  const saveRef = useRef<() => void>(() => {});
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

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
  useEffect(() => {
    saveRef.current = () => {
      if (dirty && valid && !pending) save();
    };
  });

  return (
    // --admin-toolbar-h: 머리 툴바 높이. 오른쪽 미리 보기가 툴바 밑에 붙어 따라오게 sticky 자리를 그만큼 내린다
    <div className="flex flex-col gap-5 [--admin-toolbar-h:72px]">
      {/* 화면 머리를 저장 툴바로 쓴다(2026-10-29 사용자 "아래 저장, 되돌리기 영역이 고정돼 내용을 가린다", 신세계TV 백오피스 참고).
          백오피스의 관리 화면은 제목 줄 오른쪽 끝에 저장 단추가 늘 같은 자리에 선다 — 바닥에 뜨는 줄은 마지막 칸을 덮었다.
          머리는 위에 붙어 따라오고(sticky), 본문을 덮지 않는다. 바뀐 값이 있는지는 저장 단추 옆 한 줄이 말한다 */}
      <div className="sticky top-[var(--header-h)] z-20 -mx-4 -mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line-soft bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:-mt-5 sm:px-5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="text-[20px] font-extrabold tracking-[-0.02em] text-ink">{title}</h1>
          <p className="text-[12.5px] text-dim">{lead}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12.5px] font-medium" aria-live="polite">
            {note ? (
              <FormMessage tone={note.tone}>{note.text}</FormMessage>
            ) : dirty && !valid ? (
              <span className="text-danger">{M.invalid}</span>
            ) : dirty ? (
              <span className="text-acc">{M.dirty}</span>
            ) : null}
          </span>
          <PricingPreviewLink />
          <Button variant="secondary" size="sm" disabled={!dirty || pending} onClick={() => patch(() => saved)}>
            {M.reset}
          </Button>
          <Button variant="accent" size="sm" loading={pending} loadingLabel={M.saving} disabled={!dirty || !valid} onClick={save} title={M.saveShortcut} aria-keyshortcuts="Control+S">
            {M.save}
          </Button>
        </div>
      </div>

      {/* 넓은 화면은 왼쪽 폼, 오른쪽 미리 보기(2026-10-29 사용자). 미리 보기는 sticky 라 긴 폼을 내려도 따라온다 */}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          {part === "catalog" ? (
            <>
              <PricesSection value={value} saved={saved} patch={patch} />
              <CopySection value={value} patch={patch} tier={tier} onTier={setTier} />
            </>
          ) : (
            <PromotionsSection value={value} patch={patch} selected={promo} onSelect={setPromo} />
          )}
        </div>
        <div className="xl:sticky xl:top-[calc(var(--header-h)+var(--admin-toolbar-h)+16px)] xl:max-h-[calc(100svh-var(--header-h)-var(--admin-toolbar-h)-32px)] xl:overflow-y-auto xl:overscroll-contain">
          <PricingPreview value={value} tier={part === "catalog" ? tier : promoTier} />
        </div>
      </div>

    </div>
  );
}
