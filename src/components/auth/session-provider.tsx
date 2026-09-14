"use client";
// 클라이언트 세션 상태 — 헤더, 버튼 등 UI 게이팅 전용. 실제 권한 검증은 서버(getCurrentUser/requireRole)가 한다.
// 루트 레이아웃에서 cookies()를 읽으면 홈 풀 라우트 캐시가 깨지므로 /api/auth/me 를 마운트 후 호출한다.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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

async function fetchMe(signal?: AbortSignal): Promise<PublicUser | null> {
  try {
    const res = await fetch(ROUTES.apiAuthMe, { cache: "no-store", credentials: "same-origin", signal });
    if (!res.ok) return null;
    const body = (await res.json()) as { user: PublicUser | null };
    return body.user ?? null;
  } catch {
    return null;
  }
}

export function SessionProvider({ children, initialUser = null }: { children: ReactNode; initialUser?: PublicUser | null }) {
  const [user, setUser] = useState<PublicUser | null>(initialUser);
  const [status, setStatus] = useState<SessionStatus>(initialUser ? "ready" : "loading");

  const refresh = useCallback(async () => {
    setUser(await fetchMe());
    setStatus("ready");
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    fetchMe(ac.signal).then((u) => {
      if (ac.signal.aborted) return;
      setUser(u);
      setStatus("ready");
    });
    return () => ac.abort();
  }, []);

  // 다른 탭에서 로그인/로그아웃하면 따라간다 (bfcache 복귀 포함)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  const value = useMemo<SessionState>(() => ({ user, status, refresh, setUser }), [user, status, refresh]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession은 SessionProvider 안에서만 쓸 수 있습니다");
  return ctx;
}
