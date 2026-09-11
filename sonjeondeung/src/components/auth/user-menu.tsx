"use client";
// 헤더 사용자 메뉴 — 아바타 버튼 + 드롭다운. 바깥 클릭(mousedown+touchstart)/Esc/Tab으로 닫힘, ↑↓ 이동, 닫히면 버튼으로 포커스 복귀.
// 로그아웃: 서버 액션으로 세션 폐기 → 클라이언트 세션 즉시 null → 홈으로 soft navigation.
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ROLE_LABEL } from "@/lib/auth/constants";
import { AUTH_MESSAGES as M } from "@/lib/auth/messages";
import { cn } from "@/lib/cn";
import { ROUTES } from "@/lib/routes";
import type { PublicUser } from "@/server/services/users";
import { useSignOut } from "@/components/auth/use-sign-out";
import { ChevronDownIcon, LogOutIcon, SpinnerIcon } from "@/components/ui/icons";

type MenuLink = { href: string; label: string; adminOnly?: boolean };

const MENU_LINKS: MenuLink[] = [
  { href: ROUTES.wishlist, label: "위시리스트" },
  { href: ROUTES.alerts, label: "가격 알림" },
  { href: ROUTES.settings, label: "설정" },
  { href: ROUTES.admin, label: "관리자", adminOnly: true },
];

function initialOf(user: PublicUser): string {
  const src = user.displayName?.trim() || user.email;
  return src.slice(0, 1).toUpperCase();
}

export function UserMenu({ user }: { user: PublicUser }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const { signOut, pending: signingOut } = useSignOut(() => setOpen(false));
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const links = MENU_LINKS.filter((l) => !l.adminOnly || user.role === "admin");

  const close = useCallback((focusBack = true) => {
    setOpen(false);
    if (focusBack) btnRef.current?.focus();
  }, []);

  // 바깥 클릭 — 터치 기기는 mousedown이 늦게 오므로 touchstart도 함께
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  // 열리면 첫 항목으로 포커스
  useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open]);

  const items = () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

  const onMenuKey = (e: KeyboardEvent) => {
    const list = items();
    const idx = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key === "Tab") { setOpen(false); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); list[(idx + 1) % list.length]?.focus(); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); list[(idx - 1 + list.length) % list.length]?.focus(); return; }
    if (e.key === "Home") { e.preventDefault(); list[0]?.focus(); return; }
    if (e.key === "End") { e.preventDefault(); list[list.length - 1]?.focus(); }
  };

  const onButtonKey = (e: KeyboardEvent) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      setOpen(true);
    }
  };

  const name = user.displayName ?? user.email;

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onButtonKey}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={`${name} 메뉴`}
        className={cn(
          "press flex h-10 items-center gap-2 rounded-full border pl-1 pr-2 outline-none transition-colors",
          "focus-visible:ring-2 focus-visible:ring-acc focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
          open ? "border-acc/60 bg-surface" : "border-line-strong hover:border-acc/60 hover:bg-surface",
        )}
      >
        <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-acc text-sm font-bold text-slate-950">
          {initialOf(user)}
        </span>
        <span className="hidden max-w-[7rem] truncate text-sm font-medium text-ink sm:block">{name}</span>
        <ChevronDownIcon size={16} className={cn("text-dim transition-transform duration-base ease-out-emph", open && "rotate-180")} />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={id}
          role="menu"
          aria-label="내 계정"
          onKeyDown={onMenuKey}
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-60 origin-top-right animate-scale-in overflow-hidden rounded-[var(--radius-lg)] border border-line-strong bg-surface shadow-[0_18px_50px_-18px_rgba(0,0,0,0.8)]"
        >
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold text-ink">{name}</p>
            <p className="truncate text-xs text-dim">{user.email}</p>
            {user.role !== "user" && <span className="mt-1 inline-block rounded-md bg-acc/15 px-1.5 py-0.5 text-[11px] font-semibold text-acc-hover">{ROLE_LABEL[user.role]}</span>}
          </div>
          <div className="py-1.5">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                role="menuitem"
                onClick={() => close(false)}
                className="flex min-h-[var(--touch-target)] items-center px-4 text-sm text-slate-200 outline-none transition-colors hover:bg-surface-2 hover:text-acc-hover focus-visible:bg-surface-2 focus-visible:text-acc-hover"
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div className="border-t border-line py-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={signOut}
              disabled={signingOut}
              className="flex min-h-[var(--touch-target)] w-full items-center gap-2 px-4 text-left text-sm text-mut outline-none transition-colors hover:bg-danger/10 hover:text-danger focus-visible:bg-danger/10 focus-visible:text-danger disabled:opacity-60"
            >
              {signingOut ? <SpinnerIcon size={16} /> : <LogOutIcon size={16} />}
              {M.signOutCta}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
