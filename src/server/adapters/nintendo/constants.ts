// 닌텐도 어댑터 상수 — 한국 eShop(HTML)과 일본 eShop(JSON), 그리고 둘이 같이 쓰는 가격 API.
//
// 나라별로 파는 곳이 다르다는 사실이 이 파일의 전제다. 한국 eShop 에 없는 게임이 일본 eShop 에는 있고,
// 같은 작품이라도 판매 단위 ID(nsuid)가 나라마다 다르다(2026-09-14 실측).
import type { Platform } from "@/server/db/schema";

export const NINTENDO_BASE_URL = "https://store.nintendo.co.kr";

/**
 * 두 나라가 같이 쓰는 공식 가격 API. country 만 바꾸면 그 나라 스토어 가격이 그 나라 통화로 온다
 * (2026-09-14 실측: country=KR 은 KRW, country=JP 는 JPY. 환산은 우리도 저쪽도 하지 않는다).
 *
 * 왜 HTML 대신 이걸 쓰나: 할인 시작, 종료 시각을 준다. 상품 페이지 HTML 에는 그 값이 없어서
 * 닌텐도만 할인 기간이 계속 비어 있었다. 게다가 한 요청에 여러 건이라 간격 제약을 안 탄다.
 */
export const EC_PRICE_URL = "https://api.ec.nintendo.com/v1/price";
/** 한 요청에 넣는 nsuid 수. 공식 문서가 없어 50 으로 둔다 — 51건도 200 이었지만 상한을 넘겨 쓰지 않는다 */
export const EC_PRICE_BATCH = 50;

/** 일본 eShop 카탈로그 검색(JSON). 한국 스토어와 달리 Magento 가 아니라 Solr 검색 API 다 */
export const JP_SEARCH_URL = "https://search.nintendo.jp/nintendo_soft/search.json";
/** 검색 1페이지에 받을 건수. 50 이면 전체 한 바퀴가 약 300페이지다 */
export const JP_SEARCH_PAGE_SIZE = 50;
/**
 * 발견 대상을 스위치 본편으로 좁히는 질의.
 *   hard_s  1_HAC = Switch, 05_BEE = Switch 2 (2_CTR 3DS, 4_WUP Wii U 는 뺀다)
 *   sctg_s  dl_soft = 본편. aoc(추가 콘텐츠)는 여기서 안 받는다 — DLC 는 본편에 붙어야 하는데
 *           일본 목록만으로는 어느 본편의 것인지 알 수 없어서, 독립 게임으로 만들면 카탈로그가 오염된다
 *   ssitu_s 파는 것과 예약만. not_found, sales_termination 은 살 수 없으니 등록하지 않는다
 * 2026-09-14 실측 건수: 이 조건으로 14,882건.
 */
export const JP_DISCOVER_FQ =
  '(hard_s:"1_HAC" OR hard_s:"05_BEE") AND sctg_s:"dl_soft" AND (ssitu_s:"onsale" OR ssitu_s:"preorder")';
/** 같은 작품 코드로 되묻는 질의 — 일본 상품 1건을 다시 볼 때 쓴다(nsuid 로 되묻는 길이 없다) */
export const jpIcodeFq = (code: string): string => `icode_s:"${code}"`;
/** 일본 상품 이미지. 검색 응답의 iurl 은 해시라 이 주소에 끼워야 그림이 된다 */
export const jpImageUrl = (hash: string): string => `https://img-eshop.cdn.nintendo.net/i/${hash}.jpg`;
/** 일본 상품 페이지. 검색 응답의 url 이 비어 있는 건이 많아 nsuid 로 만든다 */
export const jpProductUrl = (nsuid: string): string => `https://ec.nintendo.com/JP/ja/titles/${nsuid}`;

/** 일본 검색의 hard 값 → 우리 플랫폼. BEE 는 Switch 2 의 개발 코드명이다 */
export const JP_HARD_PLATFORM: Record<string, Platform> = { "1_HAC": "switch", "05_BEE": "switch2" };

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

/**
 * 한국 상품 페이지 HTML 에 박혀 있는 Magento SKU. 여기서 작품 코드를 뽑는다.
 * 예: catalog_product_view_sku_HACPA5WZA → HACPA5WZA
 */
export const KR_SKU_PATTERN = /catalog_product_view_sku_([A-Z0-9]+)/;
/**
 * SKU 에서 작품 코드만 남긴다. 앞머리는 기기(HAC=Switch, BEE=Switch 2)와 판매 형태(P)라 나라, 기기마다 다르고,
 * 뒤에 붙는 꼬리(TA 등)도 판매 단위 표기다. 가운데 5자만이 나라가 달라도 같은 값이다
 * (2026-09-14 실측 5건: 한국 HACPA5WZA 와 일본 icode A5WZA 가 같은 No Man's Sky).
 */
export const KR_SKU_CODE = /^(?:HAC|BEE)P([A-Z0-9]{5})/;

/** 다운로드(eShop) 상품 ID — 가격 수집 대상. 패키지 상품(hacp…)은 제외 */
export const DIGITAL_ID = /^\d{10,}$/;
export const PLATFORM_SWITCH2 = /switch\s*2/i;

/**
 * 한국 카탈로그 발견용 검색 시드. Magento 카테고리 페이지(/digital)는 클라이언트 렌더라 ?p= 가 먹지 않고,
 * GraphQL 도 꺼져 있다(2026-09-14 확인). 서버 렌더되는 검색 결과만 페이지네이션이 동작하므로
 * 흔한 글자를 질의로 넣어 훑는다. 시드 간 중복은 호출부가 제거한다.
 */
export const DISCOVERY_QUERIES = [
  "a", "e", "i", "o", "u", "s", "t", "r", "n", "l", "the", "1", "2",
  "의", "이", "스", "리", "드", "마", "게임", "어", "라", "트",
];
/** 검색 결과 1페이지에 24건. 시드 하나가 이 페이지 수를 넘기면 다음 시드로 넘어간다 */
export const DISCOVERY_MAX_PAGES = 60;

export const nintendoProductUrl = (id: string): string => `${NINTENDO_BASE_URL}/${id}`;
