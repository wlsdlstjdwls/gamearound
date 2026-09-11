// Clerk + role 가드 — 설계서 §6. (Next 16에서 middleware.ts → proxy.ts로 이름 변경됨)
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_DISABLED } from "@/lib/auth-flag";

const isUserRoute = createRouteMatcher(["/wishlist(.*)", "/alerts(.*)", "/settings(.*)"]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isVendorRoute = createRouteMatcher(["/vendor(.*)"]);
const isAuthPage = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

const withClerk = clerkMiddleware(async (auth, req) => {
  if (isUserRoute(req)) {
    await auth.protect();
    return NextResponse.next();
  }
  if (isAdminRoute(req) || isVendorRoute(req)) {
    const { userId, sessionClaims, redirectToSignIn } = await auth();
    if (!userId) return redirectToSignIn({ returnBackUrl: req.url });
    const meta = (sessionClaims?.publicMetadata ?? {}) as { role?: string };
    const role = meta.role ?? "user";
    const allowed = isAdminRoute(req) ? role === "admin" : role === "game_company" || role === "seller" || role === "admin";
    if (!allowed) return NextResponse.rewrite(new URL("/403", req.url), { status: 403 });
  }
  return NextResponse.next();
});

// AUTH_DISABLED: Clerk 미들웨어를 타지 않음. 로그인이 전제인 경로는 전부 홈으로 보냄 (관리자 경로 노출 방지).
function withoutAuth(req: NextRequest) {
  if (isUserRoute(req) || isAdminRoute(req) || isVendorRoute(req) || isAuthPage(req)) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
}

export default AUTH_DISABLED ? withoutAuth : withClerk;

export const config = {
  matcher: [
    // 정적 파일·_next 제외. Service Worker(sw.js)와 manifest도 제외
    "/((?!_next|sw\.js|manifest\.webmanifest|.*\.(?:png|jpg|jpeg|gif|svg|ico|webp|css|js|map|txt|woff2?)).*)",
    "/(api|trpc)(.*)",
  ],
};
