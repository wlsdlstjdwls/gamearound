"use client";
// 요금 설정 폼(2026-10-28). 2026-10-29 화면을 둘로 나눴다 — 상품과 가격(/admin/pricing, part "catalog": 판매 상품, 카드 문구)과
// 할인 행사(/admin/discounts, part "discounts"). 저장 값은 그대로 설정 하나라 두 화면 다 전체를 저장한다 — 보이지 않는 판의 값은 읽은 그대로 간다.
// 두 화면 모두 아래에 미리 보기(preview)를 둔다. 할인을 켜면 카드 값이 어떻게 바뀌는지가 곧 확인이다.
//
// 설정 전체를 로컬 상태 하나로 쥐고, 판마다 그 일부를 고친다(pricing-form/sections, promotions). 칸을 칠 때마다 저장하지 않는다 —
// 값 하나 바꾸는 도중의 반쪽 요금표가 주문에 쓰이면 안 된다. 저장은 단추로 한 번, 서버와 같은 스키마(lib/pricing/settings)로 먼저 막는다.
// 저장에 실패하면 고친 값은 그대로 둔다(되돌리면 친 글이 날아간다) — "되돌리기" 는 따로 누른다.
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminScreenHead } from "@/components/admin/screen/head";
import { useAdminStatus } from "@/components/admin/screen/status";
import { PricingPreviewLink } from "@/components/admin/pricing-preview-link";
import { savePricingAction } from "@/app/(admin)/admin/pricing/actions";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { newProductId, withNewProduct } from "@/components/admin/pricing-form/sections";
import { CatalogScreen } from "@/components/admin/pricing-form/catalog";
import { askConfirm } from "@/components/ui/confirm-dialog";
import { newPromotionId, PromotionsScreen, withNewPromotion } from "@/components/admin/pricing-form/promotions";
import { PRICING_ADMIN_MESSAGES as M } from "@/lib/pricing/admin-messages";
import { MEMBERSHIP_KEY, pricingSettingsSchema, type PricingSettings } from "@/lib/pricing/settings";

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

/** title: 화면 머리(저장 툴바)에 서는 제목. 페이지가 PageHead 대신 넘긴다 */
export function PricingForm({ initial, part, title }: { initial: PricingSettings; part: "catalog" | "discounts"; title: string }) {
  const [saved, setSaved] = useState(initial);
  const [value, setValue] = useState(initial);
  const [note, setNote] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { say } = useAdminStatus();
  /** 상품등록에서 고른 줄(광고 상품 id 또는 membership). 처음엔 첫 상품 */
  const [item, setItem] = useState<string | null>(initial.products[0]?.id ?? MEMBERSHIP_KEY);
  /** 프로모션 화면에서 고른 줄. 미리 보기는 그 행사가 걸리는 카드 한 장만 보인다 — 카드 셋을 다 쌓으면 고른 행사가 어디 걸렸는지 찾아야 했다 */
  const [promo, setPromo] = useState<string | null>(initial.promotions[0]?.id ?? null);
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

  // 저장 단축키(F9, Ctrl+S)는 화면 머리(admin/screen/head)가 맡는다 — 백오피스와 같은 자리, 같은 키.
  // 바뀐 값을 둔 채 탭을 닫거나 새로 고치면 브라우저가 한 번 묻는다(백오피스의 미저장 확인)
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
        say(M.saved, "ok");
      } else {
        setNote({ tone: "error", text: r.error });
        say(r.error, "error");
      }
    });
  };
  // 툴바 입력, 삭제 — 상품등록은 상품 한 줄을 더하고, 프로모션등록은 프로모션을 더하거나 고른 줄을 지운다
  const insert = () => {
    if (part === "catalog") {
      const id = newProductId();
      patch((d) => withNewProduct(d, id));
      setItem(id);
    } else {
      const id = newPromotionId();
      setPromo(id);
      patch((d) => withNewPromotion(d, id));
    }
  };
  // 상품등록의 삭제는 고른 광고 상품(멤버십은 지우지 않는다). 지운 상품을 겨눈 프로모션도 같이 지운다(sections 의 remove 와 같은 규칙)
  const selectedProduct = part === "catalog" ? value.products.find((p) => p.id === item) : undefined;
  const removeProduct = selectedProduct
    ? async () => {
        if (!(await askConfirm(M.deleteConfirm(selectedProduct.name), { confirmLabel: M.remove, tone: "danger" }))) return;
        const rest = value.products.filter((p) => p.id !== selectedProduct.id);
        setItem(rest[0]?.id ?? MEMBERSHIP_KEY);
        patch((d) => ({ ...d, products: d.products.filter((p) => p.id !== selectedProduct.id), promotions: d.promotions.filter((p) => p.target !== selectedProduct.id) }));
      }
    : undefined;
  const current = value.promotions.find((p) => p.id === promo);
  const removePromo =
    part === "discounts" && current
      ? async () => {
          if (!(await askConfirm(M.promoDeleteConfirm(current.label), { confirmLabel: M.removePromo, tone: "danger" }))) return;
          const rest = value.promotions.filter((p) => p.id !== promo);
          setPromo(rest[0]?.id ?? null);
          patch((d) => ({ ...d, promotions: d.promotions.filter((p) => p.id !== promo) }));
        }
      : undefined;
  // 조회: 바뀐 값을 버리고 서버 값을 다시 읽는다(버릴지는 머리가 먼저 묻는다)
  const retrieve = () => {
    setValue(saved);
    setNote(null);
    router.refresh();
    say(M.reloaded);
  };

  return (
    // --admin-toolbar-h: 머리 툴바 높이. 오른쪽 미리 보기가 툴바 밑에 붙어 따라오게 sticky 자리를 그만큼 내린다
    <div className="flex flex-col gap-5 [--admin-toolbar-h:72px]">
      {/* 화면 머리는 모든 관리 화면 공통 틀(admin/screen/head)이다 — 제목, 메뉴 위치, 조회 입력 삭제 저장 엑셀이 늘 같은 자리.
          이 화면만의 것(바뀐 값 안내, 요금 화면 열기, 되돌리기)은 툴바 왼쪽에 둔다 */}
      <AdminScreenHead
        title={title}
        tools={{ retrieve, insert, delete: part === "catalog" ? removeProduct : removePromo, save, saveDisabled: !dirty || !valid, saving: pending, dirty }}
        actions={
          <>
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
          </>
        }
      />

      {/* 상품등록은 백오피스 상품등록 꼴(조회조건, 왼쪽 목록, 오른쪽 상세 탭, pricing-form/catalog). 미리 보기는 상세 탭 옆 기둥(ScreenTabs aside)이다 */}
      {part === "catalog" ? (
        <CatalogScreen value={value} saved={saved} patch={patch} selected={item} onSelect={setItem} />
      ) : (
        <PromotionsScreen value={value} saved={saved} patch={patch} selected={promo} onSelect={setPromo} />
      )}

    </div>
  );
}
