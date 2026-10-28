"use client";
// 인디 홍보 글 한 줄의 판정 버튼 — 승인, 반려(사유), 숨기기(사유), 되살리기, 게임 연결 확인과 끊기.
// 결과를 줄 옆에 그대로 붙인다(company-resolve-button 과 같은 이유 — 큐 화면에서 무엇을 눌렀는지가 남아야 한다).
//
// **누른 순간 결과가 먼저 선다**(AGENTS §6, 2026-10-26 콘솔 손질). 앞 판은 서버가 답할 때까지 버튼을 흐리기만 해서
// Neon 왕복 동안 "눌렸나" 를 알 수 없었다. 이제 누르면 useOptimistic 으로 "승인했어요" 를 먼저 세우고 버튼을 걷는다.
// 실패하면 전환이 끝나며 낙관 값이 저절로 사라지고 버튼과 에러 문구가 돌아온다. 성공하면 서버가 다시 그린 줄이 이어받는다.
//
// 반려 사유가 비었는지는 **서버에 묻기 전에** 같은 zod 스키마로 본다 — 왕복 뒤에야 "잘못된 요청" 을 보던 자리다.
import { ADMIN_FIELD } from "@/components/admin/field";
import { useActionState, useOptimistic, useRef, useState } from "react";
import { moderateIndiePostAction, type IndieModerationState } from "@/app/(admin)/admin/indie/actions";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { INDIE_DECISION_DONE } from "@/lib/admin/messages";
import { INDIE_HIDE_REASON_MAX } from "@/lib/indie/constants";
import { INDIE_ADMIN_MESSAGES as A, INDIE_FORM_MESSAGES as F } from "@/lib/indie/messages";
import { indieModerationSchema } from "@/lib/indie/schemas";
import type { IndieAdminRowDto } from "@/lib/indie/dto";

type Decision = keyof typeof INDIE_DECISION_DONE;

function Decide({ decision, label, variant }: { decision: Decision; label: string; variant: "secondary" | "danger" | "soft" }) {
  return (
    <Button type="submit" name="decision" value={decision} size="sm" variant={variant}>
      {label}
    </Button>
  );
}

export function IndieModeration({ row }: { row: IndieAdminRowDto }) {
  const [state, formAction, pending] = useActionState<IndieModerationState, FormData>(moderateIndiePostAction, null);
  const [optimistic, setOptimistic] = useOptimistic<Decision | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const reasonRef = useRef<HTMLInputElement>(null);
  const linkPending = row.game !== null && !row.game.verified;
  const reasonId = `hide-${row.id}`;
  const errorId = `${reasonId}-error`;

  // ActionForm 이 전환 안에서 부른다 — 그래서 여기서 넣은 낙관 값은 액션이 끝날 때까지 산다
  function act(formData: FormData) {
    const parsed = indieModerationSchema.safeParse({
      postId: formData.get("postId"),
      decision: formData.get("decision"),
      reason: String(formData.get("reason") ?? ""),
    });
    if (!parsed.success) {
      setClientError(parsed.error.issues[0]?.message ?? F.badRequest);
      reasonRef.current?.focus();
      return;
    }
    setClientError(null);
    setOptimistic(parsed.data.decision);
    formAction(formData);
  }

  const error = clientError ?? (state && !state.ok ? state.error : null);

  return (
    <ActionForm action={act} state={state} pending={pending} className="flex flex-col gap-2">
      <input type="hidden" name="postId" value={row.id} />
      {optimistic ? (
        <p role="status" className="text-[12.5px] font-semibold text-ok">
          {INDIE_DECISION_DONE[optimistic]}
        </p>
      ) : (
        <>
          {(row.status === "published" || row.review === "pending") && (
            <>
              <label htmlFor={reasonId} className="sr-only">
                {row.review === "pending" ? A.rejectReason : A.hideReason}
              </label>
              <input
                ref={reasonRef}
                id={reasonId}
                name="reason"
                maxLength={INDIE_HIDE_REASON_MAX}
                placeholder={row.review === "pending" ? A.rejectReasonPlaceholder : A.hideReasonPlaceholder}
                aria-invalid={clientError ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                className={ADMIN_FIELD}
              />
            </>
          )}
          <div className="flex flex-wrap gap-1.5">
            {/* 승인 대기 글은 승인, 반려가 먼저다. 반려는 위 칸의 사유가 있어야 한다 */}
            {row.review === "pending" && <Decide decision="approve" label={A.approve} variant="soft" />}
            {row.review === "pending" && <Decide decision="reject" label={A.reject} variant="danger" />}
            {row.review !== "pending" &&
              (row.status === "published" ? <Decide decision="hide" label={A.hide} variant="danger" /> : <Decide decision="restore" label={A.restore} variant="secondary" />)}
            {linkPending && <Decide decision="verify_link" label={A.verifyLink} variant="soft" />}
            {row.game && <Decide decision="reject_link" label={A.rejectLink} variant="secondary" />}
          </div>
        </>
      )}
      {!optimistic && error && (
        <span id={errorId} role="alert" className="text-[11.5px] text-danger">
          {error}
        </span>
      )}
      {!optimistic && state?.ok && <span className="text-[11.5px] text-ok">{state.message}</span>}
    </ActionForm>
  );
}
