// 무엇을 찌를지 — 소스별 진단 경로. 주소와 파라미터는 어댑터 상수를 그대로 가져다 쓴다(§2).
//
// 고르는 기준: 그 소스의 수집이 **실제로 매달려 있는** 경로만 잰다. 홈페이지가 열리는지는
// 아무것도 말해 주지 않는다. 그래서 발견은 목록 API 를, 가격은 상세 API 를 직접 찌른다.
import { EPIC_BROWSER_HEADERS, EPIC_GRAPHQL_URL } from "@/server/adapters/epic";
import { GOG_CATALOG_URL } from "@/server/adapters/gog";
import { JP_DISCOVER_FQ, JP_SEARCH_URL, NINTENDO_BASE_URL } from "@/server/adapters/nintendo";
import {
  PSSTORE_ALL_GAMES_CATEGORY,
  PSSTORE_HEADERS,
  PSSTORE_GRAPHQL_URL,
  PSSTORE_PAGE_SIZE,
  PSSTORE_QUERY_HASHES,
} from "@/server/adapters/psstore";
import { STEAM_STOREITEMS_URL, STEAM_TOPSELLERS_URL, TOPSELLERS_PAGE_SIZE } from "@/server/adapters/steam";
import {
  XBOX_BROWSE_PAGE_SIZE,
  XBOX_BROWSE_URL,
  XBOX_CATALOG_URL,
  XBOX_LANGUAGE,
  XBOX_MARKET,
} from "@/server/adapters/xbox";
import { CRAWLER_USER_AGENT } from "@/lib/site";
import { MIN_BODY_BYTES, type ProbeResult } from "./classify";
import { probe, probeWithCurl, timeout } from "./run";

/** 응답 내용은 보지 않는다 — 통과 여부만 알면 된다 */
const EPIC_PING_BODY = JSON.stringify({ query: "query ping { __typename }" });

/**
 * 가격 경로를 찌를 때 쓸 표본. 무엇이든 되지만 **사라지지 않을 것**이라야 한다 —
 * 표본이 스토어에서 내려가면 진단이 404 를 내고 "막혔다"로 오독된다.
 * 둘 다 어댑터 주석이 실측 근거로 이미 쓰고 있는 타이틀이다(엘든 링, 철권 8).
 */
const SAMPLE_STEAM_APPID = 1245620;
const SAMPLE_XBOX_BIG_ID = "9PPSM14VKCLW";
/** MS-CV 는 값이 검증되지 않지만 없으면 카탈로그 API 가 거부한다(adapters/xbox 주석) */
const PROBE_CORRELATION_ID = "reachability";

/** 인기순위 검색 — steam 발견이 매달린 경로(adapters/steam 의 discoverPages 와 같은 파라미터) */
function steamDiscoverUrl(): string {
  const u = new URL(STEAM_TOPSELLERS_URL);
  u.searchParams.set("json", "1");
  u.searchParams.set("filter", "topsellers");
  u.searchParams.set("cc", "kr");
  u.searchParams.set("l", "koreana");
  u.searchParams.set("count", String(TOPSELLERS_PAGE_SIZE));
  u.searchParams.set("start", "0");
  return u.toString();
}

/** GetItems — steam 가격이 매달린 경로. 발견과 호스트가 다르다(api.steampowered.com) */
function steamPriceUrl(): string {
  const u = new URL(STEAM_STOREITEMS_URL);
  u.searchParams.set(
    "input_json",
    JSON.stringify({
      ids: [{ appid: SAMPLE_STEAM_APPID }],
      context: { language: "koreana", country_code: "KR", steam_realm: 1 },
      data_request: { include_basic_info: true },
    }),
  );
  return u.toString();
}

/** persisted query 는 GET + 쿼리스트링이다(adapters/psstore 의 opUrl 과 같은 모양) */
function psstoreDiscoverUrl(): string {
  const u = new URL(PSSTORE_GRAPHQL_URL);
  u.searchParams.set("operationName", "categoryGridRetrieve");
  u.searchParams.set(
    "variables",
    JSON.stringify({
      id: PSSTORE_ALL_GAMES_CATEGORY,
      pageArgs: { size: PSSTORE_PAGE_SIZE, offset: 0 },
      sortBy: null,
      filterBy: [],
      facetOptions: [],
    }),
  );
  u.searchParams.set(
    "extensions",
    JSON.stringify({ persistedQuery: { version: 1, sha256Hash: PSSTORE_QUERY_HASHES.categoryGrid } }),
  );
  return u.toString();
}

function xboxDiscoverUrl(): string {
  const u = new URL(XBOX_BROWSE_URL);
  u.searchParams.set("locale", XBOX_LANGUAGE);
  u.searchParams.set("market", XBOX_MARKET);
  u.searchParams.set("PageNumber", "1");
  u.searchParams.set("ResultsPerPage", String(XBOX_BROWSE_PAGE_SIZE));
  return u.toString();
}

