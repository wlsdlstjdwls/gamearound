// GET /api/cron/daily — Vercel Cron 진입점 (§4.3). Authorization: Bearer <CRON_SECRET>
// 작업: 스냅샷 다운샘플링(90일) + 뉴스 90일 삭제 + sync_logs 30일 삭제 + 만료 세션 정리
//       + 상품과 게임 잇기(매장 설계서 §5.2 — 네트워크를 안 쓰는 배치라 여기 얹었다)
import { NextResponse, type NextRequest } from "next/server";
import { downsampleSnapshots, purgeOldNews, purgeOldSyncLogs } from "@/server/services/prices";
import { purgeExpiredSessions } from "@/server/auth/session";
import { matchUnlinkedProducts } from "@/server/sync/product-match";
import { PRODUCT_MATCH_BATCH } from "@/server/sync/constants";
import { bearerToken, secretMatches } from "@/lib/secret";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  return secretMatches(bearerToken(req.headers.get("authorization")), process.env.CRON_SECRET);
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
    // 이은 건수만 센다. 후보만 남긴 것과 못 찾은 것은 화면(관리자)이 상품 행에서 직접 읽는다
    ["productsLinked", async () => (await matchUnlinkedProducts(PRODUCT_MATCH_BATCH)).linked],
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
