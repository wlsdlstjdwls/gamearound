// Clerk + role 가드 — 설계서 §6. (Next 16에서 middleware.ts → proxy.ts로 이름 변경됨)
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isUserRoute = createRouteMatcher(["/wishlist(.*)", "/alerts(.*)", "/settings(.*)"]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isVendorRoute = createRouteMatcher(["/vendor(.*)"]);

export default clerkMiddleware(async (auth, req) => {
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

export const config = {
  matcher: [
    // 정적 파일·_next 제외. Service Worker(sw.js)와 manifest도 제외
    "/((?!_next|sw\\.js|manifest\\.webmanifest|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|css|js|map|txt|woff2?)).*)",
    "/(api|trpc)(.*)",
  ],
};
