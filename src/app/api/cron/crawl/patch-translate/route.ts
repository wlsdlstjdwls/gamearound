// GET /api/cron/crawl/patch-translate — 스팀 패치 노트 본문을 받아 한글 전문으로 옮겨 쌓는다(sync/patch-translate).
//
// crawl/** 아래 두는 이유: vercel.json 이 이 경로를 서울 리전(icn1)으로 덮는다. 스팀 뉴스 API 는 이 PC 망에서 막히고
// (2026-11-18 실측: TLS 연결이 끊긴다) 스팀 가격 크론(/api/cron/crawl/steam/prices)이 같은 서울 함수에서 연다.
// 시각은 스팀 가격 크론 뒤(UTC 0, 6, 12, 18시 창 안)다 — 가격 회차가 새로 넣은 패치 기록을 같은 창에서 옮기고, DB 를 창 밖에서 깨우지 않는다.
// 손으로 몰아 돌릴 때는 ?limit=N 을 준다. 하루, 달 글자 몫은 그래도 지킨다(sync/constants 의 PATCH_TRANSLATE_*).
import { NextResponse, type NextRequest } from "next/server";
import { isCrawlRequest } from "@/lib/secret";
import { runPatchTranslate } from "@/server/sync/patch-translate";

// 라우트 세그먼트 설정은 정적으로 읽혀야 해서 리터럴이다(AGENTS §2 예외).
// 300 = 한 회차 40건(스팀 요청 1.5초 간격 + DeepL 긴 글 요청)의 예상 140초에 여유를 둔 값. Vercel 함수 상한과 같다.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isCrawlRequest(req.headers)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const limit = Number(req.nextUrl.searchParams.get("limit")) || undefined;
  const startedAt = Date.now();
  const result = await runPatchTranslate({ limit });
  // 한 건도 못 옮기고 실패만 있으면 크론 대시보드에 빨간불이 서게 500 이다
  const failedAll = result.failed > 0 && result.translated === 0 && result.settled === 0;
  return NextResponse.json({ ...result, durationMs: Date.now() - startedAt }, { status: failedAll ? 500 : 200, headers: { "Cache-Control": "no-store" } });
}
