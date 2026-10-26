"use client";
// 헤더 종 아이콘 + 알림 팝오버(기획서 v2.0 M-03). 누르면 최근 알림(가격 하락, 내 글의 새 댓글, 등록 승인)을 편다.
// 바깥 누름(mousedown + touchstart), Esc 로 닫힌다. 읽음 표시는 후속이다(기획서 M-03) — 지금은 목록만 보여 준다.
// 목록은 열 때마다 묻는다: 헤더는 모든 화면에 서서, 마운트마다 물으면 화면 이동마다 DB 왕복이 하나씩 붙는다.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useSession } from "@/components/auth/session-provider";
import { BellIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { formatPostDate } from "@/lib/format";
import { NOTIFICATION_MESSAGES as M } from "@/lib/notifications/messages";
import { ROUTES, signInPath } from "@/lib/routes";

type Item = { id: string; kind: string; body: string; link: string | null; createdAt: string };

export function NotificationBell() {
  const { user } = useSession();
  // 로그인 뒤 보던 화면으로 돌아오게 한다 — 홈으로 보내면 종을 누른 자리를 다시 찾아가야 한다
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[] | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: Event) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && user) {
      fetch("/api/me/notifications", { cache: "no-store" })
        .then((r) => (r.ok ? (r.json() as Promise<{ items: Item[] }>) : { items: [] }))
        .then((d) => setItems(d.items))
        .catch(() => setItems([]));
    }
  };

  return (
    <div ref={wrap} className="relative">
      <button
        ref={btn}
        type="button"
        aria-label={M.title}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        className={cn("press flex size-[var(--touch-target)] items-center justify-center rounded-lg transition-colors sm:size-10", open ? "bg-acc-soft text-acc" : "text-ink-2 hover:bg-surface-2 hover:text-ink")}
      >
        <BellIcon size={19} />
      </button>
      {open && (
        <div id={panelId} role="dialog" aria-label={M.title} className="animate-rise fixed inset-x-4 top-[var(--header-h)] z-50 sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+8px)] sm:w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-[var(--radius-md)] bg-surface shadow-3 ring-1 ring-line">
          <p className="border-b border-line-soft px-4 py-3 text-[14px] font-bold text-ink">{M.title}</p>
          {!user ? (
            <div className="flex flex-col gap-3 px-4 py-4">
              <p className="text-[13px] leading-[1.6] text-mut">{M.signInLead}</p>
              <Link href={signInPath(pathname || ROUTES.home)} className="w-fit text-[13.5px] font-semibold text-acc hover:underline">
                {M.signIn}
              </Link>
            </div>
          ) : items === null ? (
            <p className="px-4 py-5 text-[13px] text-dim">{M.loading}</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-5 text-[13px] text-dim">{M.empty}</p>
          ) : (
            <ul className="max-h-[min(60vh,420px)] divide-y divide-line-soft overflow-y-auto">
              {items.map((n) => {
                const body = (
                  <>
                    <span className="text-[13.5px] leading-[1.5] text-ink">{n.body}</span>
                    <span className="text-[12px] text-dim">{formatPostDate(n.createdAt)}</span>
                  </>
                );
                return (
                  <li key={n.id}>
                    {n.link ? (
                      <Link href={n.link} onClick={() => setOpen(false)} className="flex flex-col gap-1 px-4 py-3 hover:bg-surface-2">
                        {body}
                      </Link>
                    ) : (
                      <div className="flex flex-col gap-1 px-4 py-3">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <Link href={ROUTES.alerts} onClick={() => setOpen(false)} className="block border-t border-line-soft px-4 py-3 text-center text-[13px] font-semibold text-acc hover:bg-surface-2">
            {M.alertSettings}
          </Link>
        </div>
      )}
    </div>
  );
}
