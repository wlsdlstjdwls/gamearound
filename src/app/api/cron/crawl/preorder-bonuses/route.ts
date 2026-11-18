// GET /api/cron/crawl/preorder-bonuses — 한국닌텐도 뉴스에서 예약 특전 글을 받고(sync/preorder-bonuses),
// 한국 Xbox 예약 상품 소개에서 특전 목록을 다시 읽는다(sync/xbox-preorder-bonuses).
//
// Xbox 를 따로 크론으로 두지 않고 여기 얹은 이유: 같은 표를 채우는 같은 일이고, 회당 요청이 묶음 몇 번(예약 상품 40건 = 2번)이라 가볍다.
// 두 출처는 호스트가 달라 동시에 돈다. 한쪽이 실패해도 다른 쪽 결과는 그대로 남는다.
//
// crawl/** 아래 두는 이유: vercel.json 이 이 경로만 서울 리전(icn1)으로 덮는다. 닌텐도 사이트가 해외 IP 에서
// 열리는지는 확인하지 못했고(2026-10-07), 스토어 수집이 같은 회사 사이트를 서울에서 연다.
// 처음 채울 때는 손으로 ?pages=N 을 준다(상한 PREORDER_PAGES_MAX). 크론은 1쪽만 본다.
import { NextResponse, type NextRequest } from "next/server";
import { isCrawlRequest } from "@/lib/secret";
import { runPreorderBonuses } from "@/server/sync/preorder-bonuses";
import { runXboxPreorderBonuses } from "@/server/sync/xbox-preorder-bonuses";

// 라우트 세그먼트 설정은 정적으로 읽혀야 해서 리터럴이다(AGENTS §2 예외).
// 120 = 목록 몇 쪽 + 새 글 몇 건을 1초 간격으로 받는 시간에 넉넉한 여유. 첫 채우기(12쪽, 글 10여 건)도 30초 안쪽이다.
// Xbox 쪽은 상한(XBOX_PREORDER_MAX_ROWS 300)까지 차도 약 23초다.
export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isCrawlRequest(req.headers)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const pages = Number(req.nextUrl.searchParams.get("pages")) || undefined;
  const startedAt = Date.now();
  const [result, xbox] = await Promise.all([runPreorderBonuses({ pages }), runXboxPreorderBonuses()]);
  const failedAll = result.failed > 0 && result.added === 0 && result.candidates === 0;
  // 예약 상품이 있는데 소개를 하나도 못 읽었으면 Xbox 쪽 전체 실패다
  const xboxFailedAll = xbox.failed > 0 && xbox.preorder > 0 && xbox.fetched === 0;
  return NextResponse.json(
    { ...result, xbox, durationMs: Date.now() - startedAt },
    { status: failedAll || xboxFailedAll ? 500 : 200, headers: { "Cache-Control": "no-store" } },
  );
}
