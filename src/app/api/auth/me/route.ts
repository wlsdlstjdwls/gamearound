// GET /api/auth/me — 헤더(SessionProvider)가 클라이언트에서 호출 (§5.2: 브라우저 fetch → Route Handler).
// 루트 레이아웃에서 cookies()를 읽으면 홈의 풀 라우트 캐시(revalidate=3600)가 깨지므로 세션 표시는 이 엔드포인트로 분리한다.
import { NextResponse } from "next/server";
import { getCurrentUser, toPublicUser } from "@/server/services/users";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({ user: user ? toPublicUser(user) : null }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    // DB 미연결 등 — 비로그인으로 취급해 UI가 멈추지 않게
    console.error("[auth/me] 조회 실패:", e instanceof Error ? e.message : e);
    return NextResponse.json({ user: null }, { headers: { "cache-control": "no-store" } });
  }
}
