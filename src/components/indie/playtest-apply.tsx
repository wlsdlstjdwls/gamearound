"use client";
// 인디 상세의 플레이테스트 신청 판(2026-10-27, 기획서 3장 5번). 모집 안내, 마감, 신청 수, 한마디 칸과 신청 단추.
//
// 누른 순간 "신청했어요" 로 바뀌고 신청 수가 하나 오른다. 실패하면 되돌리고 까닭을 말한다(AGENTS 6장 "서버 액션으로 바꾸는 자리").
// 낙관 표시는 전환 밖에서 먼저 바꾼다 — 전환 안에서 바꾸면 액션이 끝날 때까지 안 그려진다(2026-10-27 결제 화면에서 891ms 잰 함정).
// 신청은 한마디가 있어야 해서 로그인 전 사람은 로그인 창부터 연다(useLoginGate). 로그인 뒤 이어서 신청하지는 않는다 — 한마디를 다시 적어야 한다.
// 글쓴이 본인에게는 단추 대신 관리 화면 길을 둔다.
import Link from "next/link";
import { useState, useTransition } from "react";
import { applyPlaytestAction, withdrawPlaytestAction } from "@/app/(public)/playtests/actions";
import { useLoginGate } from "@/components/auth/login-gate";
import { useSession } from "@/components/auth/session-provider";
import { Button, buttonClass } from "@/components/ui/button";
import { FIELD_HINT_CLASS, FIELD_LABEL_CLASS } from "@/components/ui/field-classes";
import { Tag } from "@/components/ui/tag";
import { TEXTAREA_CLASS } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/format";
import { PLAYTEST_MESSAGE_MAX, playtestPhase } from "@/lib/indie/playtest";
import { PLAYTEST_MESSAGES as M, PLAYTEST_PHASE_LABEL } from "@/lib/indie/playtest-messages";
import { indiePlaytestPath } from "@/lib/routes";

type Props = {
  postId: string;
  isOwner: boolean;
  playtest: { id: string; title: string; body: string; slots: number; applicants: number; closesAt: Date; applied: boolean };
};

export function PlaytestApply({ postId, isOwner, playtest: p }: Props) {
  const { user } = useSession();
  const gate = useLoginGate();
  const toast = useToast();
  const [applied, setApplied] = useState(p.applied);
  const [count, setCount] = useState(p.applicants);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  // 마감 시각은 화면을 연 순간 기준이다. 열어 둔 채 마감이 지나면 신청이 서버에서 거절되고 까닭이 뜬다
  const phase = playtestPhase({ closesAt: p.closesAt, closedAt: null, slots: p.slots, applicants: count }, new Date());

  const apply = () => {
    setApplied(true);
    setCount((n) => n + 1);
    setError(null);
    start(async () => {
      const r = await applyPlaytestAction({ playtestId: p.id, message }).catch(() => ({ ok: false as const, error: M.failed }));
      if (r.ok) return toast(M.applied);
      setApplied(false);
      setCount((n) => n - 1);
      setError(r.error);
    });
  };

  const withdraw = () => {
    setApplied(false);
    setCount((n) => n - 1);
    start(async () => {
      const r = await withdrawPlaytestAction(p.id).catch(() => ({ ok: false as const, error: M.failed }));
      if (r.ok) return toast(M.withdrawn);
      setApplied(true);
      setCount((n) => n + 1);
      toast(r.error);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone={phase === "open" ? "ok" : "warn"}>{PLAYTEST_PHASE_LABEL[phase]}</Tag>
        <span className="text-[15px] font-bold text-ink">{p.title}</span>
      </div>
      <p className="text-[12.5px] tabular-nums text-dim">{[M.closesAt(formatDate(p.closesAt)), M.applicants(count, p.slots)].join(" | ")}</p>
      <p className="max-w-[720px] whitespace-pre-line text-[14.5px] leading-[1.75] text-ink-2">{p.body}</p>

      {isOwner ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3">
          <span className="text-[13px] text-mut">{M.ownerNote}</span>
          <Link href={indiePlaytestPath(postId)} className={buttonClass({ variant: "secondary", size: "sm" })}>
            {M.manage}
          </Link>
        </div>
      ) : applied ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ok-soft px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="animate-pop text-[14px] font-bold text-ok">{M.applied}</span>
            <span className="text-[12.5px] text-mut">{M.appliedNote}</span>
          </div>
          <Button size="sm" variant="secondary" onClick={withdraw}>
            {M.withdraw}
          </Button>
        </div>
      ) : phase === "open" ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            gate(`playtest:${p.id}`, apply);
          }}
        >
          {user && (
            <>
              <label htmlFor="playtest-message" className={FIELD_LABEL_CLASS}>
                {M.messageLabel}
              </label>
              <textarea
                id="playtest-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={PLAYTEST_MESSAGE_MAX}
                rows={3}
                required
                aria-describedby={error ? "playtest-message-hint playtest-error" : "playtest-message-hint"}
                aria-invalid={error ? true : undefined}
                className={TEXTAREA_CLASS}
              />
              <p id="playtest-message-hint" className={FIELD_HINT_CLASS}>
                {M.messageHint}
              </p>
            </>
          )}
          {error && (
            <p id="playtest-error" role="alert" className="text-[12.5px] text-danger">
              {error}
            </p>
          )}
          <Button type="submit" variant="accent" className="self-start">
            {user ? M.apply : M.signIn}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
