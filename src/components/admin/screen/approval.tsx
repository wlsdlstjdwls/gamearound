"use client";
// 승인 화면 공통 부품 — 스토어매칭승인관리, 인디게임승인관리, 입점승인관리, 매장상품매핑관리가 같이 쓴다(2026-10-30).
//
// 백오피스 상품그룹핑승인관리 꼴: 체크 칸 그리드에서 줄을 고르고, 그리드 아래 띠에서 "처리 + 사유 + 적용" 으로 한꺼번에 판정한다.
// 앞 판은 줄마다 승인/반려 단추를 달아 한 건씩 눌러야 했고, 줄 안에 사유 칸까지 끼어 목록을 훑기 어려웠다.
//
// 처리는 화면이 넘긴 run(key, decision, reason) 을 고른 줄마다 차례로 부른다 — 각 화면의 서버 액션과 검증을 그대로 쓴다.
// 누르는 순간 그 줄들을 "처리됨" 으로 먼저 바꾸고(AGENTS §6), 실패한 줄만 되돌린 뒤 서버 값을 다시 받는다(router.refresh).
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/select/fields";
import { askConfirm } from "@/components/ui/confirm-dialog";
import { useAdminStatus } from "@/components/admin/screen/status";
import { APPROVAL_MESSAGES as M } from "@/lib/admin/messages";

export type ApprovalDecision<T> = {
  value: string;
  label: string;
  /** 사유가 꼭 있어야 하는 처리(반려, 숨김, 정지) */
  needsReason?: boolean;
  danger?: boolean;
  /** 되돌릴 걱정 없는 처리(다시 조회 등)는 묻지 않고 바로 돌린다 */
  skipConfirm?: boolean;
  /** 이 줄에 할 수 있는 처리인가. 없으면 모든 줄 */
  can?: (row: T) => boolean;
};

export type ApprovalResult = { ok: true } | { ok: false; error: string };

/** 고른 줄 묶음, 낙관 "처리됨" 표시, 일괄 실행을 쥔다. 화면은 grid 에 checked, rowTone 을 넘기고 띠에 apply 를 넘긴다 */
export function useApproval<T>({ rows, rowKey, run }: { rows: T[]; rowKey: (row: T) => string; run: (row: T, decision: string, reason: string) => Promise<ApprovalResult> }) {
  const router = useRouter();
  const { say } = useAdminStatus();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [done, setDone] = useState<Map<string, string>>(new Map());
  const [busy, startBusy] = useTransition();

  async function apply(decision: ApprovalDecision<T>, reason: string, targets: T[]) {
    const fit = targets.filter((r) => !decision.can || decision.can(r));
    if (fit.length === 0) {
      say(M.notApplicable(decision.label), "error");
      return;
    }
    if (!decision.skipConfirm && !(await askConfirm(M.confirm(decision.label, fit.length), { confirmLabel: decision.label, tone: decision.danger ? "danger" : "primary" }))) return;
    const keys = fit.map(rowKey);
    setDone((m) => new Map([...m, ...keys.map((k) => [k, decision.label] as const)]));
    say(M.working(decision.label, fit.length));
    startBusy(async () => {
      const failed: Array<{ key: string; error: string }> = [];
      for (const row of fit) {
        const res = await run(row, decision.value, reason).catch((e: unknown) => ({ ok: false as const, error: e instanceof Error ? e.message : String(e) }));
        if (!res.ok) failed.push({ key: rowKey(row), error: res.error });
      }
      setDone((m) => {
        const next = new Map(m);
        for (const f of failed) next.delete(f.key);
        return next;
      });
      setChecked(new Set());
      const ok = fit.length - failed.length;
      if (failed.length > 0) say(M.failed(failed.length, failed[0].error), "error");
      else say(M.done(decision.label, ok, targets.length - fit.length), "ok");
      router.refresh();
    });
  }

  // 서버가 다시 준 목록에 없는 줄의 표시는 버린다 — 큐에서 빠진 줄이다
  const live = new Set(rows.map(rowKey));
  const doneOf = (row: T) => (live.has(rowKey(row)) ? done.get(rowKey(row)) : undefined);
  return { checked, setChecked, doneOf, apply, busy };
}

/**
 * 그리드 아래 일괄 처리 띠. 고른 줄이 없으면 그리드에서 선택한 한 줄을 처리한다.
 * 처리 낱말은 고른 줄 가운데 하나라도 할 수 있는 것만 보인다(승인된 매장에 "승인" 을 또 묻지 않는다).
 */
export function ApprovalBar<T>({
  decisions,
  targets,
  checkedCount,
  reasonMax,
  busy,
  onApply,
}: {
  decisions: ApprovalDecision<T>[];
  targets: T[];
  checkedCount: number;
  reasonMax?: number;
  busy: boolean;
  onApply: (decision: ApprovalDecision<T>, reason: string, targets: T[]) => void;
}) {
  const { say } = useAdminStatus();
  const shown = decisions.filter((d) => targets.length === 0 || targets.some((r) => !d.can || d.can(r)));
  const [value, setValue] = useState<string>(shown[0]?.value ?? "");
  const [reason, setReason] = useState("");
  const decision = shown.find((d) => d.value === value) ?? shown[0];
  const needsReason = decisions.some((d) => d.needsReason);

  const submit = () => {
    if (!decision || targets.length === 0) return say(M.noTarget, "error");
    if (decision.needsReason && !reason.trim()) return say(M.reasonRequired(decision.label), "error");
    onApply(decision, reason.trim(), targets);
    setReason("");
  };

  return (
    <section aria-label={M.bandLabel} className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 [@media(pointer:fine)]:[&_button[aria-haspopup]]:h-9">
      <span className="min-w-[96px] text-[12.5px] font-semibold text-ink-2 tabular-nums">{M.target(targets.length, checkedCount > 0)}</span>
      <div className="w-[132px]">
        <FormSelect name="approval-decision" label={M.decision} hideLabel size="md" value={decision?.value ?? ""} onChange={setValue} options={shown.map((d) => ({ value: d.value, label: d.label }))} disabled={shown.length === 0} />
      </div>
      {needsReason && (
        <>
          <label htmlFor="approval-reason" className="sr-only">
            {M.reason}
          </label>
          <input
            id="approval-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={reasonMax}
            placeholder={M.reasonPlaceholder}
            disabled={!decision?.needsReason}
            className="h-11 min-w-0 flex-1 basis-[200px] rounded-lg border border-line bg-surface px-3 text-[16px] text-ink outline-none placeholder:text-dim focus:border-acc disabled:opacity-50 sm:text-[13px] [@media(pointer:fine)]:h-9"
          />
        </>
      )}
      <Button size="sm" variant={decision?.danger ? "danger" : "primary"} disabled={busy || !decision || targets.length === 0} onClick={submit} className="ml-auto">
        {M.apply}
      </Button>
    </section>
  );
}
