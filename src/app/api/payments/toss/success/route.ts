// GET /api/payments/toss/success — 토스 결제창이 카드 인증을 마치고 돌려보내는 주소(?paymentKey&orderId&amount).
// 여기서 서버가 승인을 부르고(services/payments) 결제 내역으로 넘긴다. 화면(page)이 아니라 경로 처리기인 이유:
// 승인은 돈이 빠지는 쓰기다 — 화면 렌더 안에서 하면 미리 불러오기, 다시 그리기가 그 쓰기를 건드릴 수 있다.
// 로그인이 풀린 채 돌아오면 승인하지 않는다(누구의 주문인지 확인할 수 없다). 승인 안 된 결제는 토스가 10분 뒤 스스로 거둔다.
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { PAYMENT_MESSAGES as M } from "@/lib/payments/messages";
import { ROUTES } from "@/lib/routes";
import { confirmBoostPayment } from "@/server/services/payments";
import { getCurrentUser } from "@/server/services/users";

export const dynamic = "force-dynamic";

const query = z.object({ paymentKey: z.string().min(1).max(200), orderId: z.string().min(6).max(64), amount: z.coerce.number().int().positive() });

function toHistory(req: NextRequest, params: Record<string, string>) {
  const url = new URL(ROUTES.indiePayments, req.nextUrl.origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url, 303);
}

export async function GET(req: NextRequest) {
  const parsed = query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return toHistory(req, { failed: M.orderNotFound });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return toHistory(req, { failed: M.orderNotFound });
  const result = await confirmBoostPayment(parsed.data, user.id).catch(() => ({ ok: false as const, message: M.failed }));
  if (!result.ok) return toHistory(req, { failed: result.message });
  // 인디 부스트는 홈 인디 줄 첫 칸에도 선다 — 홈은 ISR 이라 밀지 않으면 한 시간 늦게 보인다
  revalidatePath(ROUTES.home);
  return toHistory(req, { paid: "1" });
}
