// Nintendo eShop(한국) 어댑터 — 설계서 §4.1. store.nintendo.co.kr(Magento) HTML 을 cheerio 로 파싱.
//   검색: /catalogsearch/result/?q=  |  단건: /<상품ID> (다운로드 상품 ID 는 숫자 14자리, 패키지는 hacp… 알파벳)
// PoC(2026-09-11): 젤다/마리오/실크송 검색 및 상품 3건에서 제목, 정가, 세일가, 발매일, 대상 본체 파싱 확인. 셀렉터는 이 파일 상수에만(§10).
import { load, type CheerioAPI } from "cheerio";
import type { Platform } from "@/server/db/schema";
import {
  AdapterError,
  type SearchCandidate,
  type StoreAdapter,
  type StoreSnapshot,
} from "./types";
import { createHttpClient, notFoundAs } from "./http";

export const NINTENDO_BASE_URL = "https://store.nintendo.co.kr";

export const NINTENDO_SELECTORS = {
  searchLink: "a.product-item-link",
  title: 'span[itemprop="name"]',
  finalPrice: '[data-price-type="finalPrice"]',
  oldPrice: '[data-price-type="oldPrice"]',
  releaseDate: ".product-attribute.release_date .product-attribute-val",
  platform: ".product-attribute.label_platform_attr .product-attribute-val",
  publisher: ".product-attribute.publisher .product-attribute-val",
  gameCategory: ".product-attribute.game_category .product-attribute-val",
  players: ".product-attribute.no_of_players .product-attribute-val",
  ogImage: 'meta[property="og:image"]',
} as const;

/** 다운로드(eShop) 상품 ID — 가격 수집 대상. 패키지 상품(hacp…)은 제외 */
const DIGITAL_ID = /^\d{10,}$/;
const PLATFORM_SWITCH2 = /switch\s*2/i;

/**
 * 카탈로그 발견용 검색 시드. Magento 카테고리 페이지(/digital)는 클라이언트 렌더라 ?p= 가 먹지 않고,
 * GraphQL 도 꺼져 있다(2026-09-14 확인). 서버 렌더되는 검색 결과만 페이지네이션이 동작하므로
 * 흔한 글자를 질의로 넣어 훑는다. 시드 간 중복은 호출부가 제거한다.
 */
const DISCOVERY_QUERIES = [
  "a", "e", "i", "o", "u", "s", "t", "r", "n", "l", "the", "1", "2",
  "의", "이", "스", "리", "드", "마", "게임", "어", "라", "트",
];
/** 검색 결과 1페이지에 24건. 시드 하나가 이 페이지 수를 넘기면 다음 시드로 넘어간다 */
const DISCOVERY_MAX_PAGES = 60;

// ---- 순수 파서 ----

