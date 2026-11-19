// GET /api/cron/crawl/preorder-bonuses — 한국닌텐도 뉴스에서 예약 특전 글을 받고(sync/preorder-bonuses),
// 한국 Xbox, PlayStation 예약 상품 소개에서 특전 목록을 다시 읽는다(sync/xbox-preorder-bonuses, sync/psstore-preorder-bonuses).
//
// 스토어 소개를 따로 크론으로 두지 않고 여기 얹은 이유: 같은 표를 채우는 같은 일이고 회당 요청이 가볍다
// (Xbox 예약 상품 40건 = 묶음 2번, PlayStation 예약 콘셉트 28건 = 페이지 28번).
// 세 출처는 호스트가 달라 동시에 돈다. 한쪽이 실패해도 다른 쪽 결과는 그대로 남는다.
//
// crawl/** 아래 두는 이유: vercel.json 이 이 경로만 서울 리전(icn1)으로 덮는다. 닌텐도 사이트가 해외 IP 에서
// 열리는지는 확인하지 못했고(2026-10-07), 스토어 수집이 같은 회사 사이트를 서울에서 연다.
// 처음 채울 때는 손으로 ?pages=N 을 준다(상한 PREORDER_PAGES_MAX). 크론은 1쪽만 본다.
import { NextResponse, type NextRequest } from "next/server";
import { isCrawlRequest } from "@/lib/secret";
import { runPreorderBonuses } from "@/server/sync/preorder-bonuses";
import { runXboxPreorderBonuses } from "@/server/sync/xbox-preorder-bonuses";
import { runPsstorePreorderBonuses } from "@/server/sync/psstore-preorder-bonuses";
import type { StorePreorderRunResult } from "@/server/sync/store-preorder";

// 라우트 세그먼트 설정은 정적으로 읽혀야 해서 리터럴이다(AGENTS §2 예외).
// 300 = 가장 긴 PlayStation 쪽이 상한(PSSTORE_PREORDER_MAX_ROWS 100)까지 차도 약 2분인 데 재시도 여유를 둔 값이다.
// 평소(예약 콘셉트 28건)는 약 31초다(2026-11-19 미리 보기 실측). 닌텐도 쪽은 첫 채우기(12쪽, 글 10여 건)도 30초 안쪽, Xbox 쪽은 상한까지 차도 약 23초다.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/** 예약 상품이 있는데 소개를 하나도 못 읽었으면 그 스토어 쪽 전체 실패다 */
const storeFailedAll = (r: StorePreorderRunResult): boolean => r.failed > 0 && r.preorder > 0 && r.fetched === 0;

export async function GET(req: NextRequest) {
  if (!isCrawlRequest(req.headers)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const pages = Number(req.nextUrl.searchParams.get("pages")) || undefined;
  const startedAt = Date.now();
  const [result, xbox, psstore] = await Promise.all([runPreorderBonuses({ pages }), runXboxPreorderBonuses(), runPsstorePreorderBonuses()]);
  const failedAll = result.failed > 0 && result.added === 0 && result.candidates === 0;
  return NextResponse.json(
    { ...result, xbox, psstore, durationMs: Date.now() - startedAt },
    { status: failedAll || storeFailedAll(xbox) || storeFailedAll(psstore) ? 500 : 200, headers: { "Cache-Control": "no-store" } },
  );
}
