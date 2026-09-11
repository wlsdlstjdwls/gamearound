// Nintendo eShop(한국) 어댑터 — 설계서 §4.1. store.nintendo.co.kr(Magento) HTML 을 cheerio 로 파싱.
//   검색: /catalogsearch/result/?q=  |  단건: /<상품ID> (다운로드 상품 ID 는 숫자 14자리, 패키지는 hacp… 알파벳)
// PoC(2026-09-11): 젤다/마리오/실크송 검색 및 상품 3건에서 제목·정가·세일가·발매일·대상 본체 파싱 확인. 셀렉터는 이 파일 상수에만(§10).
import { load, type CheerioAPI } from "cheerio";
import type { Platform } from "@/server/db/schema";
import {
  AdapterError,
  CRAWLER_USER_AGENT,
  type SearchCandidate,
  type StoreAdapter,
  type StoreSnapshot,
} from "./types";

export const NINTENDO_BASE_URL = "https://store.nintendo.co.kr";
const FETCH_TIMEOUT_MS = 20_000;

export const NINTENDO_SELECTORS = {
  searchLink: "a.product-item-link",
  title: 'span[itemprop="name"]',
  finalPrice: '[data-price-type="finalPrice"]',
  oldPrice: '[data-price-type="oldPrice"]',
  releaseDate: ".product-attribute.release_date .product-attribute-val",
  platform: ".product-attribute.label_platform_attr .product-attribute-val",
} as const;

/** 다운로드(eShop) 상품 ID — 가격 수집 대상. 패키지 상품(hacp…)은 제외 */
const DIGITAL_ID = /^\d{10,}$/;
const PLATFORM_SWITCH2 = /switch\s*2/i;

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

  return {
    platform,
    storeExternalId: id,
    storeUrl: nintendoProductUrl(id),
    listPrice,
    currentPrice: finalPrice,
    discountPct,
    releaseDate: parseNintendoDate($(NINTENDO_SELECTORS.releaseDate).first().text()),
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

async function fetchHtml(url: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": CRAWLER_USER_AGENT, Accept: "text/html", "Accept-Language": "ko-KR,ko;q=0.9" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (e) {
    throw new AdapterError(`Nintendo 요청 실패 (${url}): ${e instanceof Error ? e.message : String(e)}`, "nintendo", true);
  }
  if (res.status === 404) throw new AdapterError(`Nintendo 상품 없음 (${url})`, "nintendo", false);
  if (res.status === 429 || res.status >= 500) throw new AdapterError(`Nintendo HTTP ${res.status} (${url})`, "nintendo", true);
  if (!res.ok) throw new AdapterError(`Nintendo HTTP ${res.status} (${url})`, "nintendo", false);
  return res.text();
}

export const nintendoAdapter: StoreAdapter = {
  source: "nintendo",
  minIntervalMs: 4000,

  async search(query: string): Promise<SearchCandidate[]> {
    const u = new URL(`${NINTENDO_BASE_URL}/catalogsearch/result/`);
    u.searchParams.set("q", query);
    return parseNintendoSearch(await fetchHtml(u.toString()));
  },

  async fetch(id: string): Promise<StoreSnapshot> {
    if (!/^[a-z0-9]+$/i.test(id)) throw new AdapterError(`Nintendo 상품 ID 형식 오류: ${id}`, "nintendo", false);
    return parseNintendoProduct(await fetchHtml(nintendoProductUrl(id)), id);
  },
};
