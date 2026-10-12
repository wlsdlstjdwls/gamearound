"use client";
// 입점 신청 폼 — Server Action 은 app/(user)/shops/join/actions.ts.
//
// 심사에 필요한 것만 묻는다(설계서 §11). 매장 소개, 영업시간처럼 나중에 채워도 되는 값은
// 승인 뒤 매장 화면에서 받는다 — 칸이 늘수록 신청서를 끝까지 적는 사람이 준다.
//
// 흰 판 한 장 안에 묶음 넷(매장 정보, 사업자 확인, 위치, 소개)을 헤어라인으로 가른다(2026-10-12 사용자: "너무 구리고 간단하다").
// 넓은 화면은 왼쪽에 묶음 이름, 오른쪽에 칸 두 개씩 — 칸 아홉 개를 한 줄로 세우면 세로로 길기만 하고
// 어디까지가 같은 이야기인지 안 읽힌다. 좁은 화면은 묶음 이름이 위로 올라가고 칸은 한 줄씩이다.
//
// 증빙 업로드는 아직 없다. 파일을 받으려면 저장소를 먼저 붙여야 하는데(§12), 그 전에
// "올려 주세요" 칸만 세워 두면 올린 파일이 아무 데도 안 남는다. 사업자번호로 심사한다.
import { useActionState, useState } from "react";
import { ActionForm, useActionFormPending } from "@/components/ui/action-form";
import { applyForShopAction } from "@/app/(user)/shops/join/actions";
import { Button } from "@/components/ui/button";
import { chipClass } from "@/components/ui/chip";
import { FormMessage } from "@/components/ui/form-message";
import { sectionCardClass } from "@/components/ui/page";
import { TEXTAREA_CLASS, TextField } from "@/components/ui/text-field";
import { SHOP_MESSAGES as M } from "@/lib/shops/messages";
import { SHOP_DESCRIPTION_MAX, SHOP_NAME_MAX, SHOP_SLUG_MAX } from "@/lib/shops/schemas";
import type { ShopApplication } from "@/server/services/shops";

const ADDRESS_TYPES = [
  { value: "offline", label: M.addressTypeOffline },
  { value: "online_only", label: M.addressTypeOnlineOnly },
] as const;

/** 칸 이름표 — TextField 의 이름표와 같은 모양이어야 직접 그린 칸(위치 칩, 소개)이 따로 놀지 않는다 */
const LABEL = "mb-1.5 block text-[12.5px] font-medium text-mut";

function SubmitButton() {
  const pending = useActionFormPending();
  return (
    <Button type="submit" loading={pending} loadingLabel="보내는 중">
      {M.submit}
    </Button>
  );
}

/**
 * 묶음 한 칸 — 넓은 화면은 이름 기둥 + 칸 격자, 좁은 화면은 위아래.
 * fieldset + legend 를 쓰지 않는 이유: legend 는 격자 칸이 되지 않아 이름 기둥을 세울 수 없다. 묶음은 role="group" 이 말한다
 */
function Group({ id, title, optional, children }: { id: string; title: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div role="group" aria-labelledby={id} className="grid gap-3 py-5 first:pt-0 sm:grid-cols-[120px_1fr] sm:gap-6">
      {/* sm:pt-[26px]: 칸 이름표(12.5px + 6px) 아래 입력칸 첫 줄과 높이를 맞춘다 */}
      <h2 id={id} className="text-[14px] font-bold tracking-[-0.02em] text-ink sm:pt-[26px]">
        {title}
        {optional && <span className="ml-1.5 text-[12px] font-medium text-dim">{M.optional}</span>}
      </h2>
      <div className="grid min-w-0 items-start gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

/** 반려된 신청서는 적어 둔 값을 되돌려 준다 — 처음부터 다시 적게 하면 고치는 것이 아니라 새로 쓰는 것이다 */
export function ShopJoinForm({ current }: { current: ShopApplication | null }) {
  const [state, formAction, submitting] = useActionState(applyForShopAction, null);
  const [addressType, setAddressType] = useState<string>(current?.addressType ?? "offline");

  return (
    <ActionForm action={formAction} state={state} pending={submitting} className={sectionCardClass("flex flex-col")}>
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

      <div className="flex flex-col divide-y divide-line">
        <Group id="shop-g-shop" title={M.groupShop}>
          <TextField name="name" label={M.nameLabel} defaultValue={current?.name ?? ""} maxLength={SHOP_NAME_MAX} required autoComplete="organization" />
          <TextField
            name="slug"
            label={M.slugLabel}
            hint={M.slugHint}
            placeholder={M.slugPlaceholder}
            defaultValue={current?.slug ?? ""}
            maxLength={SHOP_SLUG_MAX}
            required
            inputMode="url"
            autoCapitalize="none"
            spellCheck={false}
          />
        </Group>

        <Group id="shop-g-biz" title={M.groupBusiness}>
          <TextField name="bizRegNo" label={M.bizRegNoLabel} defaultValue={current?.bizRegNo ?? ""} required inputMode="numeric" placeholder="1234567890" />
          <TextField name="phone" label={M.phoneLabel} defaultValue={current?.phone ?? ""} inputMode="tel" autoComplete="tel" />
        </Group>

        <Group id="shop-g-place" title={M.groupPlace}>
          <div className="sm:col-span-2" role="radiogroup" aria-label={M.addressTypeLabel}>
            <span aria-hidden className={LABEL}>
              {M.addressTypeLabel}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {ADDRESS_TYPES.map((t) => (
                <label
                  key={t.value}
                  className={chipClass({ active: addressType === t.value, className: "cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink" })}
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
          </div>
          {/* 온라인만 하는 매장에는 주소 칸이 서지 않는다 — 안 쓰는 칸을 비워 두게 하면 그 칸이 늘 마지막까지 남는다 */}
          {addressType === "offline" && (
            <>
              <TextField name="address" label={M.addressLabel} defaultValue={current?.address ?? ""} required autoComplete="street-address" />
              <TextField name="addressDetail" label={M.addressDetailLabel} defaultValue={""} />
            </>
          )}
        </Group>

        <Group id="shop-g-about" title={M.groupAbout} optional>
          <div className="sm:col-span-2">
            <label htmlFor="shop-description" className="sr-only">
              {M.descriptionLabel}
            </label>
            <textarea
              id="shop-description"
              name="description"
              defaultValue={current?.description ?? ""}
              maxLength={SHOP_DESCRIPTION_MAX}
              rows={3}
              className={TEXTAREA_CLASS}
            />
          </div>
        </Group>
      </div>

      <div className="flex justify-end border-t border-line pt-5">
        <SubmitButton />
      </div>
    </ActionForm>
  );
}
