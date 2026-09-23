"use client";
// 심사 한 건 — 신청 내용과 결정 버튼. Server Action 은 app/(admin)/shops/admin/actions.ts.
//
// 사유 칸을 늘 펴 두는 이유: 반려와 정지는 사유가 **필수**다(lib/shops/schemas). 눌러야 나타나는 칸이면
// 누른 뒤에 막히고, 그때 관리자는 "왜 안 되지" 를 화면에서 읽어야 한다.
import { useActionState } from "react";
import { ActionForm, useActionFormPending } from "@/components/ui/action-form";
import { reviewShopAction } from "@/app/(admin)/shops/admin/actions";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/page";
import { FormMessage } from "@/components/ui/form-message";
import { SHOP_ADMIN_MESSAGES, SHOP_MESSAGES } from "@/lib/shops/messages";
import { SHOP_REASON_MAX } from "@/lib/shops/schemas";
import type { ShopApplication } from "@/server/services/shops";

type Decision = { value: string; label: string; variant: "primary" | "secondary" | "danger" };

/** 상태마다 할 수 있는 일이 다르다 — 승인된 매장에 "승인" 을 또 보여 주지 않는다 */
function decisionsFor(status: ShopApplication["status"]): Decision[] {
  if (status === "pending") {
    return [
      { value: "approve", label: SHOP_ADMIN_MESSAGES.approve, variant: "primary" },
      { value: "reject", label: SHOP_ADMIN_MESSAGES.reject, variant: "danger" },
    ];
  }
  if (status === "active") return [{ value: "suspend", label: SHOP_ADMIN_MESSAGES.suspend, variant: "danger" }];
  return [{ value: "reactivate", label: SHOP_ADMIN_MESSAGES.reactivate, variant: "secondary" }];
}

function DecisionButton({ decision }: { decision: Decision }) {
  const pending = useActionFormPending();
  return (
    <Button type="submit" name="decision" value={decision.value} variant={decision.variant} size="sm" disabled={pending}>
      {decision.label}
    </Button>
  );
}

export function ShopReviewCard({ shop }: { shop: ShopApplication }) {
  const [state, formAction, submitting] = useActionState(reviewShopAction, null);

  return (
    <Panel className="flex flex-col gap-3 px-4 py-4">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h3 className="text-[14px] font-bold text-ink">{shop.name}</h3>
        <span className="text-[12px] text-dim">/{shop.slug}</span>
      </div>

      <dl className="flex flex-col gap-1 text-[12.5px]">
        {shop.bizRegNo && (
          <div className="flex gap-2">
            <dt className="w-[76px] shrink-0 text-dim">{SHOP_MESSAGES.bizRegNoLabel}</dt>
            <dd className="text-mut">{shop.bizRegNo}</dd>
          </div>
        )}
        {shop.address && (
          <div className="flex gap-2">
            <dt className="w-[76px] shrink-0 text-dim">{SHOP_MESSAGES.addressLabel}</dt>
            <dd className="text-mut">{shop.address}</dd>
          </div>
        )}
        {shop.phone && (
          <div className="flex gap-2">
            <dt className="w-[76px] shrink-0 text-dim">{SHOP_MESSAGES.phoneLabel}</dt>
            <dd className="text-mut">{shop.phone}</dd>
          </div>
        )}
        <div className="flex gap-2">
          <dt className="w-[76px] shrink-0 text-dim">{SHOP_ADMIN_MESSAGES.ownerLabel}</dt>
          <dd className="text-mut">{shop.ownerEmail ?? "알 수 없음"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-[76px] shrink-0 text-dim">{SHOP_ADMIN_MESSAGES.appliedAtLabel}</dt>
          <dd className="text-mut">{shop.appliedAt.toLocaleDateString("ko-KR")}</dd>
        </div>
        {shop.statusReason && (
          <div className="flex gap-2">
            <dt className="w-[76px] shrink-0 text-dim">{SHOP_MESSAGES.reasonLabel}</dt>
            <dd className="text-danger">{shop.statusReason}</dd>
          </div>
        )}
      </dl>

      {shop.description && <p className="text-[12.5px] leading-[1.7] text-mut">{shop.description}</p>}

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

      <ActionForm action={formAction} state={state} pending={submitting} className="flex flex-col gap-2">
        <input type="hidden" name="shopId" value={shop.id} />
        <label className="sr-only" htmlFor={`reason-${shop.id}`}>
          {SHOP_MESSAGES.reasonLabel}
        </label>
        <input
          id={`reason-${shop.id}`}
          name="reason"
          maxLength={SHOP_REASON_MAX}
          placeholder={SHOP_ADMIN_MESSAGES.reasonPlaceholder}
          className="h-[42px] w-full rounded-[var(--radius-sm)] border border-line-strong bg-bg px-3.5 text-[16px] text-ink outline-none transition-colors placeholder:text-dim focus:border-ink"
        />
        <div className="flex flex-wrap gap-1.5">
          {decisionsFor(shop.status).map((d) => (
            <DecisionButton key={d.value} decision={d} />
          ))}
        </div>
      </ActionForm>
    </Panel>
  );
}
