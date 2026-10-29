"use client";
// 관리자 화면 하단 상태줄 — 방금 무엇을 했는지 한 줄로 남긴다("20건 조회됐어요", "저장했어요").
//
// 신세계TV 백오피스는 모든 창 바닥에 이 줄이 있고 조회, 저장 결과를 여기에 쓴다(SBO CwareStore 의 "{0}건 조회 되었습니다.").
// 토스트처럼 사라지지 않는다 — 다른 일을 하다 돌아와도 마지막 처리가 무엇이었는지 읽힌다.
// 화면 머리(head)와 폼들이 useAdminStatus().say 로 쓰고, 레이아웃이 판 바닥에 줄 하나를 세운다.
import { createContext, use, useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { SCREEN_MESSAGES as M } from "@/lib/admin/messages";

type Tone = "info" | "ok" | "error";
type Status = { text: string; tone: Tone; at: number };
type Ctx = { status: Status | null; say: (text: string, tone?: Tone) => void };

const StatusContext = createContext<Ctx>({ status: null, say: () => {} });

export function AdminStatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status | null>(null);
  const say = useCallback((text: string, tone: Tone = "info") => setStatus({ text, tone, at: Date.now() }), []);
  const value = useMemo(() => ({ status, say }), [status, say]);
  return <StatusContext value={value}>{children}</StatusContext>;
}

export function useAdminStatus() {
  return use(StatusContext);
}

const TONE: Record<Tone, string> = { info: "text-mut", ok: "text-ok", error: "text-danger" };

/**
 * 판 바닥에 붙어 따라오는 줄(sticky). 높이가 작아 본문을 거의 가리지 않는다.
 * 할 말이 생기기 전에는 보이지 않는다(2026-10-30, 사용자 "준비됐어요 같은 문구는 굳이?"). 낭독기 알림 자리는 그대로 둬야
 * 첫 "조회됐어요" 도 읽히므로 줄을 지우지 않고 sr-only 로 접는다.
 */
export function AdminStatusBar() {
  const { status } = useAdminStatus();
  return (
    <div
      role="status"
      aria-label={M.statusLabel}
      className={cn(
        !status && "sr-only",
        status &&
          "sticky bottom-0 z-10 -mx-4 -mb-4 flex min-h-8 items-center justify-between gap-3 rounded-b-[var(--radius-panel)] border-t border-line-soft bg-surface/95 px-4 text-[12px] backdrop-blur sm:-mx-5 sm:-mb-5 sm:px-5",
      )}
    >
      <span className={cn("min-w-0 truncate", status && TONE[status.tone])}>{status?.text}</span>
      {status && (
        <time className="shrink-0 tabular-nums text-dim-2" dateTime={new Date(status.at).toISOString()}>
          {new Date(status.at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </time>
      )}
    </div>
  );
}
