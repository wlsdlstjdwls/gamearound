"use client";
// 새 버전 안내(2026-10-30, fitin-app 의 웹 새로고침 창을 본떴다).
//
// 배포가 나가도 열려 있던 탭은 옛 번들을 들고 있다. 그 탭에서 화면을 옮기면 새 서버와 옛 클라이언트가 어긋나
// 버튼이 안 먹거나 화면이 통째로 새로 고쳐진다 — 사용자는 고장으로 읽는다. 먼저 말하고 새로고침을 권한다.
// 탭이 다시 보일 때(visibilitychange)와 창에 돌아올 때 /api/version 을 묻고, 간격(UPDATE_CHECK_INTERVAL_MS) 안이면 건너뛴다.
// "나중에" 는 이 탭에서만 다시 묻지 않는다 — 저장소에 남기면 다음 배포 안내까지 막힌다.
// 자리는 토스트, 끊김 띠(offline-notice)와 같은 바닥이다. 화면을 가리는 팝업으로 세우지 않는다 — 읽던 것을 끊을 만큼 급하지 않다.
import { useEffect, useRef, useState } from "react";
import { BrandSymbol } from "@/components/ui/logo";
import { UPDATE_MESSAGES as M } from "@/lib/messages";
import { CLIENT_BUILD_ID, UPDATE_CHECK_INTERVAL_MS } from "@/lib/pwa";
import { ROUTES } from "@/lib/routes";

export function UpdateNotice() {
  const [stale, setStale] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const lastChecked = useRef(0);

  useEffect(() => {
    // 로컬 개발은 배포 표식이 없다 — 견줄 것이 없으니 묻지도 않는다
    if (CLIENT_BUILD_ID === "local") return;
    const check = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastChecked.current < UPDATE_CHECK_INTERVAL_MS) return;
      lastChecked.current = now;
      fetch(ROUTES.apiVersion, { cache: "no-store" })
        .then((r) => (r.ok ? (r.json() as Promise<{ id?: string }>) : null))
        .then((v) => {
          if (v?.id && v.id !== "local" && v.id !== CLIENT_BUILD_ID) setStale(true);
        })
        // 묻다 실패하면 조용히 넘어간다 — 다음에 탭이 보일 때 다시 묻는다
        .catch(() => undefined);
    };
    check();
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, []);

  if (!stale || dismissed) return null;
  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 bottom-[var(--toast-bottom)] z-[60] flex justify-center px-4">
      <div className="animate-rise pointer-events-auto flex w-full max-w-[420px] items-center gap-3 rounded-2xl bg-ink py-2.5 pl-2.5 pr-2 text-on-ink shadow-3">
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-surface">
          <BrandSymbol size={22} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="text-[13.5px] font-bold">{M.title}</span>
          <span className="text-[12px] opacity-75">{M.body}</span>
        </span>
        <button type="button" onClick={() => setDismissed(true)} className="press tap shrink-0 rounded-lg px-2.5 text-[13px] font-semibold opacity-75 hover:opacity-100">
          {M.later}
        </button>
        <button type="button" onClick={() => window.location.reload()} className="press h-9 shrink-0 rounded-lg bg-acc px-3.5 text-[13px] font-bold text-on-ink hover:bg-acc-hover">
          {M.reload}
        </button>
      </div>
    </div>
  );
}
