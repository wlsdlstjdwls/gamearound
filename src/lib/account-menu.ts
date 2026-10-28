// 사용자 메뉴의 항목 표(기획서 v2.0 3.1) — 머리띠 드롭다운(auth/user-menu, auth/auth-nav)과 좁은 화면 시트(site-menu)가 같이 읽는다.
// 세 곳이 따로 들고 있으면 이름, 순서가 한 군데는 반드시 어긋난다(lib/nav 와 같은 이유).
//
// "use client" 파일이 아니다 — 서버 컴포넌트가 읽어도 값이 그대로 와야 한다(AGENTS.md 6장, 2026-10-12 푸터 사고).
import { AUTH_MESSAGES } from "@/lib/auth/messages";
import { ROUTES, signInPath } from "@/lib/routes";
import { WISHLIST_MESSAGES } from "@/lib/wishlist/messages";

export type AccountLink = { key: string; href: string; label: string; adminOnly?: boolean };

/**
 * 로그인한 사람의 메뉴. 앞 셋은 기획서 순서 그대로(내 활동, 찜 목록, 가격 알림) 그다음이 로그아웃이다.
 * 설정, 관리자는 기획서 표에 없는 우리 화면이라 그 뒤에 붙인다 — 기획서가 정한 순서를 끼어들어 깨지 않는다.
 * 로그아웃은 링크가 아니라 단추라 표 밖에 두고, 그리는 쪽이 셋째 항목 뒤에 세운다(ACCOUNT_PRIMARY_COUNT).
 */
export const ACCOUNT_LINKS: readonly AccountLink[] = [
  { key: "me", href: ROUTES.me, label: "내 활동" },
  { key: "wishlist", href: ROUTES.wishlist, label: WISHLIST_MESSAGES.title },
  { key: "alerts", href: ROUTES.alerts, label: "가격 알림" },
  { key: "settings", href: ROUTES.settings, label: "설정" },
  { key: "admin", href: ROUTES.admin, label: "관리자", adminOnly: true },
];

/** 기획서 표에 있는 항목 수 — 로그아웃은 이 뒤에 선다 */
export const ACCOUNT_PRIMARY_COUNT = 3;

export function accountLinksFor(role: string | undefined): AccountLink[] {
  return ACCOUNT_LINKS.filter((l) => !l.adminOnly || role === "admin");
}

/**
 * 로그인 전 메뉴(기획서 3.1 "로그인, 계정 등록, 가격 알림").
 * 가격 알림은 로그인해야 열리는 화면이라, 로그인 화면을 거쳐 알림 화면으로 돌아오는 주소로 보낸다.
 * 로그인 항목은 지금 보던 화면으로 돌아와야 해서 주소를 받는다.
 */
export function guestLinks(here: string): AccountLink[] {
  return [
    { key: "signIn", href: signInPath(here), label: AUTH_MESSAGES.signInCta },
    { key: "signUp", href: ROUTES.signUp, label: AUTH_MESSAGES.signUpCta },
    { key: "alerts", href: signInPath(ROUTES.alerts), label: "가격 알림" },
  ];
}