/** "2026/11/5", "2026.11.05", "2026-11-05" → YYYY-MM-DD. 불명확하면 null */
export function parseNintendoDate(input: string | null | undefined): string | null {
  if (!input) return null;
  const m = input.trim().match(/(\d{4})\s*[./\-년]\s*(\d{1,2})\s*[./\-월]\s*(\d{1,2})/);
  if (!m) return null;
  const [, y, mo, d] = m;
  const month = Number(mo);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function priceOf($: CheerioAPI, selector: string): number | null {
  const raw = $(selector).first().attr("data-price-amount");
  if (raw === undefined) return null;
  const n = Number(raw.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : null;
}

export function nintendoProductUrl(id: string): string {
  return `${NINTENDO_BASE_URL}/${id}`;
}

/**
 * "액션, 어드벤처" → ["액션", "어드벤처"]
 * 구분자 클래스에 가운뎃점(U+00B7)이 남아 있는 이유: 닌텐도 스토어가 실제로 그 문자로 장르를 잇는다.
 * 우리 코드/문구에서는 쓰지 않지만, 외부 입력을 읽는 자리라 지우면 파싱이 깨진다.
 */
export function parseNintendoGenres(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return Array.from(new Set(raw.split(/[,·/]/).map((g) => g.trim()).filter(Boolean)));
}

/** "1~4명", "최대 8명" 등에서 최대 인원 수. 못 읽으면 null */
export function parseNintendoPlayers(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const nums = raw.match(/\d+/g);
  if (!nums || nums.length === 0) return null;
  const max = Math.max(...nums.map(Number));
  return Number.isFinite(max) && max > 0 ? max : null;
}

/** 상품 페이지 HTML → StoreSnapshot */
export function parseNintendoProduct(html: string, id: string): StoreSnapshot {
  const $ = load(html);
  const title = $(NINTENDO_SELECTORS.title).first().text().trim();
  if (!title) throw new AdapterError(`Nintendo 상품 페이지 파싱 실패(제목 없음): ${id}`, "nintendo", false);

  const finalPrice = priceOf($, NINTENDO_SELECTORS.finalPrice);
  const oldPrice = priceOf($, NINTENDO_SELECTORS.oldPrice);
  const listPrice = oldPrice ?? finalPrice;
  const discountPct =
    finalPrice !== null && listPrice !== null && listPrice > 0 && finalPrice < listPrice
      ? Math.round(((listPrice - finalPrice) / listPrice) * 100)
      : finalPrice === null
        ? null
        : 0;

  const platformText = $(NINTENDO_SELECTORS.platform).first().text();
  const platform: Platform = PLATFORM_SWITCH2.test(platformText) ? "switch2" : "switch";

  // Switch 독점작은 Steam 에 없어 이 스냅샷으로 게임 마스터를 새로 만든다 → meta 가 있어야 한다.
  // 한국 eShop 은 영문 제목을 따로 주지 않으므로 titleEn 자리에 한국어 제목을 넣는다(slugify 는 한글을 살린다).
  const players = parseNintendoPlayers($(NINTENDO_SELECTORS.players).first().text());
  return {
    platform,
    storeExternalId: id,
    storeUrl: nintendoProductUrl(id),
    listPrice,
    currentPrice: finalPrice,
    discountPct,
    releaseDate: parseNintendoDate($(NINTENDO_SELECTORS.releaseDate).first().text()),
    meta: {
      titleEn: title,
      titleKo: null,
      coverUrl: $(NINTENDO_SELECTORS.ogImage).first().attr("content")?.trim() || null,
      publisher: $(NINTENDO_SELECTORS.publisher).first().text().trim() || null,
      genres: parseNintendoGenres($(NINTENDO_SELECTORS.gameCategory).first().text()),
      // 로컬 인원수만 표기된다. 솔로 가능 여부는 1명 플레이가 포함되는지로 판단
      multiplayer: players ? { localMax: players, solo: true, coop: players > 1 } : undefined,
    },
  };
}

/** 검색 결과 HTML → 후보 (다운로드 상품만) */
export function parseNintendoSearch(html: string): SearchCandidate[] {
  const $ = load(html);
  const out: SearchCandidate[] = [];
  const seen = new Set<string>();
  $(NINTENDO_SELECTORS.searchLink).each((_, el) => {
    const href = $(el).attr("href")?.trim();
    const title = $(el).text().replace(/\s+/g, " ").trim();
    if (!href || !title) return;
    const id = href.replace(/\/+$/, "").split("/").pop() ?? "";
    if (!DIGITAL_ID.test(id) || seen.has(id)) return;
    seen.add(id);
    out.push({ externalId: id, title, url: nintendoProductUrl(id) });
  });
  return out;
}

// ---- 네트워크 ----

/**
 * eShop 은 차단을 404 나 403 으로 알리지 않는다 — **202 에 빈 본문**을 준다
 * (GitHub Actions 러너(Azure US)에서 실측, 2026-09-14: search/product 모두 http=202 size=0).
 * 이걸 그냥 파싱하면 "검색 결과 0건" 과 구분이 안 돼서, 수집이 조용히 0건으로 끝나고 로그도 ok 로 남는다.
 * 그래서 본문이 비면 여기서 실패로 바꾼다 — 재시도 가능으로 두는 이유는 일시적 차단도 같은 모양이기 때문이다.
 */
export function requireBody(html: string, ctx: string): string {
  if (html.trim().length > 0) return html;
  throw new AdapterError(`Nintendo 빈 응답 (${ctx}) — 한국 외 IP 차단 추정`, "nintendo", true);
}

// eShop 은 HTML 크롤이라 봇 차단을 피하려 한국어 Accept-Language 를 명시한다. 타임아웃도 API 보다 길게 잡는다.
const http = createHttpClient({
  source: "nintendo",
  label: "Nintendo",
  timeoutMs: 20_000,
  headers: { "Accept-Language": "ko-KR,ko;q=0.9" },
  onStatus: notFoundAs("nintendo", (ctx) => `Nintendo 상품 없음 (${ctx})`),
});

export const nintendoAdapter: StoreAdapter = {
  source: "nintendo",
  minIntervalMs: 4000,

  async search(query: string): Promise<SearchCandidate[]> {
    const u = new URL(`${NINTENDO_BASE_URL}/catalogsearch/result/`);
    u.searchParams.set("q", query);
    return parseNintendoSearch(requireBody(await http.text(u.toString()), `search:${query}`));
  },

  async fetch(id: string): Promise<StoreSnapshot> {
    if (!/^[a-z0-9]+$/i.test(id)) throw new AdapterError(`Nintendo 상품 ID 형식 오류: ${id}`, "nintendo", false);
    return parseNintendoProduct(requireBody(await http.text(nintendoProductUrl(id)), id), id);
  },

  /** 검색 시드 × 페이지네이션으로 카탈로그를 훑는다. 한 시드가 바닥나면 다음 시드로 */
  async discover(limit: number): Promise<SearchCandidate[]> {
    const out: SearchCandidate[] = [];
    const seen = new Set<string>();
    for (const q of DISCOVERY_QUERIES) {
      for (let page = 1; page <= DISCOVERY_MAX_PAGES && out.length < limit; page++) {
        const u = new URL(`${NINTENDO_BASE_URL}/catalogsearch/result/`);
        u.searchParams.set("q", q);
        u.searchParams.set("p", String(page));
        const found = parseNintendoSearch(requireBody(await http.text(u.toString()), `discover:${q}:${page}`));
        if (found.length === 0) break; // 이 시드는 끝 — 다음 시드로
        for (const c of found) {
          if (seen.has(c.externalId)) continue;
          seen.add(c.externalId);
          out.push(c);
          if (out.length >= limit) break;
        }
        await new Promise((r) => setTimeout(r, nintendoAdapter.minIntervalMs));
      }
      if (out.length >= limit) break;
    }
    return out;
  },
};
