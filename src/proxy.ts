// 경로 가드 — 설계서 §6. (Next 16: middleware.ts → proxy.ts)
// 여기서는 세션 쿠키 "존재"만 본다(낙관적 검사, DB 조회 없음). 실제 검증, role 확인은 각 layout/page/action의 getCurrentUser()/requireRole()가 한다.
// 주의: 쿠키가 있어도 만료/폐기된 세션일 수 있으므로 "쿠키 있으면 로그인 페이지 차단" 같은 판단은 하지 않는다 — 그건 (auth)/layout.tsx 가 실제 검증 후 처리.
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_ROUTE_PREFIXES, SESSION_COOKIE_NAME, USER_ROUTE_PREFIXES, VENDOR_ROUTE_PREFIXES } from "@/lib/auth/constants";
import { signInPath } from "@/lib/routes";

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

  const headers = new Headers(req.headers);
  headers.set(PATHNAME_HEADER, pathname + search);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    // 정적 파일, _next 제외. Service Worker(sw.js)와 manifest도 제외
    "/((?!_next|sw\\.js|manifest\\.webmanifest|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|css|js|map|txt|woff2?)).*)",
  ],
};
