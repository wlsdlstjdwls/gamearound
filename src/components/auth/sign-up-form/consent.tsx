"use client";
// 가입 동의 넷(기획서 v2.0 S-27, 목업 regv): 전체 동의, 이용약관(필수), 개인정보(필수), 가격 알림 이메일(선택).
// 두 문서는 링크다 — 동의하기 전에 읽을 길이 있어야 한다. 새 창으로 여는 이유: 같은 창에서 나가면 여기까지 채운 칸이 전부 날아간다.
// 세 칸의 상태는 폼이 쥔다 — "전체 동의" 가 셋을 한 번에 켜고 끄고, 셋이 다 켜지면 전체 동의도 켜져 보여야 하며, 가입 단추 판정도 그 상태를 본다
import Link from "next/link";
import type { ChangeEvent, FocusEvent } from "react";
import { AUTH_MESSAGES as M } from "@/lib/auth/messages";
import { ROUTES } from "@/lib/routes";
import { Checkbox } from "@/components/ui/checkbox";

export type Agree = { terms: boolean; privacy: boolean; alertEmail: boolean };
type FieldProps = { onChange: (e: ChangeEvent<HTMLInputElement>) => void; onBlur: (e: FocusEvent<HTMLInputElement>) => void; error: string | null };

export function SignUpConsent({ agree, setAgree, busy, terms, privacy }: { agree: Agree; setAgree: (next: (a: Agree) => Agree) => void; busy: boolean; terms: FieldProps; privacy: FieldProps }) {
  const all = agree.terms && agree.privacy && agree.alertEmail;
  return (
    <fieldset className="flex flex-col rounded-[var(--radius-md)] bg-surface-2 px-3.5 py-2">
      <legend className="sr-only">{M.consentAll}</legend>
      <Checkbox dense checked={all} disabled={busy} onChange={(e) => { const on = e.currentTarget.checked; setAgree(() => ({ terms: on, privacy: on, alertEmail: on })); }}>
        <span className="font-bold text-ink">{M.consentAll}</span>
      </Checkbox>
      <div className="my-0.5 border-t border-line" />
      <Checkbox
        dense
        name="terms"
        checked={agree.terms}
        disabled={busy}
        onChange={(e) => {
          const on = e.currentTarget.checked;
          setAgree((a) => ({ ...a, terms: on }));
          terms.onChange(e);
        }}
        onBlur={terms.onBlur}
        error={terms.error}
      >
        <span className="text-ink">{M.consentRequired}</span>{" "}
        <Link href={ROUTES.terms} target="_blank" rel="noreferrer" className="font-semibold text-acc-hover underline underline-offset-4">
          {M.termsDocLabel}
          <span className="sr-only"> (새 창에서 열림)</span>
        </Link>
        {M.termsConsentTail}
      </Checkbox>
      <Checkbox
        dense
        name="privacy"
        checked={agree.privacy}
        disabled={busy}
        onChange={(e) => {
          const on = e.currentTarget.checked;
          setAgree((a) => ({ ...a, privacy: on }));
          privacy.onChange(e);
        }}
        onBlur={privacy.onBlur}
        error={privacy.error}
      >
        <span className="text-ink">{M.consentRequired}</span>{" "}
        <Link href={ROUTES.privacy} target="_blank" rel="noreferrer" className="font-semibold text-acc-hover underline underline-offset-4">
          {M.privacyConsentLabel}
          <span className="sr-only"> (새 창에서 열림)</span>
        </Link>
        {M.termsConsentTail}
      </Checkbox>
      <Checkbox dense name="alertEmail" checked={agree.alertEmail} disabled={busy} onChange={(e) => { const on = e.currentTarget.checked; setAgree((a) => ({ ...a, alertEmail: on })); }}>
        <span className="text-ink">{M.consentOptional}</span> {M.alertEmailConsent}
      </Checkbox>
    </fieldset>
  );
}
