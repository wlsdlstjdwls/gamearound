// POST /api/webhooks/clerk — Clerk 서버가 호출하는 Route Handler (§5.2). svix 서명 검증 후 users 미러 (§6)
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { deleteUserByClerkId, toRole, upsertUserFromClerk } from "@/server/services/users";

type ClerkUserData = {
  id: string;
  username?: string | null;
  first_name?: string | null;
  public_metadata?: Record<string, unknown> | null;
};
type ClerkWebhookEvent = { type: string; data: ClerkUserData };

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[clerk-webhook] CLERK_WEBHOOK_SECRET 환경변수가 없습니다");
    return NextResponse.json({ error: "웹훅 설정 오류" }, { status: 500 });
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "svix 헤더가 없습니다" }, { status: 400 });
  }

  const body = await req.text();
  try {
    new Webhook(secret).verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch (e) {
    console.error("[clerk-webhook] 서명 검증 실패", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "서명 검증 실패" }, { status: 400 });
  }

  let evt: ClerkWebhookEvent;
  try {
    evt = JSON.parse(body) as ClerkWebhookEvent;
  } catch {
    return NextResponse.json({ error: "본문이 JSON이 아닙니다" }, { status: 400 });
  }
  if (!evt?.data?.id || typeof evt.type !== "string") {
    return NextResponse.json({ error: "이벤트 형식이 올바르지 않습니다" }, { status: 400 });
  }

  switch (evt.type) {
    case "user.created":
    case "user.updated":
      await upsertUserFromClerk({
        clerkId: evt.data.id,
        displayName: evt.data.username ?? evt.data.first_name ?? null,
        role: toRole(evt.data.public_metadata?.role),
      });
      break;
    case "user.deleted":
      await deleteUserByClerkId(evt.data.id);
      break;
    default:
      // 구독하지 않은 이벤트는 무시(200으로 응답해 재전송 방지)
      break;
  }
  return NextResponse.json({ ok: true });
}
