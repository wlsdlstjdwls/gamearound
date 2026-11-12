// GET /api/cron/crawl/game-events — 게임 상세 "이벤트, 소식" 카드 수집(sync/game-events).
//
// crawl/** 아래 두는 이유: vercel.json 이 이 경로만 서울 리전(icn1)으로 덮는다. 닌텐도 뉴스는 특전 수집과 같은 사이트라 서울에서 연다.
// 스팀은 이 PC 망에서 막혀(2026-11-12 실측) 서버에서만 돈다.
// 처음 채울 때는 손으로 ?pages=N(닌텐도 목록 쪽 수), ?sources=nintendo|steam 을 준다. 크론은 둘 다 기본값으로 돈다.
import { NextResponse, type NextRequest } from "next/server";
import { isCrawlRequest } from "@/lib/secret";
import { runGameEvents, type GameEventsSource } from "@/server/sync/game-events";

// 라우트 세그먼트 설정은 정적으로 읽혀야 해서 리터럴이다(AGENTS §2 예외).
// 240 = 스팀 40건(요청 하나에 1초 간격) + 닌텐도 목록 1쪽과 새 글 몇 건(1초 간격). 첫 채우기(12쪽)도 이 안쪽이다.
export const maxDuration = 240;
export const dynamic = "force-dynamic";

const SOURCES: readonly GameEventsSource[] = ["nintendo", "steam"];

export async function GET(req: NextRequest) {
  if (!isCrawlRequest(req.headers)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const pages = Number(req.nextUrl.searchParams.get("pages")) || undefined;
  const asked = req.nextUrl.searchParams.get("sources")?.split(",").filter((s): s is GameEventsSource => SOURCES.includes(s as GameEventsSource));
  const startedAt = Date.now();
  const result = await runGameEvents({ pages, sources: asked?.length ? asked : undefined });
  const parts = [result.nintendo, result.steam].filter((p) => p !== null);
  const failedAll = parts.length > 0 && parts.every((p) => p.failed > 0 && p.written === 0 && p.candidates === 0);
  return NextResponse.json(
    { ...result, durationMs: Date.now() - startedAt },
    { status: failedAll ? 500 : 200, headers: { "Cache-Control": "no-store" } },
  );
}
