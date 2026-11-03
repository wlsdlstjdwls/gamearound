"use client";
// 회사 페이지 관리 신청 폼과 신청 상태 판. 액션은 app/(user)/companies/[slug]/actions.ts.
// 묻는 것은 심사에 필요한 것뿐이다 — 누구인지(이름, 직함, 연락 메일), 관계를 보여 줄 주소, 남길 말.
import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { applyCompanyClaimAction, withdrawCompanyClaimAction } from "@/app/(user)/companies/[slug]/actions";
import { ActionForm, useActionFormPending } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { askConfirm } from "@/components/ui/confirm-dialog";
import { FormMessage } from "@/components/ui/form-message";
import { sectionCardClass } from "@/components/ui/page";
import { Tag } from "@/components/ui/tag";
import { TEXTAREA_CLASS, TextField } from "@/components/ui/text-field";
import { COMPANY_CLAIM_MESSAGES as C } from "@/lib/companies/messages";
import { CLAIM_EMAIL_MAX, CLAIM_NAME_MAX, CLAIM_NOTE_MAX, CLAIM_TITLE_MAX, CLAIM_URL_MAX } from "@/lib/companies/schemas";
import type { MyCompanyClaim } from "@/server/services/company-claims";

function SubmitButton() {
  const pending = useActionFormPending();
  return (
    <Button type="submit" size="lg" loading={pending} loadingLabel="보내는 중" className="w-full sm:w-auto sm:min-w-[160px]">
      {C.submit}
    </Button>
  );
}

/** 반려된 신청은 적어 둔 값을 되돌려 준다 — 고쳐서 다시 내는 자리다 */
export function CompanyClaimForm({ slug, defaults }: { slug: string; defaults: Partial<MyCompanyClaim> }) {
  const [state, formAction, submitting] = useActionState(applyCompanyClaimAction, null);
  if (state?.ok) {
    return (
      <FormMessage tone="success" replayKey={state.message}>
        {state.message}
      </FormMessage>
    );
  }
  return (
    <ActionForm action={formAction} state={state} pending={submitting} className={sectionCardClass("flex flex-col gap-4")}>
      {state && !state.ok && (
        <FormMessage tone="error" replayKey={state.error}>
          {state.error}
        </FormMessage>
      )}
      <input type="hidden" name="slug" value={slug} />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField compact name="contactName" label={C.contactNameLabel} defaultValue={defaults.contactName ?? ""} maxLength={CLAIM_NAME_MAX} required autoComplete="name" />
        <TextField compact name="contactTitle" label={C.contactTitleLabel} defaultValue={defaults.contactTitle ?? ""} maxLength={CLAIM_TITLE_MAX} autoComplete="organization-title" />
        <TextField
          compact
          type="email"
          name="contactEmail"
          label={C.contactEmailLabel}
          hint={C.contactEmailHint}
          defaultValue={defaults.contactEmail ?? ""}
          maxLength={CLAIM_EMAIL_MAX}
          required
          autoComplete="email"
        />
        <TextField
          compact
          type="url"
          name="evidenceUrl"
          label={C.evidenceUrlLabel}
          placeholder={C.evidenceUrlPlaceholder}
          defaultValue={defaults.evidenceUrl ?? ""}
          maxLength={CLAIM_URL_MAX}
          inputMode="url"
          autoCapitalize="none"
          spellCheck={false}
        />
      </div>
      <div>
        <label htmlFor="claim-note" className="mb-1.5 block text-[12.5px] font-medium text-mut">
          {C.noteLabel}
        </label>
        <textarea id="claim-note" name="note" rows={3} maxLength={CLAIM_NOTE_MAX} defaultValue={defaults.note ?? ""} className={TEXTAREA_CLASS} />
      </div>
      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </ActionForm>
  );
}

const STATUS_TEXT: Record<string, string> = { pending: C.statusPending, approved: C.statusApproved, rejected: C.statusRejected };
const STATUS_TAG: Record<string, string> = { pending: C.tagPending, approved: C.tagApproved, rejected: C.tagRejected };

/** 낸 신청의 상태. 확인 중이면 취소할 수 있다 — 누르는 순간 판이 사라지고 실패하면 되돌린다(§6) */
export function CompanyClaimStatusCard({ slug, claim }: { slug: string; claim: MyCompanyClaim }) {
  const router = useRouter();
  const [gone, setGone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  if (gone) return <FormMessage tone="success">{C.withdrawn}</FormMessage>;

  const withdraw = async () => {
    if (!(await askConfirm(C.withdrawConfirm, { confirmLabel: C.withdraw, tone: "danger" }))) return;
    setGone(true);
    start(async () => {
      const r = await withdrawCompanyClaimAction(slug);
      if (!r.ok) {
        setGone(false);
        setError(r.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <section className={sectionCardClass("flex flex-col gap-2")}>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
          <Tag tone={claim.status === "rejected" ? "danger" : claim.status === "approved" ? "acc" : "neutral"}>{STATUS_TAG[claim.status] ?? claim.status}</Tag>
          {STATUS_TEXT[claim.status] ?? claim.status}
        </p>
        {claim.status === "pending" && (
          <Button variant="secondary" size="sm" onClick={withdraw}>
            {C.withdraw}
          </Button>
        )}
      </div>
      {claim.statusReason && (
        <p className="text-[13px] text-danger">
          {C.reasonLabel}: {claim.statusReason}
        </p>
      )}
      {error && <FormMessage tone="error">{error}</FormMessage>}
    </section>
  );
}
