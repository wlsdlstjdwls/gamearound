// GET /api/payments/toss/fail — 결제창 실패(카드 거절, 인증 실패 등)로 돌아오는 주소(?code&message&orderId).
// 대기 주문을 실패로 적고 결제 내역에 토스가 준 문구를 띄운다. 창을 그냥 닫은 경우는 여기로 오지 않는다(결제 단추가 조용히 접는다).
import { NextResponse, type NextRequest } from "next/server";
import { PAYMENT_MESSAGES as M } from "@/lib/payments/messages";
import { ROUTES } from "@/lib/routes";
import { failIndieBoostPayment } from "@/server/services/payments";
import { getCurrentUser } from "@/server/services/users";

export const dynamic = "force-dynamic";

/** 주소에 실어 보낼 문구 상한 — 토스 문구는 짧지만 주소창 손질로 긴 글이 들어올 수 있다 */
const MESSAGE_MAX = 200;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const code = (sp.get("code") ?? "UNKNOWN").slice(0, MESSAGE_MAX);
  const message = (sp.get("message") ?? M.failed).slice(0, MESSAGE_MAX);
  const orderId = sp.get("orderId");
  const user = await getCurrentUser().catch(() => null);
  if (user && orderId) await failIndieBoostPayment(orderId, code, message, user.id).catch(() => {});
  const url = new URL(ROUTES.indiePayments, req.nextUrl.origin);
  url.searchParams.set("failed", message);
  return NextResponse.redirect(url, 303);
}
