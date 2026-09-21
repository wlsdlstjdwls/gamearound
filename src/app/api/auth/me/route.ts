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
    /*
     * DB 미연결 등 — **비로그인으로 내려보내지 않는다.**
     * 예전에는 여기서 200 + user:null 을 줬다. 그러면 헤더가 "로그인" 버튼으로 그려지고,
     * 클라이언트는 그게 진짜 비로그인인지 그냥 못 물어본 건지 구분할 길이 없어 새로고침 전까지 굳는다.
     * 503 으로 답하면 SessionProvider 가 "모른다" 로 읽고 다시 묻는다(직전 표시를 지키면서).
     */
    console.error("[auth/me] 조회 실패:", e instanceof Error ? e.message : e);
    return NextResponse.json({ user: null, error: true }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
