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
/** 스위치 기기만. hard_s 의 1_HAC = Switch, 05_BEE = Switch 2 (2_CTR 3DS, 4_WUP Wii U 는 뺀다) */
const JP_SWITCH_FQ = '(hard_s:"1_HAC" OR hard_s:"05_BEE")';
/** 파는 것과 예약만. not_found, sales_termination 은 살 수 없어 가격 API 가 값을 주지 않는다 */
const JP_SELLABLE_FQ = '(ssitu_s:"onsale" OR ssitu_s:"preorder")';
/**
 * 발견 대상을 스위치 본편으로 좁히는 질의(sctg_s 의 dl_soft = 본편).
 * 추가 콘텐츠(aoc)는 여기서 안 받는다 — 목록만 훑어서는 어느 본편의 것인지 알 수 없어
 * 독립 게임으로 만들면 카탈로그가 오염된다. DLC 는 본편의 작품 코드로 되물어서 받는다(jpDlcFq).
 * 2026-09-14 실측 건수: 이 조건으로 14,882건.
 */
export const JP_DISCOVER_FQ = `${JP_SWITCH_FQ} AND sctg_s:"dl_soft" AND ${JP_SELLABLE_FQ}`;
/** 같은 작품 코드로 되묻는 질의 — 일본 상품 1건을 다시 볼 때 쓴다(nsuid 로 되묻는 길이 없다) */
export const jpIcodeFq = (code: string): string => `icode_s:"${code}"`;
/**
 * 본편이 가진 추가 콘텐츠를 작품 코드로 되묻는 질의.
 * 본편과 DLC 가 icode 를 공유하므로 제목을 맞춰 볼 필요가 없다 — 제목이 다른 문자 체계여도
 * 연결이 구조적이라 유사도 오매칭 위험이 이 경로에는 없다.
 * 판매 상태를 본편과 같은 기준으로 거른다. 2026-09-15 실측: 스위치 DLC 11,018건 중 살 수 있는 것 10,075건.
 */
export const jpDlcFq = (code: string): string =>
  `${JP_SWITCH_FQ} AND ${jpIcodeFq(code)} AND sctg_s:"aoc" AND ${JP_SELLABLE_FQ}`;
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
 * 한국 카탈로그 전체 목록(Magento REST). 로그인 없이 열리고 상품마다 이름, 주소(nsuid), 판매 가능 여부를 준다.
 *
 * 2026-09-30 에 검색 시드("a", "e" ... 23개 × 24건/쪽)를 이걸로 바꿨다. 검색 시드 발견은 실행마다
 * "a" 1쪽부터 다시 읽었고 크론 예산이 12쪽이라 **늘 같은 288건**만 봤다 — 한국 스토어 본편 9,697건 중
 * 우리가 아는 건 844건이었는데 발견 56회 중 29회가 신규 0건이었다(2026-09-30 실측).
 * 이 목록은 순서가 고정된 전수라 "어디까지 읽었나" 를 쪽 번호 하나로 기억해 이어 읽을 수 있다(sync/store-targets).
 * 실측: 100건/쪽, 전체 10,107건 = 102쪽, 응답 중앙값 4.7초.
 */
export const KR_CATALOG_URL = `${NINTENDO_BASE_URL}/rest/default/V1/products-render-info`;
/** 한 쪽 건수. 100 보다 크게 받으면 응답이 커져 느려질 뿐 요청 수는 이미 충분히 적다 */
export const KR_CATALOG_PAGE_SIZE = 100;
/**
 * 쪽 사이 간격. 상품 HTML(4초)보다 짧게 둔다 — JSON API 한 번이 100건이라 요청 수 자체가 적고,
 * 2026-09-30 에 1초 간격으로 103쪽을 연달아 받았을 때 차단이 없었다.
 */
export const KR_CATALOG_INTERVAL_MS = 1000;
/** 쪽 한 장에 드는 시간(응답 4.7초 + 간격 1초). 크론 몫 어림에 쓴다(cron-plan.test) */
export const KR_CATALOG_PAGE_MS = 6000;
/**
 * 본편 nsuid 접두어. 7005 는 추가 콘텐츠, 7007 은 묶음이다(2026-09-26 실측).
 * 추가 콘텐츠를 목록에서 받지 않는 이유는 일본과 같다(JP_DISCOVER_FQ) — 어느 본편 것인지 몰라
 * 독립 게임으로 만들면 카탈로그가 오염된다.
 */
export const KR_MAIN_GAME_NSUID_PREFIX = "7001";

export const nintendoProductUrl = (id: string): string => `${NINTENDO_BASE_URL}/${id}`;

// ---- 추가 콘텐츠(DLC): 한국 스토어는 본편 페이지에서 알려주지 않는다(2026-09-14 실측) ----
//
// 상품 페이지 HTML 에 "추가 콘텐츠" 라는 말이 나오긴 하는데, DLC 목록이 아니라 하단 이용 안내 문구다
// ("한국닌텐도 홈페이지에서 판매하는 소프트웨어, 추가 콘텐츠, 체험판 ..."). DLC 섹션 자체가 없다.
// 링크도, nsuid 도, aoc 같은 표시도 없다.
//
// 남은 길은 카탈로그 쪽이다: 이 스토어는 DLC 를 별도 상품으로 판다. 발견 단계가 그것까지 훑게 하고
// 제목으로 부모를 찾는 방법인데, 제목 매칭은 이미 "Escape from Tarkan" 류로 데인 자리라
// (jp-title-matching 회차) 부모를 자동 확정하면 안 된다. 붙인다면 검수 큐를 거치는 설계가 먼저다.
