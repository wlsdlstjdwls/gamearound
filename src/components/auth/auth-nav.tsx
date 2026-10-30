"use client";
// 헤더 우측 계정 자리 — 세션 확인 중엔 스켈레톤(깜빡임 방지), 비로그인은 사람 아이콘 메뉴, 로그인은 UserMenu.
//
// 비로그인도 메뉴로 접는다(기획서 v2.0 3.1 "로그인 전 로그인, 회원가입, 가격 알림", 목업의 사용자 아이콘 메뉴).
// 전에는 "가입하기" 글자와 "로그인" 단추가 머리띠에 바로 서 있었다 — 로그인 전후로 같은 자리의 모양이 달라
// 계정 메뉴가 어디 있는지 매번 새로 찾아야 했고, 기획서의 "가격 알림" 입구도 로그인 전에는 없었다.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { guestLinks } from "@/lib/account-menu";
import { cn } from "@/lib/cn";
import { useSession } from "@/components/auth/session-provider";
import { MENU_ITEM_CLASS, MENU_PANEL_CLASS, MENU_PANEL_RAIL_CLASS, type MenuPlacement, useDropdownMenu } from "@/components/auth/use-dropdown-menu";
import { UserMenu } from "@/components/auth/user-menu";
import { UserIcon } from "@/components/ui/icons";

/** 사용자 아이콘 단추의 이름 — 낭독기가 "사용자 메뉴" 로 읽는다(목업 aria-label 과 같다) */
const GUEST_MENU_LABEL = "사용자 메뉴";

function GuestMenu({ placement }: { placement: MenuPlacement }) {
  const pathname = usePathname();
  const { open, close, wrapRef, buttonProps, menuProps } = useDropdownMenu();
  return (
    <div ref={wrapRef} className="relative animate-fade-in">
      <button
        {...buttonProps}
        aria-label={GUEST_MENU_LABEL}
        className={cn(
          "press flex size-[var(--touch-target)] items-center justify-center rounded-full border bg-surface outline-none transition-colors sm:size-10",
          "focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
          open ? "border-ink text-ink" : "border-line-strong text-ink-2 hover:border-ink hover:text-ink",
        )}
      >
        <UserIcon size={18} />
      </button>
      {open && (
        <div {...menuProps} aria-label={GUEST_MENU_LABEL} className={cn(placement === "rail" ? MENU_PANEL_RAIL_CLASS : MENU_PANEL_CLASS, "py-1.5")}>
          {guestLinks(pathname).map((l) => (
            <Link key={l.key} href={l.href} role="menuitem" onClick={() => close(false)} className={MENU_ITEM_CLASS}>
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function AuthNav({ placement = "header", compact = false }: { placement?: MenuPlacement; compact?: boolean }) {
  const { user, status } = useSession();

  if (status === "loading") {
    return <span aria-hidden className="skeleton size-10 rounded-full" />;
  }
  return user ? <UserMenu user={user} placement={placement} compact={compact} /> : <GuestMenu placement={placement} />;
}
