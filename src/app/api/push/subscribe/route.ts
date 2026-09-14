// POST/DELETE /api/push/subscribe — 브라우저 fetch가 호출하므로 Route Handler (§5.2). 구독 저장/삭제만 담당 (§7)
import { NextResponse } from "next/server";
import { z } from "zod";
import { RATE_LIMIT } from "@/lib/auth/constants";
import { AUTH_MESSAGES } from "@/lib/auth/messages";
import { checkRateLimit } from "@/server/auth/rate-limit";
import { getCurrentUser, type UserRow } from "@/server/services/users";
import { deletePushSubscription, upsertPushSubscription } from "@/server/services/push";

const subscribeSchema = z.object({
  endpoint: z.url({ message: "endpoint는 URL이어야 합니다" }).max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(256),
  }),
});
const unsubscribeSchema = z.object({ endpoint: z.url().max(2048) });

async function guard(): Promise<UserRow | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: AUTH_MESSAGES.loginRequired }, { status: 401 });
  // 푸시 구독 레이트리밋: 사용자당 분당 10회 (§1 Redis 용도)
  const allowed = await checkRateLimit(`push:user:${user.id}`, RATE_LIMIT.pushPerUser);
  if (!allowed) return NextResponse.json({ error: AUTH_MESSAGES.tooManyAttempts }, { status: 429 });
  return user;
}

async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const g = await guard();
  if (g instanceof NextResponse) return g;

  const parsed = subscribeSchema.safeParse(await readJson(req));
  if (!parsed.success) {
    return NextResponse.json({ error: "구독 정보가 올바르지 않습니다", issues: parsed.error.issues }, { status: 400 });
  }
  const row = await upsertPushSubscription(g.id, parsed.data);
  return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
}

export async function DELETE(req: Request) {
  const g = await guard();
  if (g instanceof NextResponse) return g;

  const parsed = unsubscribeSchema.safeParse(await readJson(req));
  if (!parsed.success) return NextResponse.json({ error: "endpoint가 올바르지 않습니다" }, { status: 400 });

  const deleted = await deletePushSubscription(g.id, parsed.data.endpoint);
  return NextResponse.json({ ok: true, deleted });
}
