// GET /api/cron/crawl/<source>/<mode> — 서울 리전 함수에서 도는 수집 진입점.
// 예: /api/cron/crawl/nintendo/prices, /api/cron/crawl/epic/discover, /api/cron/crawl/wikidata_game/match,
//     /api/cron/crawl/wikidata/collect(회사)
//
// 소스는 두 갈래다. 스토어(CRON_SOURCES)는 prices/discover/match 를, 메타 소스(CRON_META_SOURCES)는
// match/collect 를 받는다 — 메타에는 가격도 발견도 없다. 몫도 표를 따로 본다(CRON_META_PLAN).
//
// 왜 함수인가: 닌텐도와 Epic 은 Actions 러너 IP 로는 빈손이다(한국 밖 IP 차단, 데이터센터 IP 차단).
// 서울 리전(icn1) 함수는 한국 IP 로 나가서 둘 다 열린다 — 2026-09-14 /api/debug/reachability 실측.
// 나머지 소스는 Actions 에 그대로 남는다(sync/constants 의 CRON_SOURCES 주석).
//
// 왜 쿼리스트링이 아니라 경로 세그먼트인가: Vercel 크론의 path 는 동적 경로를 쓰라고 문서가 예시까지
// 들어 두었고, 쿼리스트링을 그대로 전달한다는 보장은 어디에도 없다. 보장된 쪽으로 붙인다.
//
// 인증은 두 가지를 받는다: Vercel Cron 이 자동으로 붙이는 Authorization: Bearer CRON_SECRET,
// 그리고 손으로 돌릴 때 쓰는 x-crawl-secret(크롤러와 같은 시크릿, /api/debug/reachability 와 같은 방식).
import { NextResponse, type NextRequest } from "next/server";
import { getDisabledReason, isSearchableSource, isSourceEnabled } from "@/server/adapters";
import { runSource } from "@/server/sync/run-source";
import { matchUnmatchedGames } from "@/server/sync/match";
import {
  CRON_META_MODES,
  CRON_META_PLAN,
  CRON_META_SOURCES,
  CRON_MODES,
  CRON_PLAN,
  CRON_SOURCES,
  type CronMetaMode,
  type CronMetaSource,
  type CronMode,
  type CronSource,
} from "@/server/sync/constants";
import { bearerToken, secretMatches } from "@/lib/secret";

// 라우트 세그먼트 설정은 정적으로 읽히는 값이어야 해서 리터럴을 쓴다(AGENTS §2 예외).
// 800 = 함수 실행 상한. CRON_PLAN 의 몫이 이 수치에서 역산한 값이라 둘은 같이 움직인다.
// 800 은 Pro 의 상한이다(Fluid Compute). 요금제가 Hobby 로 내려가면 300 이 상한이라 배포가 깨진다 —
// 그때는 이 값과 CRON_TIME_BUDGET_MS 를 같이 되돌린다.
export const maxDuration = 800;
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  if (secretMatches(bearerToken(req.headers.get("authorization")), process.env.CRON_SECRET)) return true;
  return secretMatches(req.headers.get("x-crawl-secret"), process.env.CRAWL_SECRET);
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ source: string; mode: string }> }) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const params = await ctx.params;
  // 메타 소스를 먼저 가른다. 모드도 몫도 표가 다르니 갈래를 여기서 끝내고 스토어 경로로 내려보내지 않는다
  const metaSource = CRON_META_SOURCES.find((s): s is CronMetaSource => s === params.source);
  if (metaSource) {
    const metaMode = CRON_META_MODES.find((m): m is CronMetaMode => m === params.mode);
    if (!metaMode) {
      return NextResponse.json(
        { error: `${metaSource} 의 모드는 <${CRON_META_MODES.join("|")}> 중 하나여야 해요` },
        { status: 400 },
      );
    }
    if (!isSourceEnabled(metaSource)) {
      return NextResponse.json({ source: metaSource, mode: metaMode, status: "skipped", reason: getDisabledReason(metaSource) });
    }
    const plan = CRON_META_PLAN[metaSource][metaMode];
    const startedAt = Date.now();
    // 회사(wikidata)는 매칭 단계가 없는 소스라 match 몫이 늘 0 이다 — 타입도 여기서 좁힌다
    const matched = plan.match > 0 && isSearchableSource(metaSource) ? await matchUnmatchedGames(metaSource, plan.match) : null;
    const result = plan.limit > 0 ? await runSource(metaSource, { limit: plan.limit }) : { status: "ok" as const, processed: 0, failed: 0 };
    return NextResponse.json(
      { source: metaSource, mode: metaMode, plan, matched, ...result, durationMs: Date.now() - startedAt },
      { status: result.status === "failed" ? 500 : 200, headers: { "Cache-Control": "no-store" } },
    );
  }

  const source = CRON_SOURCES.find((s): s is CronSource => s === params.source);
  const mode = CRON_MODES.find((m): m is CronMode => m === params.mode);
  if (!source || !mode) {
    return NextResponse.json(
      {
        error:
          `경로는 /api/cron/crawl/<${CRON_SOURCES.join("|")}>/<${CRON_MODES.join("|")}> 또는 ` +
          `/api/cron/crawl/<${CRON_META_SOURCES.join("|")}>/<${CRON_META_MODES.join("|")}> 형태여야 해요`,
      },
      { status: 400 },
    );
  }

  // 비활성 소스는 실패가 아니다 — 사유를 그대로 돌려주고 200 으로 끝낸다(크론이 매번 빨개지지 않게)
  if (!isSourceEnabled(source)) {
    return NextResponse.json({ source, mode, status: "skipped", reason: getDisabledReason(source) });
  }

  const plan = CRON_PLAN[source][mode];
  const startedAt = Date.now();
  const matched = plan.match > 0 && isSearchableSource(source) ? await matchUnmatchedGames(source, plan.match) : null;
  // limit 0 은 "이번 실행은 수집하지 않는다" 는 뜻이다(match 모드). 그래도 runSource 를 부르면
  // 아무것도 안 한 실행이 sync_logs 에 남고 Redis 락을 잡아 같은 시각의 다른 실행을 빈손으로 만든다.
  const result =
    plan.limit > 0
      ? await runSource(source, {
          limit: plan.limit,
          seedTop: plan.seedTop,
          pageBudget: plan.pageBudget,
          seedShare: plan.seedShare,
        })
      : { status: "ok" as const, processed: 0, failed: 0 };

  // durationMs 는 다음에 CRON_PLAN 의 몫을 조정할 때 쓰는 근거다 — 추측 대신 이 값을 본다
  return NextResponse.json(
    { mode, plan, matched, ...result, durationMs: Date.now() - startedAt },
    { status: result.status === "failed" ? 500 : 200, headers: { "Cache-Control": "no-store" } },
  );
}
