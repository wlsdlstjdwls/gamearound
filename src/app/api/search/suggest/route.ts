// GET /api/search/suggest?q= — 헤더 검색창 자동완성(services/games/suggest).
// 검색 결과 화면(/search)은 서버 컴포넌트가 그리지만 자동완성은 타이핑을 따라가야 해서 따로 연다.
import { MAX_PARAM_LEN } from "@/lib/games-query";
import { suggest } from "@/server/services/games";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, MAX_PARAM_LEN);
  try {
    const result = await suggest(q);
    // 브라우저도 잠깐 들고 있게 한다 — 지웠다 다시 친 같은 글자가 왕복을 또 타지 않는다
    return Response.json(result, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch {
    // 자동완성은 덤이다. DB 가 안 열려도 엔터로 가는 검색은 살아 있어야 해서 빈 목록으로 접는다
    return Response.json({ games: [], genres: [], companies: [] }, { status: 200 });
  }
}
