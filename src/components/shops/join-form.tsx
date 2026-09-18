"use client";
// 입점 신청 폼 — Server Action 은 app/(user)/shops/join/actions.ts.
//
// 심사에 필요한 것만 묻는다(설계서 §11). 매장 소개, 영업시간처럼 나중에 채워도 되는 값은
// 승인 뒤 매장 화면에서 받는다 — 칸이 늘수록 신청서를 끝까지 적는 사람이 준다.
//
// 증빙 업로드는 아직 없다. 파일을 받으려면 저장소를 먼저 붙여야 하는데(§12), 그 전에
// "올려 주세요" 칸만 세워 두면 올린 파일이 아무 데도 안 남는다. 사업자번호로 심사한다.
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { applyForShopAction } from "@/app/(user)/shops/join/actions";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { TextField } from "@/components/ui/text-field";
import { SHOP_MESSAGES } from "@/lib/shops/messages";
import { SHOP_DESCRIPTION_MAX, SHOP_NAME_MAX, SHOP_SLUG_MAX } from "@/lib/shops/schemas";
import type { ShopApplication } from "@/server/services/shops";

const ADDRESS_TYPES = [
  { value: "offline", label: SHOP_MESSAGES.addressTypeOffline },
  { value: "online_only", label: SHOP_MESSAGES.addressTypeOnlineOnly },
] as const;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} loadingLabel="보내는 중">
      {SHOP_MESSAGES.submit}
    </Button>
  );
}

/** 반려된 신청서는 적어 둔 값을 되돌려 준다 — 처음부터 다시 적게 하면 고치는 것이 아니라 새로 쓰는 것이다 */
export function ShopJoinForm({ current }: { current: ShopApplication | null }) {
  const [state, formAction] = useActionState(applyForShopAction, null);
  const [addressType, setAddressType] = useState<string>(current?.addressType ?? "offline");

  return (
    <form action={formAction} className="flex flex-col gap-4">
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

      <TextField name="name" label={SHOP_MESSAGES.nameLabel} defaultValue={current?.name ?? ""} maxLength={SHOP_NAME_MAX} required autoComplete="organization" />
      <TextField
        name="slug"
        label={SHOP_MESSAGES.slugLabel}
        hint={SHOP_MESSAGES.slugHint}
        defaultValue={current?.slug ?? ""}
        maxLength={SHOP_SLUG_MAX}
        required
        inputMode="url"
        autoCapitalize="none"
        spellCheck={false}
      />
      <TextField
        name="bizRegNo"
        label={SHOP_MESSAGES.bizRegNoLabel}
        defaultValue={current?.bizRegNo ?? ""}
        required
        inputMode="numeric"
        placeholder="1234567890"
      />

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-[12.5px] font-medium text-mut">{SHOP_MESSAGES.addressTypeLabel}</legend>
        <div className="flex flex-wrap gap-1.5">
          {ADDRESS_TYPES.map((t) => (
            <label
              key={t.value}
              className={`press tap inline-flex cursor-pointer items-center rounded-full border px-3.5 text-[12.5px] transition-colors ${
                addressType === t.value ? "border-ink bg-ink text-on-ink" : "border-line-strong text-ink-2 hover:border-ink"
              }`}
            >
              <input
                type="radio"
                name="addressType"
                value={t.value}
                checked={addressType === t.value}
                onChange={() => setAddressType(t.value)}
                className="sr-only"
              />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* 온라인만 하는 매장에는 주소 칸이 서지 않는다 — 안 쓰는 칸을 비워 두게 하면 그 칸이 늘 마지막까지 남는다 */}
      {addressType === "offline" && (
        <>
          <TextField name="address" label={SHOP_MESSAGES.addressLabel} defaultValue={current?.address ?? ""} required autoComplete="street-address" />
          <TextField name="addressDetail" label={SHOP_MESSAGES.addressDetailLabel} defaultValue={""} />
        </>
      )}

      <TextField name="phone" label={SHOP_MESSAGES.phoneLabel} defaultValue={current?.phone ?? ""} inputMode="tel" autoComplete="tel" />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="shop-description" className="text-[12.5px] font-medium text-mut">
          {SHOP_MESSAGES.descriptionLabel}
        </label>
        <textarea
          id="shop-description"
          name="description"
          defaultValue={current?.description ?? ""}
          maxLength={SHOP_DESCRIPTION_MAX}
          rows={3}
          className="w-full rounded-[var(--radius-sm)] border border-line-strong bg-bg px-3.5 py-2.5 text-[16px] leading-[1.7] text-ink outline-none transition-colors placeholder:text-dim focus:border-ink"
        />
      </div>

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
