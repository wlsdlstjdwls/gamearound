// GET /api/cron/daily — Vercel Cron 진입점 (§4.3). Authorization: Bearer <CRON_SECRET>
// 작업: 스냅샷 다운샘플링(90일) + 뉴스 90일 삭제 + sync_logs 30일 삭제 + 만료 세션 정리
import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { downsampleSnapshots, purgeOldNews, purgeOldSyncLogs } from "@/server/services/prices";
import { purgeExpiredSessions } from "@/server/auth/session";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") ?? "";
  if (!expected || !header.startsWith("Bearer ")) return false;
  const a = Buffer.from(header.slice("Bearer ".length));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const startedAt = Date.now();
  const result: Record<string, number | string> = {};
  const errors: string[] = [];

  // 각 작업은 독립적으로 실행. 하나가 실패해도 나머지는 진행
  const jobs: Array<[string, () => Promise<number>]> = [
    ["snapshotsDownsampled", () => downsampleSnapshots(90)],
    ["newsPurged", () => purgeOldNews(90)],
    ["syncLogsPurged", () => purgeOldSyncLogs(30)],
    ["sessionsPurged", () => purgeExpiredSessions()],
  ];
  for (const [name, run] of jobs) {
    try {
      result[name] = await run();
    } catch (err) {
      result[name] = -1;
      errors.push(`${name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json(
    { ok: errors.length === 0, ...result, errors, durationMs: Date.now() - startedAt },
    { status: errors.length === 0 ? 200 : 500 },
  );
}
