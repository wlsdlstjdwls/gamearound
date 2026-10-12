"use client";
// 입점 신청 폼 — Server Action 은 app/(user)/shops/join/actions.ts.
//
// 심사에 필요한 것과 손님이 매장 페이지에서 처음 읽을 것(소개)만 묻는다(설계서 §11). 영업시간처럼
// 나중에 채워도 되는 값은 승인 뒤 매장 화면에서 받는다 — 칸이 늘수록 신청서를 끝까지 적는 사람이 준다.
//
// 모양(2026-10-12 사용자: "구리고 간단하다", "아직도 못생겼다"):
//  - 흰 판 한 장 안에 묶음 넷. 묶음 머리는 번호 동그라미 + 제목 — 왼쪽 이름 기둥은 좁은 폭(tight)에서 칸만 눌렀다
//  - 매장 형태는 칩이 아니라 두 칸 짜리 토글 판이다. 둘 중 하나를 고르는 자리라 칩 줄보다 "고르는 곳" 으로 읽힌다
//  - 매장 주소(slug)는 앞에 "/shops/" 를 붙여 보여 준다 — 설명 문장 없이 무엇을 적는 칸인지 말한다
//  - 소개는 글자 수를 센다. 하한(필수)이 있는 칸이라 얼마나 더 적어야 하는지가 보여야 한다
//
// 증빙 업로드는 아직 없다. 파일을 받으려면 저장소를 먼저 붙여야 하는데(§12), 그 전에
// "올려 주세요" 칸만 세워 두면 올린 파일이 아무 데도 안 남는다. 사업자번호로 심사한다.
import { useActionState, useState } from "react";
import { ActionForm, useActionFormPending } from "@/components/ui/action-form";
import { applyForShopAction } from "@/app/(user)/shops/join/actions";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { sectionCardClass } from "@/components/ui/page";
import { TEXTAREA_CLASS, TextField } from "@/components/ui/text-field";
import { cn } from "@/lib/cn";
import { ROUTES } from "@/lib/routes";
import { SHOP_MESSAGES as M } from "@/lib/shops/messages";
import { SHOP_DESCRIPTION_MAX, SHOP_DESCRIPTION_MIN, SHOP_NAME_MAX, SHOP_SLUG_MAX } from "@/lib/shops/schemas";
import type { ShopApplication } from "@/server/services/shops";

const ADDRESS_TYPES = [
  { value: "offline", label: M.addressTypeOffline },
  { value: "online_only", label: M.addressTypeOnlineOnly },
] as const;

function SubmitButton() {
  const pending = useActionFormPending();
  return (
    <Button type="submit" size="lg" loading={pending} loadingLabel="보내는 중" className="w-full sm:w-auto sm:min-w-[160px]">
      {M.submit}
    </Button>
  );
}

