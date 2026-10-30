// GET /api/me/fame — 명예의 전당 순위표의 "내 게임" 표시(components/indie/my-fame-marks)가 마운트 뒤 부른다.
// 화면 본문은 ISR(revalidate 300)이라 cookies() 를 읽을 수 없다 — api/me/picks 와 같은 이유로 따로 뺐다.
// 비로그인, 공개 게임이 없는 사람은 { standing: null } — 카드를 안 세운다.
import { NextResponse } from "next/server";
import { errorMessage } from "@/lib/errors";
import { getMyFameStanding } from "@/server/services/indie";

export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "private, no-store" };

export async function GET() {
  try {
    // 세션을 따로 먼저 묻지 않는다 — 서비스가 세션 서브질의로 거르고, 비로그인이면 null 을 준다(왕복 하나 덜기)
    return NextResponse.json({ standing: await getMyFameStanding() }, { headers: NO_STORE });
  } catch (e) {
    // 순위표는 이미 떠 있다 — 카드 하나 못 세운다고 화면을 흔들지 않는다
    console.error("[me/fame] 조회 실패:", errorMessage(e));
    return NextResponse.json({ standing: null, error: true }, { status: 503, headers: NO_STORE });
  }
}
