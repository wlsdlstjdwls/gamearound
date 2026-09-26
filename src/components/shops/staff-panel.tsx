"use client";
// 직원 화면의 본문 — 함께하는 사람, 보낸 초대, 초대 폼. Server Action 은 app/(user)/vendor/[shopSlug]/staff/actions.ts.
//
// 초대 링크는 만든 그 응답에서 **한 번만** 보인다(원문 토큰은 DB 에 없다). 그래서 링크를 화면에 크게 두고
// 복사 버튼을 붙인다. 다시 보여 달라는 길은 없다 — 잃었으면 취소하고 새로 만든다.
//
// 내보내기에 confirm() 을 쓰지 않는다(listing-rows 와 같은 이유). 잘못 내보냈으면 다시 초대하면 된다.
import { useActionState, useState } from "react";
import { ActionForm, useActionFormPending } from "@/components/ui/action-form";
import {
  inviteStaffAction,
  removeStaffAction,
  revokeInviteAction,
  type StaffState,
} from "@/app/(user)/vendor/[shopSlug]/staff/actions";
import { Button, buttonClass } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { panelClass } from "@/components/ui/page";
import { FormSelect } from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";
import { Clamp } from "@/components/ui/tooltip";
import { formatDate } from "@/lib/format";
import { VENDOR_MESSAGES } from "@/lib/shops/listing-messages";
import { STAFF_MESSAGES as M } from "@/lib/shops/staff-messages";
import type { StaffInviteDto, StaffMemberDto, ShopStaffRole } from "@/server/services/shops";

const ROLE_LABEL: Record<ShopStaffRole, string> = {
  owner: VENDOR_MESSAGES.roleOwner,
  manager: VENDOR_MESSAGES.roleManager,
  staff: VENDOR_MESSAGES.roleStaff,
};

/** 초대로 줄 수 있는 역할만. 대표는 입점 승인이 정한다(lib/shops/staff-schemas 의 INVITABLE_ROLES) */
const ROLE_CHOICES = [
  { value: "staff", label: VENDOR_MESSAGES.roleStaff },
  { value: "manager", label: VENDOR_MESSAGES.roleManager },
];

function PendingButton({ label }: { label: string }) {
  const pending = useActionFormPending();
  return (
    <button type="submit" disabled={pending} className={buttonClass({ variant: "ghost", size: "sm" })}>
      {label}
    </button>
  );
}

/** 줄 하나에 붙는 단일 버튼 폼. 내보내기와 초대 취소가 같은 모양이다 */
function RowAction({
  action,
  field,
  value,
  label,
}: {
  action: (prev: StaffState, formData: FormData) => Promise<StaffState>;
  field: string;
  value: string;
  label: string;
}) {
  const [state, dispatch, pending] = useActionState<StaffState, FormData>(action, null);
  return (
    <div className="flex flex-col items-end gap-1.5">
      <ActionForm action={dispatch} state={state} pending={pending}>
        <input type="hidden" name={field} value={value} />
        <PendingButton label={label} />
      </ActionForm>
      {state && !state.ok && <p className="text-[12px] text-danger">{state.error}</p>}
    </div>
  );
}

function InviteLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  // 경로만 받아 여기서 주소를 붙인다 — 서버는 자기가 어느 도메인으로 불렸는지 믿을 만하게 모른다
  const url = typeof window === "undefined" ? path : `${window.location.origin}${path}`;

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        readOnly
        value={url}
        aria-label={M.copy}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full rounded-[var(--radius-sm)] border border-line-strong bg-bg px-3 py-2.5 text-[16px] text-ink"
      />
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={copy}>
          {M.copy}
        </Button>
        {copied && (
          <span role="status" className="text-[12.5px] text-ok">
            {M.copied}
          </span>
        )}
      </div>
    </div>
  );
}

function SubmitButton() {
  const pending = useActionFormPending();
  return (
    <Button type="submit" loading={pending} loadingLabel="만드는 중">
      {M.submit}
    </Button>
  );
}

export function StaffInviteForm({ shopSlug }: { shopSlug: string }) {
  const [state, dispatch, pending] = useActionState<StaffState, FormData>(inviteStaffAction.bind(null, shopSlug), null);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[12.5px] text-mut">{M.inviteLead}</p>
      <ActionForm action={dispatch} state={state} pending={pending} className="flex flex-col gap-4">
        {state && !state.ok && (
          <FormMessage tone="error" replayKey={state.error}>
            {state.error}
          </FormMessage>
        )}
        <TextField name="email" type="email" label={M.emailLabel} autoComplete="off" required />
        <FormSelect name="role" label={M.roleLabel} options={ROLE_CHOICES} defaultValue="staff" size="lg" />
        <div>
          <SubmitButton />
        </div>
      </ActionForm>
      {state?.ok && state.invitePath && (
        <div className="flex flex-col gap-2">
          <FormMessage tone="success" replayKey={state.invitePath}>
            {state.message}
          </FormMessage>
          <InviteLink path={state.invitePath} />
        </div>
      )}
    </div>
  );
}

export function StaffMembers({
  shopSlug,
  members,
  meId,
  canManage,
}: {
  shopSlug: string;
  members: StaffMemberDto[];
  meId: string;
  canManage: boolean;
}) {
  const remove = removeStaffAction.bind(null, shopSlug);
  return (
    <ul className="flex flex-col gap-2.5">
      {members.map((m) => (
        <li key={m.userId} className={panelClass("flex items-center gap-3 px-4 py-3.5")}>
          <div className="min-w-0 flex-1">
            <Clamp lines={1} className="text-[14px] font-semibold text-ink">
              {m.displayName ?? m.email}
            </Clamp>
            <p className="text-[12px] text-dim">
              {ROLE_LABEL[m.role]}
              {m.userId === meId ? ` | ${M.you}` : ""}
              {m.displayName ? ` | ${m.email}` : ""}
            </p>
          </div>
          {canManage && m.role !== "owner" && m.userId !== meId && (
            <RowAction action={remove} field="userId" value={m.userId} label={M.remove} />
          )}
        </li>
      ))}
    </ul>
  );
}

export function StaffInvites({ shopSlug, invites, canManage }: { shopSlug: string; invites: StaffInviteDto[]; canManage: boolean }) {
  const revoke = revokeInviteAction.bind(null, shopSlug);
  if (invites.length === 0) return <p className="text-[13px] text-dim">{M.invitesEmpty}</p>;
  return (
    <ul className="flex flex-col gap-2.5">
      {invites.map((i) => (
        <li key={i.id} className={panelClass("flex items-center gap-3 px-4 py-3.5")}>
          <div className="min-w-0 flex-1">
            <Clamp lines={1} className="text-[14px] font-semibold text-ink">
              {i.email}
            </Clamp>
            <p className="text-[12px] text-dim">
              {ROLE_LABEL[i.role]} | {i.expired ? M.expired : `${M.expiresPrefix} ${formatDate(i.expiresAt)}`}
            </p>
          </div>
          {canManage && <RowAction action={revoke} field="inviteId" value={i.id} label={M.revoke} />}
        </li>
      ))}
    </ul>
  );
}