/** 묶음 하나 — 번호 동그라미 + 제목, 그 아래 칸 격자(넓은 화면 두 칸) */
function Group({ id, no, title, children }: { id: string; no: number; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 py-6 first:pt-0 last:pb-0">
      <h2 id={id} className="flex items-center gap-2.5 text-[15px] font-bold tracking-[-0.02em] text-ink">
        <span aria-hidden className="flex size-6 items-center justify-center rounded-full bg-acc-soft text-[12px] font-extrabold text-acc">
          {no}
        </span>
        {title}
      </h2>
      <div className="grid min-w-0 items-start gap-x-3 gap-y-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/** 반려된 신청서는 적어 둔 값을 되돌려 준다 — 처음부터 다시 적게 하면 고치는 것이 아니라 새로 쓰는 것이다 */
export function ShopJoinForm({ current }: { current: ShopApplication | null }) {
  const [state, formAction, submitting] = useActionState(applyForShopAction, null);
  const [addressType, setAddressType] = useState<string>(current?.addressType ?? "offline");
  const [descLength, setDescLength] = useState(current?.description?.length ?? 0);

  return (
    <ActionForm action={formAction} state={state} pending={submitting} className={sectionCardClass("flex flex-col gap-6")}>
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
        <Group id="shop-g-shop" no={1} title={M.groupShop}>
          <TextField name="name" label={M.nameLabel} defaultValue={current?.name ?? ""} maxLength={SHOP_NAME_MAX} required autoComplete="organization" />
          <TextField
            name="slug"
            label={M.slugLabel}
            // 쓸 수 있는 글자가 좁은 칸이라 규칙을 빨강으로 세운다(2026-10-12 사용자) — 회색이면 안 읽고 지나친다
            hint={<span className="font-medium text-danger">{M.slugHint}</span>}
            leading={`${ROUTES.shops}/`}
            placeholder={M.slugPlaceholder}
            defaultValue={current?.slug ?? ""}
            maxLength={SHOP_SLUG_MAX}
            required
            inputMode="url"
            autoCapitalize="none"
            spellCheck={false}
          />
        </Group>

        <Group id="shop-g-biz" no={2} title={M.groupBusiness}>
          <TextField name="bizRegNo" label={M.bizRegNoLabel} defaultValue={current?.bizRegNo ?? ""} required inputMode="numeric" placeholder="123-45-67890" />
          <TextField name="phone" label={M.phoneLabel} defaultValue={current?.phone ?? ""} inputMode="tel" autoComplete="tel" placeholder="02-123-4567" />
        </Group>

        <Group id="shop-g-place" no={3} title={M.groupPlace}>
          <div role="radiogroup" aria-label={M.addressTypeLabel} className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1 sm:col-span-2">
            {ADDRESS_TYPES.map((t) => {
              const on = addressType === t.value;
              return (
                <label
                  key={t.value}
                  className={cn(
                    "press flex min-h-[42px] cursor-pointer items-center justify-center rounded-[10px] text-[14px] font-semibold transition-[background-color,color,box-shadow] duration-base ease-standard has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-acc",
                    on ? "bg-surface text-ink shadow-2" : "text-dim hover:text-ink",
                  )}
                >
                  <input type="radio" name="addressType" value={t.value} checked={on} onChange={() => setAddressType(t.value)} className="sr-only" />
                  {t.label}
                </label>
              );
            })}
          </div>
          {/* 온라인만 하는 매장에는 주소 칸이 서지 않는다 — 안 쓰는 칸을 비워 두게 하면 그 칸이 늘 마지막까지 남는다 */}
          {addressType === "offline" && (
            <>
              <TextField name="address" label={M.addressLabel} defaultValue={current?.address ?? ""} required autoComplete="street-address" />
              <TextField name="addressDetail" label={M.addressDetailLabel} defaultValue={""} />
            </>
          )}
        </Group>

        <Group id="shop-g-about" no={4} title={M.groupAbout}>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            {/* 이름표는 묶음 제목과 같은 말이라 화면에서는 숨긴다 */}
            <label htmlFor="shop-description" className="sr-only">
              {M.descriptionLabel}
            </label>
            <textarea
              id="shop-description"
              name="description"
              defaultValue={current?.description ?? ""}
              onChange={(e) => setDescLength(e.currentTarget.value.length)}
              minLength={SHOP_DESCRIPTION_MIN}
              maxLength={SHOP_DESCRIPTION_MAX}
              required
              rows={4}
              placeholder={M.descriptionPlaceholder}
              className={TEXTAREA_CLASS}
            />
            {/* 하한에 못 미치면 보라로 — 아직 더 적어야 한다는 표시. 넘으면 회색으로 물러난다 */}
            <span aria-hidden className={cn("self-end text-[12px] tabular-nums", descLength < SHOP_DESCRIPTION_MIN ? "text-acc" : "text-dim")}>
              {descLength}/{SHOP_DESCRIPTION_MAX}
            </span>
          </div>
        </Group>
      </div>

      <div className="flex justify-end border-t border-line pt-6">
        <SubmitButton />
      </div>
    </ActionForm>
  );
}
