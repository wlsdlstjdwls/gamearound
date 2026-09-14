// 한국 eShop 상품, 검색 HTML 파서. 셀렉터는 constants 에만 둔다(§10).
import { load, type CheerioAPI } from "cheerio";
import type { Platform } from "@/server/db/schema";
import { AdapterError, type SearchCandidate, type StoreSnapshot } from "../types";
import {
  DIGITAL_ID,
  KR_SKU_CODE,
  KR_SKU_PATTERN,
  NINTENDO_SELECTORS,
  PLATFORM_SWITCH2,
  nintendoProductUrl,
} from "./constants";

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

/**
 * 상품 HTML 에서 작품 코드. 못 찾으면 null 이고, 그러면 이 게임은 일본 쪽과 코드로 이어지지 않는다
 * (제목 유사도로 한 번 더 시도하므로 수집이 멈추지는 않는다).
 */
export function parseNintendoTitleCode(html: string): string | null {
  const sku = html.match(KR_SKU_PATTERN)?.[1];
  if (!sku) return null;
  return sku.match(KR_SKU_CODE)?.[1] ?? null;
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
    titleCode: parseNintendoTitleCode(html),
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
