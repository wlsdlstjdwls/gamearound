"use client";
// 헤더 사용자 메뉴 — 아바타 버튼 + 드롭다운. 바깥 클릭(mousedown+touchstart)/Esc/Tab으로 닫힘, ↑↓ 이동, 닫히면 버튼으로 포커스 복귀.
// 로그아웃: 서버 액션으로 세션 폐기 → 클라이언트 세션 즉시 null → 홈으로 soft navigation.
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ROLE_LABEL } from "@/lib/auth/constants";
import { AUTH_MESSAGES as M } from "@/lib/auth/messages";
import { cn } from "@/lib/cn";
import { Clamp } from "@/components/ui/tooltip";
import { ROUTES } from "@/lib/routes";
import type { PublicUser } from "@/server/services/users";
import { useSignOut } from "@/components/auth/use-sign-out";
import { ChevronDownIcon, LogOutIcon, SpinnerIcon } from "@/components/ui/icons";

type MenuLink = { href: string; label: string; adminOnly?: boolean };

const MENU_LINKS: MenuLink[] = [
  // 위시리스트는 숨겼다(2026-09-21) — site-header 주석 참고
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
          "press flex h-9 items-center gap-2 rounded-full border pl-1 pr-2.5 outline-none transition-colors",
          "focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
          // 평소에도 흰 판을 깐다 — 머리띠가 회색 바탕(--bg)이라 투명이면 이름 글자가 바탕에 떠서 버튼으로 안 읽혔다(2026-09-30)
          "bg-surface",
          open ? "border-ink" : "border-line-strong hover:border-ink",
        )}
      >
        <span aria-hidden className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-surface-3 text-[12px] font-bold text-ink-2">
          {initialOf(user)}
        </span>
        <span className="hidden max-w-[7rem] text-[13px] font-medium text-ink sm:block">
          <Clamp>{name}</Clamp>
        </span>
        <ChevronDownIcon size={16} className={cn("text-dim transition-transform duration-base ease-out-emph", open && "rotate-180")} />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={id}
          role="menu"
          aria-label="내 계정"
          onKeyDown={onMenuKey}
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-60 origin-top-right animate-scale-in overflow-hidden rounded-[var(--radius-md)] border border-line-strong bg-surface"
        >
          <div className="border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-ink">
              <Clamp>{name}</Clamp>
            </p>
            <p className="text-xs text-dim">
              <Clamp>{user.email}</Clamp>
            </p>
            {user.role !== "user" && <span className="mt-1 inline-block rounded-[5px] bg-acc-soft px-1.5 py-0.5 text-[11px] font-semibold text-acc">{ROLE_LABEL[user.role]}</span>}
          </div>
          <div className="py-1.5">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                role="menuitem"
                onClick={() => close(false)}
                className="flex min-h-[var(--touch-target)] items-center px-4 text-[13px] text-mut outline-none transition-colors hover:bg-surface-2 hover:text-ink focus-visible:bg-surface-2 focus-visible:text-ink"
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
              className="flex min-h-[var(--touch-target)] w-full items-center gap-2 px-4 text-left text-[13px] text-mut outline-none transition-colors hover:bg-danger-soft hover:text-danger focus-visible:bg-danger-soft focus-visible:text-danger disabled:opacity-60"
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
