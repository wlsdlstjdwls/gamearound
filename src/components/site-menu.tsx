"use client";
// 좁은 화면 헤더의 햄버거 메뉴 — 눌러서 바닥에서 올라오는 시트로 전체 메뉴를 편다.
//
// 왜 접었나(2026-09-15): 로고, 검색칸, 메뉴 넷을 한 줄에 세울 자리가 390px 에는 없다.
// 셋을 각자 줄로 흘려보내면 붙어 있는 머리띠가 161px 까지 자라 화면의 5분의 1을 늘 먹었고,
// 그렇다고 위시리스트, 알림을 숨기면 그 두 화면으로 가는 길이 사라졌다. 접는 쪽이 둘 다 해결한다.
//
// 넓은 화면은 이 버튼을 쓰지 않는다 — 거기서는 메뉴가 헤더에 그대로 펴져 있다(site-header).
// 시트 본체, 끌어내려 닫기, 화면이 바뀌면 같이 닫기는 ui/sheet 가 맡는다.
//
// 계정 칸을 여기 같이 두는 이유: 좁은 화면에서는 아바타 드롭다운(auth/user-menu)이 서지 않는다.
// 메뉴가 두 군데로 갈리면 "설정이 어디 있더라" 가 생긴다 — 좁은 화면의 답은 늘 이 시트 하나다.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROLE_LABEL } from "@/lib/auth/constants";
import { AUTH_MESSAGES as M } from "@/lib/auth/messages";
import { cn } from "@/lib/cn";
import { ROUTES, signInPath } from "@/lib/routes";
import { useSession } from "@/components/auth/session-provider";
import { useSignOut } from "@/components/auth/use-sign-out";
import { buttonClass } from "@/components/ui/button";
import { BellIcon, HeartIcon, LogOutIcon, MenuIcon, SpinnerIcon } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import { Clamp } from "@/components/ui/tooltip";

type MenuLink = { href: string; label: string; icon?: React.ReactNode; authOnly?: boolean; adminOnly?: boolean };

/** 시트에 서는 차례. 헤더에 펴 두는 넓은 화면 메뉴(site-header)와 같은 순서를 지킨다 */
const LINKS: MenuLink[] = [
  { href: ROUTES.game, label: "게임 목록" },
  { href: ROUTES.upcoming, label: "출시 예정" },
  { href: ROUTES.sales, label: "다음 세일" },
  { href: ROUTES.wishlist, label: "위시리스트", icon: <HeartIcon size={17} /> },
  { href: ROUTES.alerts, label: "가격 알림", icon: <BellIcon size={17} /> },
  { href: ROUTES.settings, label: "설정", authOnly: true },
  { href: ROUTES.admin, label: "관리자", authOnly: true, adminOnly: true },
];

/** 한 줄. 터치 타깃은 줄 높이가 곧바로 맡는다 — 시트 안에서는 자리를 아낄 이유가 없다 */
function Row({ href, label, icon, current }: MenuLink & { current: boolean }) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={cn(
        "flex min-h-[var(--touch-target)] items-center gap-2.5 rounded-lg px-3 text-[14px] transition-colors",
        current ? "bg-surface-2 font-semibold text-ink" : "text-mut hover:bg-surface-2 hover:text-ink",
      )}
    >
      {/* 그림이 없는 줄도 글자 시작점은 같아야 한다 — 없으면 들쭉날쭉한 계단이 된다 */}
      <span aria-hidden className="flex w-[17px] shrink-0 justify-center">
        {icon}
      </span>
      {label}
    </Link>
  );
}

export function SiteMenu() {
  const pathname = usePathname();
  const { user, status } = useSession();
  const { signOut, pending: signingOut } = useSignOut();

  const isCurrent = (href: string) => (href === ROUTES.home ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));
  const links = LINKS.filter((l) => (!l.authOnly || Boolean(user)) && (!l.adminOnly || user?.role === "admin"));
  const name = user?.displayName ?? user?.email ?? "";

  return (
    <Sheet
      title="메뉴"
      side="right"
      unstyledTrigger
      triggerClassName="flex size-[var(--touch-target)] shrink-0 items-center justify-center rounded-lg text-ink outline-none transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ink sm:hidden"
      label={
        <>
          <MenuIcon size={21} />
          <span className="sr-only">메뉴 열기</span>
        </>
      }
    >
      <nav aria-label="전체 메뉴" className="flex flex-col gap-0.5 pt-2">
        {links.map((l) => (
          <Row key={l.href} {...l} current={isCurrent(l.href)} />
        ))}
      </nav>

      {/* 세션을 아직 모르는 동안은 아무것도 약속하지 않는다 — "로그인" 을 띄웠다가 지우면 깜빡인다 */}
      {status !== "loading" && (
        <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
          {user ? (
            <>
              <div className="px-3">
                <p className="text-[13.5px] font-semibold text-ink">
                  <Clamp>{name}</Clamp>
                </p>
                <p className="text-[12px] text-dim">
                  <Clamp>{user.email}</Clamp>
                </p>
                {user.role !== "user" && (
                  <span className="mt-1 inline-block rounded-[5px] bg-acc-soft px-1.5 py-0.5 text-[11px] font-semibold text-acc">
                    {ROLE_LABEL[user.role]}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={signOut}
                disabled={signingOut}
                className="flex min-h-[var(--touch-target)] items-center gap-2 rounded-lg px-3 text-left text-[14px] text-mut transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-60"
              >
                {signingOut ? <SpinnerIcon size={17} /> : <LogOutIcon size={17} />}
                {M.signOutCta}
              </button>
            </>
          ) : (
            <>
              <Link href={signInPath(pathname)} className={buttonClass({ size: "lg", fullWidth: true })}>
                {M.signInCta}
              </Link>
              <Link href={ROUTES.signUp} className={buttonClass({ variant: "secondary", size: "lg", fullWidth: true })}>
                {M.signUpCta}
              </Link>
            </>
          )}
        </div>
      )}
    </Sheet>
  );
}
