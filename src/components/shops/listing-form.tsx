"use client";
// 물건 추가 폼 — Server Action 은 app/(user)/vendor/[shopSlug]/listings/actions.ts.
//
// 상품과 판매 줄을 한 폼에서 받는다(listing-schemas 의 listingCreateSchema 주석).
// 매장이 실제로 하는 일은 "이거 이 값에 몇 개 올린다" 하나라, 두 화면으로 가르면
// 상품만 만들고 안 파는 행이 쌓인다.
//
// 사진은 아직 없다. 파일을 받으려면 저장소를 먼저 붙여야 하고, 그 전에 칸만 세우면
// 올린 사진이 아무 데도 안 남는다 — 입점 신청의 증빙 칸과 같은 이유로 미뤘다.
import { useActionState, useCallback, useRef } from "react";
import { ActionForm, useActionFormPending } from "@/components/ui/action-form";
import { createListingAction, type ListingState } from "@/app/(user)/vendor/[shopSlug]/listings/actions";
import { BarcodeField } from "@/components/shops/barcode-field";
import { GamePicker } from "@/components/shops/game-picker";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { TextField } from "@/components/ui/text-field";
import { LISTING_MESSAGES as M } from "@/lib/shops/listing-messages";
import { LISTING_PRICE_MAX, LISTING_STOCK_MAX, PRODUCT_NAME_MAX } from "@/lib/shops/listing-schemas";
import type { BarcodeHitDto } from "@/server/services/listings";

const CONDITIONS = [
  { value: "used", label: M.conditionUsed },
  { value: "new", label: M.conditionNew },
  { value: "sealed", label: M.conditionSealed },
] as const;

const STATUSES = [
  { value: "selling", label: M.statusSelling },
  { value: "draft", label: M.statusDraft },
  { value: "hidden", label: M.statusHidden },
] as const;

/** 고르는 칸의 모양. 칩으로 두기에는 값이 셋을 넘고, 값마다 설명이 필요하지 않다(화면 결정 규약) */
const SELECT_CLASS =
  "w-full rounded-[var(--radius-sm)] border border-line-strong bg-bg px-3 py-2.5 text-[16px] text-ink transition-colors hover:border-dim focus-visible:border-ink focus-visible:outline-none";

function SubmitButton() {
  const pending = useActionFormPending();
  return (
    <Button type="submit" loading={pending} loadingLabel="올리는 중">
      {M.submit}
    </Button>
  );
}

export function ListingForm({ shopSlug, hardware }: { shopSlug: string; hardware: Array<{ code: string; nameKo: string }> }) {
  const action = createListingAction.bind(null, shopSlug);
  const [state, formAction, submitting] = useActionState<ListingState, FormData>(action, null);
  const nameRef = useRef<HTMLInputElement>(null);
  const hardwareRef = useRef<HTMLSelectElement>(null);

  // 이미 있는 바코드면 그 상품의 이름과 기종을 채운다. 어차피 그 상품에 붙어 올라가니(services/listings 의
  // findOrCreateProduct) 다른 이름을 적어 봐야 안 남는다 — 적은 것과 남는 것이 어긋나지 않게 미리 보여 준다
  const onBarcodeHit = useCallback((hit: BarcodeHitDto) => {
    if (nameRef.current) nameRef.current.value = hit.name;
    if (hardwareRef.current && hit.hardwareCode) hardwareRef.current.value = hit.hardwareCode;
  }, []);

  return (
    <ActionForm action={formAction} state={state} pending={submitting} className="flex flex-col gap-4">
      {state && !state.ok && (
        <FormMessage tone="error" replayKey={state.error}>
          {state.error}
        </FormMessage>
      )}
      {state?.ok && (
        <FormMessage tone="success" replayKey={state.message}>
          {state.message}
        </FormMessage>
      )}

      {/* 게임을 먼저 고른다. 안 걸고 올린 상품은 그 게임 상세의 "파는 곳" 에 영원히 안 뜬다 */}
      <GamePicker />

      {/* 바코드가 이름보다 먼저다 — 찍으면 이름이 채워진다 */}
      <BarcodeField shopSlug={shopSlug} onHit={onBarcodeHit} />
      <TextField ref={nameRef} name="name" label={M.productNameLabel} hint={M.productNameHint} maxLength={PRODUCT_NAME_MAX} required />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="hardwareCode" className="text-[12.5px] font-medium text-mut">
          {M.hardwareLabel}
        </label>
        <select ref={hardwareRef} id="hardwareCode" name="hardwareCode" defaultValue="" className={SELECT_CLASS}>
          <option value="">{M.hardwareNone}</option>
          {hardware.map((h) => (
            <option key={h.code} value={h.code}>
              {h.nameKo}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="condition" className="text-[12.5px] font-medium text-mut">
            {M.conditionLabel}
          </label>
          <select id="condition" name="condition" defaultValue="used" className={SELECT_CLASS}>
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="status" className="text-[12.5px] font-medium text-mut">
            {M.statusLabel}
          </label>
          <select id="status" name="status" defaultValue="selling" className={SELECT_CLASS}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <TextField
          name="priceMinor"
          label={M.priceLabel}
          hint={M.priceHint}
          inputMode="numeric"
          defaultValue="0"
          max={LISTING_PRICE_MAX}
          required
        />
        <TextField name="onHand" label={M.onHandLabel} inputMode="numeric" defaultValue="1" max={LISTING_STOCK_MAX} required />
      </div>

      <div>
        <SubmitButton />
      </div>
    </ActionForm>
  );
}
