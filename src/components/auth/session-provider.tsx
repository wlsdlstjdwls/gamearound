"use client";
// 클라이언트 세션 상태 — 헤더, 버튼 등 UI 게이팅 전용. 실제 권한 검증은 서버(getCurrentUser/requireRole)가 한다.
// 루트 레이아웃에서 cookies()를 읽으면 홈 풀 라우트 캐시가 깨지므로 /api/auth/me 를 마운트 후 호출한다.
//
// **"모른다" 를 "비로그인" 으로 읽지 않는다.** 이 화면의 로그인 표시는 요청 한 번에 통째로 매여 있다.
// 그 한 번이 실패했을 때 null 로 적어 버리면 머리글이 "로그인" 버튼인 채로 굳고, 사람이 새로고침하기
// 전까지 풀리지 않는다 — 로그인은 됐는데 머리글만 안 바뀌는 상태가 이것이다(2026-09-21 실측).
// 그래서 응답을 세 갈래로 읽는다: 사용자 있음 / 사용자 없음(200) / 못 물어봄(실패).
// 못 물어본 경우에는 몇 번 더 묻고, 그래도 안 되면 **직전 값을 그대로 둔다**.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { SESSION_PROBE_BACKOFF_MS, SESSION_PROBE_RETRIES } from "@/lib/auth/constants";
import { sleep } from "@/lib/async";
import { ROUTES } from "@/lib/routes";
import type { PublicUser } from "@/server/services/users";

export type SessionStatus = "loading" | "ready";

type SessionState = {
  user: PublicUser | null;
  status: SessionStatus;
  /** 서버에 다시 물어본다 (로그인/로그아웃 직후) */
  refresh: () => Promise<void>;
  /** 서버 왕복 없이 즉시 반영 (로그아웃 후 null 등) */
  setUser: (u: PublicUser | null) => void;
};

const SessionContext = createContext<SessionState | null>(null);

/** 물어본 결과. `unknown` 은 "세션이 없다" 가 아니라 "못 물어봤다" 다 */
type Probe = { known: true; user: PublicUser | null } | { known: false };

async function probeOnce(signal?: AbortSignal): Promise<Probe> {
  try {
    const res = await fetch(ROUTES.apiAuthMe, { cache: "no-store", credentials: "same-origin", signal });
    // 5xx, 네트워크 끊김, 배포 교체 순간 등 — 세션 유무를 말해 주지 않은 응답이다
    if (!res.ok) return { known: false };
    const body = (await res.json()) as { user: PublicUser | null };
    return { known: true, user: body.user ?? null };
  } catch {
    return { known: false };
  }
}

/** 못 물어보면 몇 번 더. 중간에 취소되면 그 자리에서 그만둔다 */
async function probe(signal?: AbortSignal): Promise<Probe> {
  for (let attempt = 0; attempt < SESSION_PROBE_RETRIES; attempt++) {
    const r = await probeOnce(signal);
    if (r.known || signal?.aborted) return r;
    if (attempt < SESSION_PROBE_RETRIES - 1) await sleep(SESSION_PROBE_BACKOFF_MS * 2 ** attempt);
  }
  return { known: false };
}

export function SessionProvider({ children, initialUser = null }: { children: ReactNode; initialUser?: PublicUser | null }) {
  const [user, setUser] = useState<PublicUser | null>(initialUser);
  const [status, setStatus] = useState<SessionStatus>(initialUser ? "ready" : "loading");

  /*
   * 겹쳐 도는 질문 중 **마지막 것만** 반영한다. 로그인 직후에는 마운트 질문과 갱신 질문이 겹치는데,
   * 먼저 나간 질문(옛 쿠키)이 늦게 도착하면 방금 받은 사용자를 null 로 덮어쓴다.
   */
  const seq = useRef(0);

  const apply = useCallback((r: Probe, mine: number) => {
    if (mine !== seq.current) return;
    // 못 물어봤으면 직전 값을 지킨다 — 모르는 것과 없는 것은 다르다
    if (r.known) setUser(r.user);
    setStatus("ready");
  }, []);

  const refresh = useCallback(async () => {
    const mine = ++seq.current;
    apply(await probe(), mine);
  }, [apply]);

  useEffect(() => {
    const ac = new AbortController();
    const mine = ++seq.current;
    void probe(ac.signal).then((r) => {
      if (!ac.signal.aborted) apply(r, mine);
    });
    return () => ac.abort();
  }, [apply]);

  /*
   * 다른 탭에서 로그인/로그아웃하면 따라간다. 돌아왔을 때 다시 묻는 자리가
   * "머리글이 잘못 굳었을 때 스스로 풀리는" 유일한 길이기도 하다 — focus 까지 같이 듣는 이유다
   * (탭을 떠나지 않고 창만 오갔을 때는 visibilitychange 가 오지 않는다).
   */
  useEffect(() => {
    const onWake = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    return () => {
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
    };
  }, [refresh]);

  const value = useMemo<SessionState>(() => ({ user, status, refresh, setUser }), [user, status, refresh]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession은 SessionProvider 안에서만 쓸 수 있습니다");
  return ctx;
}
