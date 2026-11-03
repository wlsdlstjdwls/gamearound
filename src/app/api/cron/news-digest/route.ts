// GET /api/cron/news-digest — 주간 맞춤 소식 발송(sync/news-digest). Authorization: Bearer <CRON_SECRET>
//
// 하루 크론(cron/daily)에서 떼어 낸 이유: 그 크론은 한국 03시에 돈다. 메일과 알림이 새벽 3시에 가면 안 된다(2026-11-03 사용자 지적).
// 시각은 vercel.json 의 "10 0 * * *"(UTC 00:10 = 한국 09:10). UTC 0시는 가격 수집 크론이 이미 DB 를 깨우는 창이라
// Neon compute 가 따로 깨어나지 않는다(neon 한도 사건 뒤 크론을 0, 6, 12, 17, 18시 창으로 모았다).
// 시각을 잘못 고쳐도 발송 쪽이 한국 08~21시 밖이면 아무것도 보내지 않는다(lib/news/digest 의 isDigestSendHour).
import { NextResponse, type NextRequest } from "next/server";
import { bearerToken, secretMatches } from "@/lib/secret";
import { dispatchNewsDigest } from "@/server/sync/news-digest";
import { errorMessage } from "@/lib/errors";

// 회원 수만큼 메일을 한 통씩 보낸다. 지금은 몇 명이지만 늘어도 잘리지 않게 넉넉히 둔다 — 쓴 시간만 과금된다. Next 가 정적으로 읽는 값이라 리터럴이다
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!secretMatches(bearerToken(req.headers.get("authorization")), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const startedAt = Date.now();
  try {
    const summary = await dispatchNewsDigest(new Date());
    return NextResponse.json({ ok: summary.failed === 0, ...summary, durationMs: Date.now() - startedAt }, { status: summary.failed === 0 ? 200 : 500 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: errorMessage(e), durationMs: Date.now() - startedAt }, { status: 500 });
  }
}
