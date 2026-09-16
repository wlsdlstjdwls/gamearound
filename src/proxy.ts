// 경로 가드 — 설계서 §6. (Next 16: middleware.ts → proxy.ts)
// 여기서는 세션 쿠키 "존재"만 본다(낙관적 검사, DB 조회 없음). 실제 검증, role 확인은 각 layout/page/action의 getCurrentUser()/requireRole()가 한다.
// 주의: 쿠키가 있어도 만료/폐기된 세션일 수 있으므로 "쿠키 있으면 로그인 페이지 차단" 같은 판단은 하지 않는다 — 그건 (auth)/layout.tsx 가 실제 검증 후 처리.
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_ROUTE_PREFIXES, SESSION_COOKIE_NAME, USER_ROUTE_PREFIXES, VENDOR_ROUTE_PREFIXES } from "@/lib/auth/constants";
import { ROUTES, signInPath } from "@/lib/routes";
import { GAME_VIEW_COOKIE, GAME_VIEW_COOKIE_MAX_AGE, DEFAULT_GAME_VIEW, isGameView } from "@/lib/games/view";

/** 레이아웃이 "돌아갈 경로"를 알 수 있도록 요청 헤더로 넘긴다 (headers().get(PATHNAME_HEADER)) */
export const PATHNAME_HEADER = "x-pathname";

function matches(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE_NAME)?.value);

  const needsAuth = matches(pathname, USER_ROUTE_PREFIXES) || matches(pathname, ADMIN_ROUTE_PREFIXES) || matches(pathname, VENDOR_ROUTE_PREFIXES);
  if (needsAuth && !hasSession) {
    return NextResponse.redirect(new URL(signInPath(pathname + search), req.url));
  }

  const remembered = rememberedViewRedirect(req);
  if (remembered) return remembered;

  const headers = new Headers(req.headers);
  headers.set(PATHNAME_HEADER, pathname + search);
  const res = NextResponse.next({ request: { headers } });
  rememberGameView(req, res);
  return res;
}

/**
 * 목록 보기 기억하기.
 *
 * 화면의 상태는 주소에 있다(lib/games/view). 그런데 주소를 들고 다니지 않는 길이 있다 —
 * 머리글의 "게임 목록" 링크는 언제나 맨 주소라 리스트로 보던 사람도 카드로 돌아왔다.
 *
 * 그래서 고른 값을 쿠키에 적어 두고, view 가 없는 요청만 그 주소로 되돌린다. 화면 코드는
 * 그대로다(여전히 주소만 읽는다) — 여기서 안 하고 페이지에서 쿠키를 읽으면 /games 가
 * 동적 렌더로 떨어져 목록 캐시(revalidate 3600)를 통째로 잃는다.
 *
 * 되돌리기는 한 번뿐이다: 되돌린 주소에는 view 가 있어 다시 걸리지 않는다.
 */
function rememberGameView(req: NextRequest, res: NextResponse): void {
  if (req.nextUrl.pathname !== ROUTES.game) return;

  const picked = req.nextUrl.searchParams.get("view") ?? undefined;
  if (isGameView(picked)) {
    res.cookies.set(GAME_VIEW_COOKIE, picked, { maxAge: GAME_VIEW_COOKIE_MAX_AGE, sameSite: "lax", path: "/" });
  }
}

/**
 * 주소에 보기가 없으면 기억해 둔 보기로 보낸다. 기본 보기는 주소에 안 적으므로 되돌릴 일도 없다.
 * 쿠키가 없는 쪽(처음 온 사람, 검색 로봇)은 그대로 기본 화면을 본다.
 */
function rememberedViewRedirect(req: NextRequest): NextResponse | null {
  if (req.nextUrl.pathname !== ROUTES.game) return null;
  if (req.nextUrl.searchParams.has("view")) return null;

  const saved = req.cookies.get(GAME_VIEW_COOKIE)?.value;
  if (!isGameView(saved) || saved === DEFAULT_GAME_VIEW) return null;

  const url = req.nextUrl.clone();
  url.searchParams.set("view", saved);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // 정적 파일, _next 제외. Service Worker(sw.js)와 manifest도 제외
    "/((?!_next|sw\\.js|manifest\\.webmanifest|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|css|js|map|txt|woff2?)).*)",
  ],
};
