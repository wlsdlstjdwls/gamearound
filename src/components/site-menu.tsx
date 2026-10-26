"use client";
// 좁은 화면(650px 이하) 머리띠의 계정 시트 — 사용자 아이콘을 누르면 오른쪽에서 시트가 열린다(목업 390 의 사용자 아이콘 메뉴).
//
// 2026-10-26 개편 2차: 메뉴 넷과 하위 칸은 시트에서 뺐다. 그 자리는 바닥 탭바(site-tabbar)와 하위 메뉴 띠(sub-nav)가 맡는다.
// 전에는 시트 하나가 메뉴 넷, 하위 칸 열넷, 계정 칸을 다 들고 있어 계정 항목이 열다섯 줄 아래 묻혔다 —
// "내 찜 목록" 하나 보러 시트를 열고 끝까지 내려야 했다. 이제 시트는 "내 것"(계정, 내 화면, 테마)만 들고 맨 위가 계정이다.
//
// 넓은 화면(651px 부터)은 이 시트를 쓰지 않는다 — 머리띠에 사용자 메뉴 드롭다운(auth-nav)과 테마 단추가 그대로 선다.
// 계정 칸이 두 군데로 갈리지 않게 폭마다 하나만 선다(시트는 tab:hidden, 드롭다운은 tab 부터).
// 항목 표는 lib/account-menu 하나를 드롭다운과 같이 읽는다. 시트 본체, 끌어내려 닫기, 화면이 바뀌면 같이 닫기는 ui/sheet 가 맡는다.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ACCOUNT_PRIMARY_COUNT, accountLinksFor, guestLinks, type AccountLink } from "@/lib/account-menu";
import { ROLE_LABEL } from "@/lib/auth/constants";
import { AUTH_MESSAGES as M } from "@/lib/auth/messages";
import { cn } from "@/lib/cn";
import { useSession } from "@/components/auth/session-provider";
import { useSignOut } from "@/components/auth/use-sign-out";
import { buttonClass } from "@/components/ui/button";
import { BellIcon, HeartIcon, LogOutIcon, ShieldIcon, SlidersIcon, SpinnerIcon, UserIcon } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import { ThemeSwitch } from "@/components/theme-switch";
import { Clamp } from "@/components/ui/tooltip";
import { Tag } from "@/components/ui/tag";

const ICON_SIZE = 17;
const LINK_ICON: Record<string, React.ReactNode> = {
  me: <UserIcon size={ICON_SIZE} />,
  wishlist: <HeartIcon size={ICON_SIZE} />,
  alerts: <BellIcon size={ICON_SIZE} />,
  settings: <SlidersIcon size={ICON_SIZE} />,
  admin: <ShieldIcon size={ICON_SIZE} />,
};

const SHEET_TITLE = "사용자 메뉴";

/** 한 줄. 터치 타깃은 줄 높이가 곧바로 맡는다 — 시트 안에서는 자리를 아낄 이유가 없다 */
function Row({ link, current }: { link: AccountLink; current: boolean }) {
  return (
    <Link
      href={link.href}
      aria-current={current ? "page" : undefined}
      className={cn(
        "flex min-h-[var(--touch-target)] items-center gap-2.5 rounded-lg px-3 text-[14px] transition-colors",
        // 지금 보고 있는 줄은 브랜드 색이다. 시트에서는 줄이 세로로 서서 글자색만으로는 약해 연한 브랜드 면을 같이 깐다
        current ? "bg-acc-soft font-semibold text-acc" : "text-mut hover:bg-surface-2 hover:text-ink",
      )}
    >
      {/* 폭을 고정한다 — 그림이 빠지는 줄이 생겨도 글자 시작점이 계단처럼 어긋나지 않는다 */}
      <span aria-hidden className="flex w-[17px] shrink-0 justify-center">
        {LINK_ICON[link.key]}
      </span>
      {link.label}
    </Link>
  );
}

