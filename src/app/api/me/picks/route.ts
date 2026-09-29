// GET /api/me/picks — 홈 "지금 할인 중" 줄(HomeDeals)이 마운트 뒤 부른다(설계 §9 의 4회차).
// 개인화한 사람이면 취향으로 다시 짠 HOME_LIMIT 칸을, 아니면 null 을 준다 — null 이면 서버가 그린 공통 줄이 그대로 남는다.
// 홈 본문은 풀 라우트 캐시(revalidate=3600)라 cookies() 를 읽을 수 없다 — /api/auth/me 와 같은 이유로 따로 뺐다.
import { NextResponse } from "next/server";
import { errorMessage } from "@/lib/errors";
import { getMyHomeDeals } from "@/server/services/profiles";
import { getCurrentUser } from "@/server/services/users";

export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "private, no-store" };

export async function GET() {
  try {
    // 비로그인, 개인화 미동의는 오류가 아니다 — 공통 줄을 그대로 두면 되는 "없음" 이다
    if (!(await getCurrentUser())) return NextResponse.json({ deals: null }, { headers: NO_STORE });
    return NextResponse.json({ deals: await getMyHomeDeals() }, { headers: NO_STORE });
  } catch (e) {
    // 공통 줄이 이미 떠 있으니 실패해도 화면을 흔들지 않는다. 클라이언트는 503 을 "갈아 끼우지 않음" 으로 읽는다
    console.error("[me/picks] 조회 실패:", errorMessage(e));
    return NextResponse.json({ deals: null, error: true }, { status: 503, headers: NO_STORE });
  }
}
