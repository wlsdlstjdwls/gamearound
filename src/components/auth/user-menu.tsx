"use client";
// 헤더 사용자 메뉴(로그인 후) — 아바타 버튼 + 드롭다운. 열고 닫기, 키보드 이동은 use-dropdown-menu 가 맡는다.
// 항목 표는 lib/account-menu 하나다(기획서 v2.0 3.1 순서: 내 활동, 내 찜 목록, 가격 알림, 로그아웃, 그 뒤에 설정, 관리자).
// 로그아웃: 서버 액션으로 세션 폐기, 클라이언트 세션 즉시 null, 홈으로 soft navigation.
import Link from "next/link";
import { ROLE_LABEL } from "@/lib/auth/constants";
import { AUTH_MESSAGES as M } from "@/lib/auth/messages";
import { ACCOUNT_PRIMARY_COUNT, accountLinksFor } from "@/lib/account-menu";
import { cn } from "@/lib/cn";
import { Clamp } from "@/components/ui/tooltip";
import type { PublicUser } from "@/server/services/users";
import { MENU_ITEM_CLASS, MENU_PANEL_CLASS, useDropdownMenu } from "@/components/auth/use-dropdown-menu";
import { useSignOut } from "@/components/auth/use-sign-out";
import { ChevronDownIcon, LogOutIcon, SpinnerIcon } from "@/components/ui/icons";
import { Tag } from "@/components/ui/tag";

function initialOf(user: PublicUser): string {
  const src = user.displayName?.trim() || user.email;
  return src.slice(0, 1).toUpperCase();
}

export function UserMenu({ user }: { user: PublicUser }) {
  const { open, close, wrapRef, buttonProps, menuProps } = useDropdownMenu();
  const { signOut, pending: signingOut } = useSignOut(() => close(false));

  const links = accountLinksFor(user.role);
  const primary = links.slice(0, ACCOUNT_PRIMARY_COUNT);
  const extra = links.slice(ACCOUNT_PRIMARY_COUNT);
  const name = user.displayName ?? user.email;

  const linkItem = (l: (typeof links)[number]) => (
    <Link key={l.key} href={l.href} role="menuitem" onClick={() => close(false)} className={MENU_ITEM_CLASS}>
      {l.label}
    </Link>
  );

  return (
    <div ref={wrapRef} className="relative">
      <button
        {...buttonProps}
        aria-label={`${name} 메뉴`}
        className={cn(
          "press flex h-9 items-center gap-2 rounded-full border pl-1 pr-2.5 outline-none transition-colors",
          "focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
          // 평소에도 흰 판을 깐다 — 머리띠가 회색 바탕(--bg)이라 투명이면 이름 글자가 바탕에 떠서 버튼으로 안 읽혔다(2026-09-30)
          "bg-surface",
          open ? "border-ink" : "border-line-strong hover:border-ink",
        )}
      >
        <span aria-hidden className="flex h-[30px] w-[30px] items-center justify-center overflow-hidden rounded-full bg-surface-3 text-[12px] font-bold text-ink-2">
          {/* 프로필 사진(내 활동에서 바꾼다). 없으면 이름 첫 글자 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="size-full object-cover" /> : initialOf(user)}
        </span>
        <span className="hidden max-w-[7rem] text-[13px] font-medium text-ink sm:block">
          <Clamp>{name}</Clamp>
        </span>
        <ChevronDownIcon size={16} className={cn("text-dim transition-transform duration-base ease-out-emph", open && "rotate-180")} />
      </button>

      {open && (
        <div {...menuProps} aria-label="내 계정" className={MENU_PANEL_CLASS}>
          <div className="border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-ink">
              <Clamp>{name}</Clamp>
            </p>
            <p className="text-xs text-dim">
              <Clamp>{user.email}</Clamp>
            </p>
            {user.role !== "user" && <Tag tight={false} small className="mt-1">{ROLE_LABEL[user.role]}</Tag>}
          </div>
          <div className="py-1.5">
            {primary.map(linkItem)}
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
          {/* 기획서 표 밖의 우리 화면(설정, 관리자)은 선 아래로 뗀다 — 기획서 넷이 한 덩어리로 읽혀야 한다 */}
          {extra.length > 0 && <div className="border-t border-line py-1.5">{extra.map(linkItem)}</div>}
        </div>
      )}
    </div>
  );
}