/** 로그인 전 메뉴(기획서 3.1 "로그인, 계정 등록, 가격 알림"). 앞 둘은 이 시트의 주된 할 일이라 큰 단추로 세운다 */
function GuestBlock({ pathname }: { pathname: string }) {
  const [signIn, signUp, alerts] = guestLinks(pathname);
  return (
    <>
      <div className="flex flex-col gap-2">
        <Link href={signIn.href} className={buttonClass({ size: "lg", fullWidth: true })}>
          {signIn.label}
        </Link>
        <Link href={signUp.href} className={buttonClass({ variant: "secondary", size: "lg", fullWidth: true })}>
          {signUp.label}
        </Link>
      </div>
      <div className="flex flex-col gap-0.5 border-t border-line pt-3">
        {/* 가격 알림은 로그인 화면을 거쳐 열린다(lib/account-menu) — 그래서 지금 위치 표시는 하지 않는다 */}
        <Row link={alerts} current={false} />
        <ThemeSwitch withLabel />
      </div>
    </>
  );
}

function initialOf(name: string): string {
  return name.trim().slice(0, 1).toUpperCase();
}

export function SiteMenu() {
  const pathname = usePathname();
  const { user, status } = useSession();
  const { signOut, pending: signingOut } = useSignOut();

  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const links = accountLinksFor(user?.role);
  const name = user?.displayName ?? user?.email ?? "";

  return (
    <Sheet
      title={SHEET_TITLE}
      side="right"
      unstyledTrigger
      triggerClassName={cn(
        "flex size-[var(--touch-target)] shrink-0 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ink tab:hidden",
        "border border-line-strong bg-surface text-ink-2 hover:border-ink hover:text-ink",
      )}
      label={
        <>
          {/* 로그인했으면 내 사진(없으면 이름 첫 글자), 아니면 사람 그림 — 머리띠 드롭다운 단추와 같은 말이다 */}
          {user?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="" className="size-full rounded-full object-cover" />
          ) : user ? (
            <span aria-hidden className="text-[13px] font-bold">
              {initialOf(name)}
            </span>
          ) : (
            <UserIcon size={18} />
          )}
          <span className="sr-only">{SHEET_TITLE} 열기</span>
        </>
      }
    >
      {/* 세션을 아직 모르는 동안은 아무것도 약속하지 않는다 — "로그인" 을 띄웠다가 지우면 깜빡인다 */}
      {status !== "loading" && (
        <nav aria-label={SHEET_TITLE} className="flex flex-col gap-3 pt-2">
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
                  <Tag tight={false} small className="mt-1">
                    {ROLE_LABEL[user.role]}
                  </Tag>
                )}
              </div>
              {/* 기획서 3.1 순서(내 활동, 내 찜 목록, 가격 알림, 로그아웃) 다음에 우리 화면(설정, 관리자) — 드롭다운과 같다 */}
              <div className="flex flex-col gap-0.5 border-t border-line pt-3">
                {links.slice(0, ACCOUNT_PRIMARY_COUNT).map((l) => (
                  <Row key={l.key} link={l} current={isCurrent(l.href)} />
                ))}
                <button
                  type="button"
                  onClick={signOut}
                  disabled={signingOut}
                  className="flex min-h-[var(--touch-target)] items-center gap-2.5 rounded-lg px-3 text-left text-[14px] text-mut transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-60"
                >
                  <span aria-hidden className="flex w-[17px] shrink-0 justify-center">
                    {signingOut ? <SpinnerIcon size={ICON_SIZE} /> : <LogOutIcon size={ICON_SIZE} />}
                  </span>
                  {M.signOutCta}
                </button>
              </div>
              <div className="flex flex-col gap-0.5 border-t border-line pt-3">
                {links.slice(ACCOUNT_PRIMARY_COUNT).map((l) => (
                  <Row key={l.key} link={l} current={isCurrent(l.href)} />
                ))}
                {/* 좁은 화면은 머리띠에 테마 단추 자리가 없다 — 시트가 맡는다 */}
                <ThemeSwitch withLabel />
              </div>
            </>
          ) : (
            <GuestBlock pathname={pathname} />
          )}
        </nav>
      )}
    </Sheet>
  );
}
