// GET /api/payments/toss/billing/success — 정기결제 카드 등록 창이 돌려보내는 주소(?customerKey&authKey).
// 서버가 빌링키를 받고 첫 달을 청구한 뒤(services/membership 의 startMembership) 내 멤버십 화면으로 넘긴다.
// 화면(page)이 아니라 경로 처리기인 이유는 결제 성공 주소와 같다: 돈이 빠지는 쓰기를 렌더 안에서 하지 않는다.
// 로그인이 풀린 채 돌아오면 시작하지 않는다(누구의 카드인지 확인할 수 없다).
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { MEMBERSHIP_MESSAGES as M } from "@/lib/membership/messages";
import { ROUTES } from "@/lib/routes";
import { startMembership } from "@/server/services/membership";
import { getCurrentUser } from "@/server/services/users";

export const dynamic = "force-dynamic";

const query = z.object({ customerKey: z.string().min(2).max(64), authKey: z.string().min(1).max(300) });

function toMembership(req: NextRequest, params: Record<string, string>) {
  const url = new URL(ROUTES.membership, req.nextUrl.origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url, 303);
}

export async function GET(req: NextRequest) {
  const parsed = query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return toMembership(req, { failed: M.failed });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return toMembership(req, { failed: M.notOwnCustomer });
  const r = await startMembership(user.id, parsed.data.authKey, parsed.data.customerKey).catch(() => ({ ok: false as const, message: M.failed }));
  return r.ok ? toMembership(req, { started: "1" }) : toMembership(req, { failed: r.message });
}
