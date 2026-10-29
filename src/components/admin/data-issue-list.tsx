"use client";
// 데이터 점검 줄 목록. 누르는 순간 줄이 빠지고(AGENTS §6 "누른 순간 화면이 먼저 바뀐다"), 실패하면 제자리로 돌아와 사유를 단다.
// 낱말은 스토어매칭승인관리와 같다(적용, 반려 — 승인 화면의 백오피스 낱말) — 같은 질문("이 판정이 맞나")을 같은 말로 묻는다.
import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROWS } from "@/components/ui/page";
import { decideDataIssueAction } from "@/app/(admin)/admin/data-issues/actions";
import { QUALITY_MESSAGES as M, QUALITY_RULE_LABEL } from "@/lib/admin/messages";
import { gamePath } from "@/lib/routes";
import type { DataIssueRow } from "@/server/services/admin-data-issues";

export function DataIssueList({ rows }: { rows: DataIssueRow[] }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [, start] = useTransition();

  const decide = (id: string, decision: "apply" | "dismiss") => {
    // 전환 밖에서 먼저 지운다 — 전환 안에서 바꾸면 액션이 끝날 때까지 안 그려진다(2026-10-27 실측 891ms)
    setHidden((h) => new Set(h).add(id));
    setErrors((e) => {
      const next = { ...e };
      delete next[id];
      return next;
    });
    start(async () => {
      const res = await decideDataIssueAction(id, decision);
      if (res.ok) return;
      setHidden((h) => {
        const next = new Set(h);
        next.delete(id);
        return next;
      });
      setErrors((e) => ({ ...e, [id]: res.error }));
    });
  };

  const visible = rows.filter((r) => !hidden.has(r.id));
  if (visible.length === 0) return <p className="rounded-xl bg-surface-2 px-4 py-3.5 text-[13px] text-mut">{M.empty}</p>;

  return (
    <ul className={ROWS}>
      {visible.map((r) => (
        <li key={r.id} className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-6">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-[12.5px] text-dim">
              {[QUALITY_RULE_LABEL[r.rule] ?? r.rule, r.fixable ? M.verdictCandidate : M.verdictNotify].join(" | ")}
            </span>
            <p className="text-[14px] text-ink">{r.reason}</p>
            {!r.fixable && <span className="text-[12px] text-mut">{M.noFixHint}</span>}
            {r.game && (
              <Link href={gamePath(r.game.slug)} className="self-start text-[12.5px] text-acc hover:underline">
                {M.openGame}: {r.game.title}
              </Link>
            )}
            {errors[r.id] && <span className="text-[12px] text-danger">{errors[r.id]}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {r.fixable ? (
              <>
                <Button size="sm" onClick={() => decide(r.id, "apply")} className="flex-1 md:flex-none">
                  {M.apply}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => decide(r.id, "dismiss")} className="flex-1 md:flex-none">
                  {M.dismiss}
                </Button>
              </>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => decide(r.id, "dismiss")} className="flex-1 md:flex-none">
                {M.confirmSeen}
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
