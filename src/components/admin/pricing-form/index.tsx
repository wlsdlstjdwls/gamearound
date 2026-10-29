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
import { askChoice, askConfirm } from "@/components/ui/confirm-dialog";
import { reportDirty } from "@/components/admin/program-shell/store";
import { newPromotionId, PromotionsScreen, withNewPromotion } from "@/components/admin/pricing-form/promotions";
import { PRICING_ADMIN_MESSAGES as M } from "@/lib/pricing/admin-messages";
import { MEMBERSHIP_KEY, type PricingSettings } from "@/lib/pricing/settings";
import { pricingErrors } from "@/lib/pricing/admin-validation";
import { firstError } from "@/lib/admin/validation";

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
  // 칸별 오류(lib/pricing/admin-validation). 저장 액션도 같은 검사를 한 번 더 한다
  const errors = pricingErrors(normalize(value));
  const first = firstError(errors);
  const valid = first === null;
  const invalidText = first ? M.invalidAt(Object.keys(errors).length, first.message) : M.invalid;
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
  useEffect(() => {
    reportDirty(dirty);
    return () => reportDirty(false);
  }, [dirty]);

  // 바뀐 값을 둔 채 다른 화면(메뉴, 링크)으로 가려 하면 자체 확인 팝업으로 묻는다(백오피스의 미저장 확인).
  // 브라우저 beforeunload 경고는 쓰지 않는다(2026-10-30 사용자 "브라우저 alert 말고 자체 alert") — 그 창은 문구도 모양도 바꿀 수 없다.
  // 새로 고침 키, 탭 닫기 확인은 프로그램 껍데기가 한다 — 여기서는 저장 안 한 값이 있다고 알리기만 한다(reportDirty).
  // 탭 닫기와 주소창 새로 고침 단추만은 브라우저가 페이지의 자체 화면을 막아 묻지 못한다. 새 창 열기(수정키, target)는 이 화면을 떠나지 않아 그냥 둔다.
  useEffect(() => {
    if (!dirty) return;
    const onClick = async (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      e.preventDefault();
      e.stopPropagation();
      if (await askConfirm(M.leaveConfirm, { title: M.rowLeaveTitle, confirmLabel: M.leave, tone: "danger" })) router.push(url.pathname + url.search + url.hash);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [dirty, router]);

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
  // 툴바 입력, 삭제 — 상품등록은 상품 한 줄을 더하고(삭제 없음), 프로모션등록은 프로모션을 더하거나 고른 줄을 지운다
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
  // 저장된 줄은 지우지 못한다(2026-10-30 사용자 "상품, 프로모션 둘 다 기존 데이터 삭제는 막아") — 팔던 상품, 걸었던 프로모션을 지우면
  // 지난 주문, 결제가 가리킬 이름이 사라진다. 그만 쓸 줄은 판매여부, 진행상태(중단)로 끈다. 지울 수 있는 것은 아직 저장 안 한 새 줄뿐이고,
  // 툴바 삭제는 그 줄을 골랐을 때만 켜진다. 새 상품을 지우면 그 상품을 겨눈 새 프로모션도 같이 간다(겨눌 상품이 없으면 저장 검사에 걸린다).
  const newProduct = part === "catalog" ? value.products.find((p) => p.id === item && !saved.products.some((x) => x.id === p.id)) : undefined;
  const removeProduct = newProduct
    ? async () => {
        if (!(await askConfirm(M.deleteNewConfirm(newProduct.name || M.newProductName), { confirmLabel: M.removePromo, tone: "danger" }))) return;
        const rest = value.products.filter((p) => p.id !== newProduct.id);
        setItem(rest[0]?.id ?? MEMBERSHIP_KEY);
        patch((d) => ({ ...d, products: d.products.filter((p) => p.id !== newProduct.id), promotions: d.promotions.filter((p) => p.target !== newProduct.id) }));
      }
    : undefined;
  const current = value.promotions.find((p) => p.id === promo && !saved.promotions.some((x) => x.id === p.id));
  const removePromo =
    part === "discounts" && current
      ? async () => {
          if (!(await askConfirm(M.deleteNewConfirm(current.label), { confirmLabel: M.removePromo, tone: "danger" }))) return;
          const rest = value.promotions.filter((p) => p.id !== promo);
          setPromo(rest[0]?.id ?? null);
          patch((d) => ({ ...d, promotions: d.promotions.filter((p) => p.id !== promo) }));
        }
      : undefined;
  // 행 이동 확인(백오피스 "변경된 내역이 있습니다. 저장하시겠습니까?", 2026-10-30 사용자 "행 이동 때마다 변경 여부 체크가 없다").
  // 고른 줄에 저장 안 한 값이 있으면 옮기기 전에 묻는다: 저장(전체 저장 뒤 이동), 저장 안 함(그 줄만 저장된 값으로 되돌리고 이동), 취소(머문다).
  // 묻는 기준은 그 줄 하나다 — 다른 줄에 남은 변경은 그 줄로 갈 때 이미 물었고 목록의 "수정" 표시가 알려 준다.
  const rowOf = (s: PricingSettings, key: string | null) =>
    part === "catalog"
      ? key === MEMBERSHIP_KEY
        ? JSON.stringify(s.membership)
        : JSON.stringify(s.products.find((p) => p.id === key) ?? null)
      : JSON.stringify(s.promotions.find((p) => p.id === key) ?? null);
  const revertRow = (key: string) =>
    patch((d) => {
      if (part === "discounts") {
        const old = saved.promotions.find((p) => p.id === key);
        return { ...d, promotions: old ? d.promotions.map((p) => (p.id === key ? old : p)) : d.promotions.filter((p) => p.id !== key) };
      }
      if (key === MEMBERSHIP_KEY) return { ...d, membership: saved.membership };
      const old = saved.products.find((p) => p.id === key);
      // 새로 더한 줄을 버리면 그 줄을 겨눈 프로모션도 함께 간다(겨눌 상품이 없는 프로모션은 저장 검사에 걸린다)
      return old
        ? { ...d, products: d.products.map((p) => (p.id === key ? old : p)) }
        : { ...d, products: d.products.filter((p) => p.id !== key), promotions: d.promotions.filter((p) => p.target !== key) };
    });
  const moveTo = (setRow: (k: string | null) => void, from: string | null) => async (to: string | null) => {
    if (to === from || from === null || rowOf(value, from) === rowOf(saved, from)) return setRow(to);
    const c = await askChoice(M.rowLeaveConfirm, { title: M.rowLeaveTitle, confirmLabel: M.rowLeaveSave, altLabel: M.rowLeaveDiscard });
    if (c === "cancel") return;
    if (c === "alt") revertRow(from);
    else if (!valid) return say(invalidText, "error");
    else save();
    setRow(to);
  };
  const selectItem = moveTo(setItem, item);
  const selectPromo = moveTo(setPromo, promo);
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
                <span className="text-danger">{invalidText}</span>
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

      {/* 상품등록은 백오피스 상품등록 꼴(조회조건, 왼쪽 목록, 오른쪽 상세 묶음, pricing-form/catalog). 미리 보기는 상세 옆 기둥(WithAside)이다 */}
      {part === "catalog" ? (
        <CatalogScreen value={value} saved={saved} errors={errors} patch={patch} selected={item} onSelect={selectItem} />
      ) : (
        <PromotionsScreen value={value} saved={saved} errors={errors} patch={patch} selected={promo} onSelect={selectPromo} />
      )}

    </div>
  );
}