function xboxPriceUrl(): string {
  const u = new URL(`${XBOX_CATALOG_URL}/products`);
  u.searchParams.set("bigIds", SAMPLE_XBOX_BIG_ID);
  u.searchParams.set("market", XBOX_MARKET);
  u.searchParams.set("languages", XBOX_LANGUAGE);
  return u.toString();
}

const get = (url: string, headers: Record<string, string> = {}) => () =>
  fetch(url, { headers: { "User-Agent": CRAWLER_USER_AGENT, ...headers }, signal: timeout(), cache: "no-store" });

/** 모두 동시에 보낸다. 순서대로 하면 소스 수만큼 대기 시간이 곱해진다 */
export function runStoreProbes(): Promise<ProbeResult[]> {
  return Promise.all([
    // 닌텐도 — 한국 IP 인지 가르는 시험. 한국 밖이면 202 + 빈 본문이 온다
    probe(
      "nintendo",
      "한국 eShop 검색 페이지가 내용을 주는가",
      MIN_BODY_BYTES.html,
      get(`${NINTENDO_BASE_URL}/catalogsearch/result/?q=마리오`, { "Accept-Language": "ko-KR,ko;q=0.9" }),
    ),
    // 일본 eShop — 한국 스토어와 막는 기준이 다를 수 있어 따로 잰다(이쪽은 HTML 이 아니라 검색 JSON 이다)
    probe(
      "nintendo_jp",
      "일본 eShop 검색 API 가 목록을 주는가",
      MIN_BODY_BYTES.json,
      get(`${JP_SEARCH_URL}?limit=1&page=1&fq=${encodeURIComponent(JP_DISCOVER_FQ)}`, {
        "Accept-Language": "ja-JP,ja;q=0.9",
      }),
    ),
    // Epic 은 두 갈래로 잰다. 하나만 보면 원인을 못 가른다:
    //   fetch 가 403 이어도 curl 이 200 이면 → IP 는 통과, Node 의 TLS 지문만 막힌 것(가정용 회선이 이렇다)
    //   둘 다 403 이면 → IP 대역이 거부된 것(Actions 러너가 이렇다)
    //   curl 자체가 없으면 → 그 환경에서는 Epic 을 쓸 방법이 없다(Vercel 함수)
    probe("epic (fetch)", "Node 의 기본 전송기로 Cloudflare 를 통과하는가", MIN_BODY_BYTES.json, () =>
      fetch(EPIC_GRAPHQL_URL, {
        method: "POST",
        headers: { ...EPIC_BROWSER_HEADERS, "Content-Type": "application/json" },
        body: EPIC_PING_BODY,
        signal: timeout(),
        cache: "no-store",
      }),
    ),
    probeWithCurl(
      "epic (curl)",
      "curl 전송기로는 통과하는가 = IP 대역이 거부됐는지",
      EPIC_GRAPHQL_URL,
      [...Object.entries(EPIC_BROWSER_HEADERS), ["Content-Type", "application/json"]],
      EPIC_PING_BODY,
    ),
    // 아래 넷은 지금 Actions 러너가 맡는 소스다. 발견을 서울 크론으로 옮길 수 있는지가 이 진단의 목적이라
    // 발견 경로와 가격 경로를 갈라서 잰다 — 호스트가 다르면 한쪽만 막힐 수 있다(classify 의 CRON_CANDIDATES).
    probe("steam (발견)", "인기순위 검색 JSON 이 목록을 주는가", MIN_BODY_BYTES.list, get(steamDiscoverUrl())),
    probe("steam (가격)", "GetItems 가 상품을 주는가 (api.steampowered.com)", MIN_BODY_BYTES.list, get(steamPriceUrl())),
    probe(
      "psstore",
      "전체 게임 카테고리 질의가 목록을 주는가 (해시가 낡으면 여기서 걸린다)",
      MIN_BODY_BYTES.list,
      get(psstoreDiscoverUrl(), PSSTORE_HEADERS),
    ),
    probe(
      "xbox (발견)",
      "카탈로그 목록 API 가 목록을 주는가 (emerald)",
      MIN_BODY_BYTES.list,
      get(xboxDiscoverUrl(), { "MS-CV": PROBE_CORRELATION_ID }),
    ),
    probe(
      "xbox (가격)",
      "상품 상세 API 가 값을 주는가 (displaycatalog)",
      MIN_BODY_BYTES.list,
      get(xboxPriceUrl(), { "MS-CV": PROBE_CORRELATION_ID }),
    ),
    // GOG — 대조군. 이것까지 막히면 스토어가 아니라 이 환경의 바깥 연결이 문제다
    probe(
      "gog",
      "대조군 (어디서든 열리는 소스)",
      MIN_BODY_BYTES.json,
      get(`${GOG_CATALOG_URL}?limit=5&locale=en-US&countryCode=KR`),
    ),
  ]);
}
