// 한국 카탈로그 전체 목록(Magento REST products-render-info) 파서. 발견(discoverPages)만 쓴다.
//
// 목록이 주는 값은 이름과 주소뿐으로 쓴다. 가격도 오지만 버린다 — 가격은 공식 가격 API 가 할인 기간까지
// 주고(price-api), 신규 등록은 어차피 상품 HTML 을 한 번 본다(작품 코드, 발매일, 영문 판단이 거기 있다).
// 이미지도 버린다. 목록의 이미지는 240px 썸네일 캐시 주소라 상품 HTML 의 og:image 보다 못하다.
import type { SearchCandidate } from "../types";
import { DIGITAL_ID, KR_MAIN_GAME_NSUID_PREFIX, nintendoProductUrl } from "./constants";

interface CatalogItem {
  name?: string;
  url?: string;
  /** Magento 는 문자열로 준다. "1" 만 살 수 있다(굿즈, 판매 종료는 "") */
  is_salable?: string;
}

export interface KrCatalogPage {
  /** 걸러 낸 본편 후보. 한 쪽이 통째로 굿즈여서 0건일 수도 있다 */
  candidates: SearchCandidate[];
  /** 거르기 전 건수. 0 이면 목록의 끝이다 — 후보 0건과 가른다 */
  rawCount: number;
}

export function parseKrCatalog(json: unknown): KrCatalogPage {
  const items = (json as { items?: CatalogItem[] } | null)?.items ?? [];
  const candidates: SearchCandidate[] = [];
  for (const it of items) {
    const id = it.url?.replace(/\/+$/, "").split("/").pop() ?? "";
    const title = it.name?.replace(/\s+/g, " ").trim();
    // 다운로드 본편만, 지금 살 수 있는 것만. 살 수 없는 것은 가격 API 가 값을 주지 않아 등록해도 빈 행이 된다
    if (!title || !DIGITAL_ID.test(id) || !id.startsWith(KR_MAIN_GAME_NSUID_PREFIX) || it.is_salable !== "1") continue;
    candidates.push({ externalId: id, title, url: nintendoProductUrl(id) });
  }
  return { candidates, rawCount: items.length };
}
