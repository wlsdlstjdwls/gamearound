// POST/DELETE /api/push/subscribe — 브라우저 fetch가 호출하므로 Route Handler (§5.2). 구독 저장/삭제만 담당 (§7)
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/server/redis";
import { AUTH_DISABLED } from "@/lib/auth-flag";
import { getCurrentUser } from "@/server/services/users";
import { deletePushSubscription, upsertPushSubscription } from "@/server/services/push";

const subscribeSchema = z.object({
  endpoint: z.url({ message: "endpoint는 URL이어야 합니다" }).max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(256),
  }),
});
const unsubscribeSchema = z.object({ endpoint: z.url().max(2048) });

async function guard(): Promise<{ clerkId: string } | NextResponse> {
  if (AUTH_DISABLED) return NextResponse.json({ error: "로그인 기능이 비활성화되어 있습니다" }, { status: 401 });
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  // 푸시 구독 레이트리밋: 사용자당 분당 10회 (§1 Redis 용도)
  const allowed = await rateLimit(`rl:push:${userId}`, 10, 60);
  if (!allowed) return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도하세요" }, { status: 429 });
  return { clerkId: userId };
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
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const row = await upsertPushSubscription(user.id, parsed.data);
  return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
}

export async function DELETE(req: Request) {
  const g = await guard();
  if (g instanceof NextResponse) return g;

  const parsed = unsubscribeSchema.safeParse(await readJson(req));
  if (!parsed.success) return NextResponse.json({ error: "endpoint가 올바르지 않습니다" }, { status: 400 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const deleted = await deletePushSubscription(user.id, parsed.data.endpoint);
  return NextResponse.json({ ok: true, deleted });
}
