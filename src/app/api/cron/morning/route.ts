// GET /api/cron/morning — 한국 아침 8시 회원 발송. Authorization: Bearer <CRON_SECRET>
//   1) 밤사이(한국 22~08시) 미룬 가격, 찜 할인 알림을 사람마다 한 통으로(sync/morning-alerts)
//   2) 주간 맞춤 소식(sync/news-digest)
//
// 회원에게 기기 알림, 메일이 가는 일을 아침 한 자리에 모은다(2026-11-03, 사용자: "새벽 3시에 알림이랑 메일이 가?", "아침 8시쯤", "메일도 마찬가지로").
// 하루 크론(cron/daily)은 한국 03시라 회원 발송을 얹지 않는다.
// 시각은 vercel.json 의 "0 23 * * *"(UTC 23:00 = 한국 08:00). 크론 시각을 잘못 고쳐도 두 작업 다 한국 08~22시 밖이면 보내지 않는다(lib/notify/quiet-hours).
// UTC 23시는 DB 를 깨우는 크론 창(0, 6, 12, 17, 18시) 밖이라 Neon compute 가 하루 한 번 더 깨어난다 — 작업이 몇 초라 몇 분 몫이다.
import { NextResponse, type NextRequest } from "next/server";
import { bearerToken, secretMatches } from "@/lib/secret";
import { flushMorningAlerts } from "@/server/sync/morning-alerts";
import { dispatchNewsDigest } from "@/server/sync/news-digest";
import { errorMessage } from "@/lib/errors";

// 회원 수만큼 메일, 푸시를 한 통씩 보낸다. 늘어도 잘리지 않게 넉넉히 둔다 — 쓴 시간만 과금된다. Next 가 정적으로 읽는 값이라 리터럴이다
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!secretMatches(bearerToken(req.headers.get("authorization")), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const startedAt = Date.now();
  const now = new Date();
  const result: Record<string, unknown> = {};
  const errors: string[] = [];
  // 서로 독립이다. 하나가 실패해도 다른 하나는 간다(cron/daily 와 같은 꼴)
  const jobs: Array<[string, () => Promise<{ failed: number }>]> = [
    ["morningAlerts", () => flushMorningAlerts(now)],
    ["newsDigest", () => dispatchNewsDigest(now)],
  ];
  for (const [name, run] of jobs) {
    try {
      const r = await run();
      result[name] = r;
      if (r.failed > 0) errors.push(`${name}: 실패 ${r.failed}건`);
    } catch (e) {
      result[name] = null;
      errors.push(`${name}: ${errorMessage(e)}`);
    }
  }
  return NextResponse.json({ ok: errors.length === 0, ...result, errors, durationMs: Date.now() - startedAt }, { status: errors.length === 0 ? 200 : 500 });
}
