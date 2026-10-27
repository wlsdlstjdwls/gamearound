// GET /api/payments/toss/billing/fail — 카드 등록 창 실패(인증 실패, 등록 거절)로 돌아오는 주소(?code&message).
// 아직 아무것도 쓰지 않았다(빌링키를 받기 전이다). 토스가 준 문구를 내 멤버십 화면에 띄우기만 한다.
import { NextResponse, type NextRequest } from "next/server";
import { MEMBERSHIP_MESSAGES as M } from "@/lib/membership/messages";
import { ROUTES } from "@/lib/routes";

export const dynamic = "force-dynamic";

/** 주소에 실어 보낼 문구 상한 — 토스 문구는 짧지만 주소창 손질로 긴 글이 들어올 수 있다 */
const MESSAGE_MAX = 200;

export function GET(req: NextRequest) {
  const message = (req.nextUrl.searchParams.get("message") ?? M.failed).slice(0, MESSAGE_MAX);
  const url = new URL(ROUTES.membership, req.nextUrl.origin);
  url.searchParams.set("failed", message);
  return NextResponse.redirect(url, 303);
}
