// GET /api/debug/reachability — 이 배포 환경에서 어느 스토어가 열리는지 실측한다.
// 헤더 x-crawl-secret === CRAWL_SECRET (크롤러와 같은 시크릿).
//
// 쓰는 때: 실행 환경을 바꿨을 때. 특히 Vercel 함수 리전을 서울(icn1)로 옮긴 뒤
// 닌텐도가 열리는지 보는 용도다 — 열리면 닌텐도 수집을 가정용 회선에서 뗄 수 있다.
// 리전은 코드로 못 정한다: Next 16 의 preferredRegion 은 폐기됐고 Vercel 은 auto/global/home 만 받는다.
// 프로젝트 설정(Functions > Region)에서 정하고, 여기서는 실제로 어디서 돌았는지만 보고한다.
import { NextResponse, type NextRequest } from "next/server";
import { probeStoreReachability } from "@/server/services/reachability";
import { secretMatches } from "@/lib/secret";

// 세 소스를 동시에 찌르고 각 12초까지 기다린다. 기본 제한(Hobby)보다 넉넉하게 잡아 둔다
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!secretMatches(req.headers.get("x-crawl-secret"), process.env.CRAWL_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const report = await probeStoreReachability();
  // 캐시에 걸리면 옛 결과를 보고 판단하게 된다 — 진단은 늘 새로 돈다
  return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
}
