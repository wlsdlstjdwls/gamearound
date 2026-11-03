// GET /api/cron/daily — Vercel Cron 진입점 (§4.3). Authorization: Bearer <CRON_SECRET>
// 작업: 스냅샷 다운샘플링(90일) + 뉴스 90일 삭제 + sync_logs 30일 삭제 + 만료 세션 정리
//       + 상품과 게임 잇기(매장 설계서 §5.2 — 네트워크를 안 쓰는 배치라 여기 얹었다) + 출시 알림 + 주간 맞춤 소식 + 멤버십 갱신 + 데이터 점검
import { NextResponse, type NextRequest } from "next/server";
import { downsampleSnapshots, purgeOldNews, purgeOldSyncLogs } from "@/server/services/prices";
import { purgeExpiredSessions } from "@/server/auth/session";
import { matchUnlinkedProducts } from "@/server/sync/product-match";
import { PRODUCT_MATCH_BATCH } from "@/server/sync/constants";
import { bearerToken, secretMatches } from "@/lib/secret";
import { kstYm, prevYm } from "@/lib/indie/fame";
import { finalizeHallOfFame } from "@/server/services/indie";
import { dispatchReleaseAlerts } from "@/server/sync/release-alerts";
import { dispatchNewsDigest } from "@/server/sync/news-digest";
import { renewDueMemberships } from "@/server/services/membership";
import { runDataQuality } from "@/server/sync/quality";
import { refreshListStats } from "@/server/sync/list-stats";

// 300초: 옛 DB 병합(2026-11-02)으로 게임이 7.8만 건이 됐다. 데이터 점검기 읽기가 한국에서 4.6초, 규칙 0.3초라
// iad1 에서는 다 합쳐 10~20초로 본다. 60초도 들지만 카탈로그가 또 불면 마지막 작업들(점검기, 목록 집계)이 소리 없이 잘린다.
// 쓴 시간만 과금되므로 상한을 넉넉히 둬도 비용은 같다. Next 가 정적으로 읽는 값이라 리터럴이다
export const maxDuration = 300;
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
    // 지난달 명예의 전당을 닫는다(기획서 v2.0 7장 "월말 확정"). 이미 닫힌 달은 0 을 돌려주고 끝나서 매일 돌려도 된다 —
    // 월초 하루만 돌게 하면 그날 크론이 실패한 달은 영영 안 닫힌다
    ["hallOfFameFinalized", () => finalizeHallOfFame(prevYm(kstYm(new Date())))],
    // 찜한 출시 예정 게임이 나왔으면 알림함에 한 줄(출시 예정 줄의 "출시 알림", sync/release-alerts). 한국 03시라 그날 출시분이 잡힌다
    ["releaseAlerts", () => dispatchReleaseAlerts()],
    // 주간 맞춤 소식(sync/news-digest). 매일 부르고 이번 주에 아직 안 받은 사람에게만 간다 — 하루 빠져도 다음 날 메워진다. 숫자는 보낸 묶음 수(알림함 기준, 메일 키가 없어도 센다)
    ["newsDigestsSent", async () => (await dispatchNewsDigest(new Date())).inboxed],
    // 메이커 멤버십 갱신 청구, 실패 재시도, 해지 예약 끝내기(services/membership/charge). 크론을 따로 두지 않은 이유:
    // 하루 한 번이면 충분하고(결제일은 날 단위다), 크론을 늘리면 Neon compute 가 깨어나는 횟수가 는다
    ["membershipsRenewed", () => renewDueMemberships(new Date())],
    // 데이터 점검기(sync/quality, 2026-10-28). 맨 끝에 두는 이유: 같은 회차의 상품 잇기, 정리가 끝난 카탈로그를 봐야 한다.
    // 이 크론(UTC 18시)은 스팀, Xbox 가격 회차와 같은 창이라 DB 를 따로 깨우지 않는다. 숫자는 자동으로 고친 수다
    ["dataQualityAutoFixed", async () => (await runDataQuality()).autoApplied],
    // 목록 정렬 집계 표 전체 다시 쓰기(sync/list-stats). 수집 회차는 바뀐 게임만 고치므로, 시간이 지나 낡는 값
    // (며칠 지난 인기 순번, 오늘이 된 출시일)은 여기서 하루 한 번 바로잡는다. 데이터 점검기가 고친 부모 연결도 함께 들어간다
    ["listStatsRefreshed", async () => (await refreshListStats("system"), 1)],
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
