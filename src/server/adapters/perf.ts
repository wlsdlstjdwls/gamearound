// 성능 표지 가져오기 — Xbox 카탈로그 속성, PCGamingWiki 문서(2026-11-16, 규칙과 한계는 lib/games/perf 머리 주석).
// 어댑터는 가져오기만 한다. DB 에 쓰는 일은 sync/perf-features 가 한다(AGENTS 1장).
//
// PCGamingWiki 를 고른 이유: PC 성능 표지(60/120fps, 4K, HDR, 레이 트레이싱, 업스케일링)를 게임마다 사람이 검증해 적어 두는 유일한 공개 출처다.
// Cargo 질의 API 는 "permissiondenied" 로 막혀 있다(2026-11-16 실측). 그래서 Steam 앱 번호로 문서 주소를 찾고(api/appid.php 가 문서로 넘겨 준다)
// 문서 원문을 parse API 로 읽는다. 요청 둘이 한 게임이라 몫을 작게 잡는다(sync/perf-features 의 PERF_PCGW_BATCH).
import { createHttpClient } from "./http";
import { XBOX_CATALOG_URL } from "./xbox";
import { perfFromPcgwWikitext, perfFromXboxAttributes, type PerfFeature } from "@/lib/games/perf";

/** 카탈로그 한 번에 묻는 상품 수 — xbox 어댑터의 가격 요청과 같은 값이다 */
export const XBOX_PERF_BATCH = 20;
const PCGW_BASE = "https://www.pcgamingwiki.com";

const xbox = createHttpClient({ source: "xbox", label: "Xbox 성능" });
// Node fetch 는 403 을 받는다(2026-11-16 실측, curl 은 200) — TLS 지문으로 거르는 곳이라 curl 전송기를 쓴다(adapters/curl)
const pcgw = createHttpClient({ source: "steam", label: "PCGamingWiki", transport: "curl" });
/** 넘겨받은 문서 화면의 문서 이름. 앱 번호를 모르는 위키는 Special:IdLookup 으로 넘긴다 */
const PAGE_NAME = /"wgPageName":"([^"]+)"/;

type XboxProducts = { Products?: Array<{ ProductId?: string; Properties?: { Attributes?: Array<{ Name?: string | null }> | null } | null }> };

/** 상품 번호마다 성능 표지. 응답에 없는 번호는 지도에 없다(모름) */
export async function fetchXboxPerf(ids: readonly string[]): Promise<Map<string, PerfFeature[]>> {
  const out = new Map<string, PerfFeature[]>();
  if (ids.length === 0) return out;
  const url = `${XBOX_CATALOG_URL}/products?bigIds=${ids.map(encodeURIComponent).join(",")}&market=KR&languages=ko-KR`;
  const body = (await xbox.json(url, { context: `perf:${ids.length}` })) as XboxProducts;
  for (const p of body.Products ?? []) {
    if (!p.ProductId) continue;
    out.set(p.ProductId, perfFromXboxAttributes((p.Properties?.Attributes ?? []).map((a) => a.Name)));
  }
  return out;
}

/** Steam 앱 번호의 PC 성능 표지. 위키에 문서가 없으면 null(모름) — 빈 배열(문서는 있는데 표지 없음)과 가른다 */
export async function fetchPcgwPerf(steamAppId: string): Promise<PerfFeature[] | null> {
  // 앱 번호 → 문서. curl 이 넘김을 따라가 문서 화면을 받으므로 화면 안의 문서 이름을 읽는다. 문서가 없으면 Special: 쪽으로 간다
  const html = await pcgw.text(`${PCGW_BASE}/api/appid.php?appid=${encodeURIComponent(steamAppId)}`, { context: `appid:${steamAppId}` });
  const title = (html.match(PAGE_NAME)?.[1] ?? "").replace(/_/g, " ");
  if (!title || title.startsWith("Special:") || title === "Home") return null;
  const parsed = (await pcgw.json(`${PCGW_BASE}/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&format=json&redirects=1`, { context: `page:${title}` })) as {
    parse?: { wikitext?: { "*"?: string } };
  };
  const text = parsed.parse?.wikitext?.["*"];
  return text ? perfFromPcgwWikitext(text) : null;
}
