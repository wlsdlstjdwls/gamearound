"use client";
// 열린 업무관리 판이 남의 고침을 알아채게 한다(2026-11-04, 사용자 "업무관리 화면에서 실시간 데이터 반영이 안 된다").
//
// 판 번호(server/services/admin-tasks/live)만 짧게 묻고, 바뀌었을 때만 router.refresh 로 두 보기를 다시 읽는다.
// 판 자료를 통째로 주기적으로 다시 읽지 않는 이유: 한 번 읽는 데 Neon 질의가 여럿이고, 열어 둔 탭이 compute 를 내내 깨워 둔다(neon-compute-quota).
// 처음 번호는 페이지가 그릴 때 함께 실어 온다(initial). 제 고침은 액션이 번호를 올린 뒤 화면을 다시 그리므로 새 initial 이 와서 한 번 더 읽지 않는다.
//
// 지금 다시 읽으면 손에 든 것이 날아가는 때는 미룬다 — 다음 물음에서 다시 본다:
//   저장 안 한 값(일정 끌기, 고치기 = program-shell 의 dirty), 글자를 치는 중(입력 칸에 초점), 누르고 있는 중(카드 끌기).
// 화면이 안 보이면 묻지 않고, 다시 보이는 순간 한 번 묻는다(다른 탭에 있다 돌아왔을 때 가장 먼저 맞춘다).
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDirty } from "@/components/admin/program-shell/store";
import { ROUTES } from "@/lib/routes";

/** 묻는 간격. 옆자리 사람이 카드를 옮기고 "봤어요?" 라고 물을 즈음에는 와 있어야 한다. 묻는 길은 Redis 하나라 싸다 */
const POLL_MS = 10_000;

function busy(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT";
}

export function useWorkLive(initial: number | null) {
  const router = useRouter();
  const dirty = useDirty();
  const known = useRef(initial);
  const dirtyRef = useRef(dirty);
  const pressing = useRef(false);

  useEffect(() => {
    known.current = initial;
  }, [initial]);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    let stopped = false;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      const res = await fetch(ROUTES.apiAdminWorkVersion, { cache: "no-store" }).catch(() => null);
      const v = res?.ok ? ((await res.json().catch(() => null)) as { version: number | null } | null)?.version : null;
      if (stopped || v == null || v === known.current) return;
      if (dirtyRef.current || pressing.current || busy()) return;
      known.current = v;
      router.refresh();
    };
    const timer = setInterval(check, POLL_MS);
    const onShow = () => void check();
    const down = () => (pressing.current = true);
    const up = () => (pressing.current = false);
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("focus", onShow);
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("focus", onShow);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [router]);
}
