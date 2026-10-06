// Epic Games Store 엔드포인트, 수집 파라미터, GraphQL 질의문.
// 값의 근거(실측 날짜, 스토어가 깎는 한계)를 주석으로 남긴다 — 이 파일에는 로직이 없다.

/**
 * 이 소스를 켜는 환경변수. 기본은 비활성이고, 켠다고 바로 되지도 않는다 — 2026-09-14 실측:
 *   - GitHub Actions 러너에서는 curl 로도 403 (데이터센터 IP 차단)
 *   - 가정용 회선에서도 Node(undici, http2, 암호군 교체 전부) 는 403 이고 curl 만 통과 (TLS 지문 차단)
 * 즉 Node 로 부를 수 있는 경로가 지금은 없다. Cloudflare 를 통과하는 전송 수단(프록시 등)이 생기면
 * 이 값만 켜서 되살린다 — 파서와 질의는 그대로 쓸 수 있게 남겨 둔다.
 */
export const EPIC_ENABLE_ENV = "EPIC_CRAWL_ENABLED";

export const EPIC_GRAPHQL_URL = "https://store.epicgames.com/graphql";
/**
 * 상품 콘텐츠(사양, 언어)를 주는 호스트. **카탈로그와 다른 호스트다.**
 *
 * 2026-09-18 실측(가정용 회선): 이 호스트는 Node 의 fetch 로 200 이 온다. GraphQL 쪽을 막는
 * Cloudflare 챌린지가 여기에는 없다 — 정적 콘텐츠 CDN 이라 앞단이 다르다. 그래서 사양만은
 * curl 전송 없이 받는다. 나중에 막히면 transport 만 curl 로 바꾸면 되고 파서는 그대로다.
 *
 * 열쇠는 오퍼 ID 가 아니라 **페이지 slug** 다(`.../products/hades`). namespace:offerId 는 모른다.
 * locale 은 영문을 쓴다 — ko 로 부르면 라벨까지 번역돼 와서 별칭 사전이 몇 배가 된다.
 */
export const EPIC_CONTENT_URL = (slug: string, locale: string = EPIC_LOCALE_EN): string =>
  `https://store-content.ak.epicgames.com/api/${locale}/content/products/${encodeURIComponent(slug)}`;
export const EPIC_STORE_BASE_URL = "https://store.epicgames.com/ko/p";
export const EPIC_COUNTRY = "KR";
export const EPIC_LOCALE = "ko";
/**
 * 영문 이름을 받기 위한 두 번째 로케일. Epic 은 locale 을 그대로 따라 제목을 번역해 준다 —
 * ko 는 "혼잣말", en-US 는 "Soliloquy"(2026-09-17 실측 5/5). 한 요청 더 쓰는 값이
 * title_en 자리에 한국어가 들어앉는 것보다 싸다.
 */
export const EPIC_LOCALE_EN = "en-US";
/** searchStore 는 count 를 40 으로 깎는다 — 100 을 넣어도 40건만 온다(2026-09-14 확인) */
export const EPIC_PAGE_SIZE = 40;
/**
 * 기본판만 보는 카테고리. DLC, 애드온, 번들은 여기서 걸러진다.
 */
export const EPIC_BASE_GAME_CATEGORY = "games/edition/base";
/**
 * 추가 콘텐츠 카테고리. 같은 searchStore 에 카테고리만 바꾸고 namespace 로 좁히면
 * 그 게임의 DLC 만 온다(2026-09-15 실측). 스토어 페이지가 쓰는 것과 같은 값이다 —
 * 페이지 안 getRelatedOfferIdsByCategory 의 category 가 이 문자열이다.
 *
 * 두 종류가 섞여 온다: offerType 이 DLC 인 것(확장팩, 시즌 패스)과 ADD_ON 인 것(꾸미기 아이템 팩).
 * 둘 다 추가 콘텐츠라 가르지 않는다.
 */
export const EPIC_ADDON_CATEGORY = "addons|digitalextras";
/**
 * 한 본편에서 받아 올 DLC 수 상한. 실측(2026-09-15) 보더랜드 3 이 23건으로 제일 많았고
 * 하데스, 위쳐 3 는 1건이었다. 100 은 여유이고, 실제 등록 수는 DLC_PER_GAME_MAX 가 다시 깎는다.
 */
export const EPIC_ADDON_PAGE_SIZE = 100;
/**
 * 발견이 넘길 수 있는 최대 페이지 수. KR 기본판이 약 7,000건이라 175페이지면 카탈로그를 한 바퀴 돈다.
 * 여유를 둔 상한이고, 실제 종료 조건은 "빈 페이지" 다.
 */
export const EPIC_DISCOVERY_MAX_PAGES = 220;
// 응답을 읽는 데만 쓰이는 값(이미지 키, 센티널, 꼬리표 정규식)은 parse.ts 안에 둔다 — 이 파일은 요청에 쓰는 값만 담는다

/**
 * 브라우저 헤더. Cloudflare 가 UA 만 보는 게 아니라 Origin/Referer 조합까지 본다 —
 * 하나라도 빠지면 403 이다(2026-09-14 실측). 값은 실제 스토어프론트가 보내는 것과 같게 둔다.
 */
export const EPIC_BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Language": "ko-KR,ko;q=0.9",
  Origin: "https://store.epicgames.com",
  Referer: "https://store.epicgames.com/ko/browse",
  "sec-fetch-site": "same-origin",
  "sec-fetch-mode": "cors",
};

// ---- GraphQL 질의 ----

/** 목록, 단건이 함께 쓰는 오퍼 필드 */
const OFFER_FIELDS = `
  title id namespace description effectiveDate offerType
  productSlug urlSlug developerDisplayName publisherDisplayName
  keyImages { type url }
  catalogNs { mappings { pageSlug pageType } }
  price(country: $country) {
    totalPrice { discountPrice originalPrice currencyCode currencyInfo { decimals } }
    lineOffers { appliedRules { name startDate endDate } }
  }`;

export const EPIC_SEARCH_QUERY = `query search($country: String!, $locale: String, $count: Int, $start: Int, $category: String, $keywords: String, $sortBy: String, $sortDir: String) {
  Catalog { searchStore(country: $country, locale: $locale, count: $count, start: $start, category: $category, keywords: $keywords, sortBy: $sortBy, sortDir: $sortDir) {
    paging { total count }
    elements { ${OFFER_FIELDS} }
  } }
}`;

export const EPIC_OFFER_QUERY = `query offer($country: String!, $locale: String, $namespace: String!, $offerId: String!) {
  Catalog { catalogOffer(namespace: $namespace, id: $offerId, locale: $locale) { ${OFFER_FIELDS} } }
}`;

/**
 * 한 게임의 추가 콘텐츠. searchStore 는 namespace 로 좁힐 수 있어서 별도 엔드포인트가 필요 없다.
 * 우리 외부 ID 가 이미 `namespace:offerId` 라 부모의 namespace 를 따로 조회하지 않아도 된다.
 */
export const EPIC_ADDON_QUERY = `query addons($country: String!, $locale: String, $namespace: String!, $category: String, $count: Int) {
  Catalog { searchStore(country: $country, locale: $locale, namespace: $namespace, category: $category, count: $count) {
    paging { total count }
    elements { ${OFFER_FIELDS} }
  } }
}`;

/**
 * 콘텐츠 API requirements.languages 의 갈래 머리말과 한국어 표기. 배급사가 손으로 적는 문장이라
 * 한 항목에 둘이 같이 오기도 하고("AUDIO: ... | TEXT: ...") 따로 오기도 한다(2026-10-06 실측, 잇 테이크 투, 앨런 웨이크 2).
 * 응답 로케일이 en-US 라 언어 이름은 영어다(EPIC_CONTENT_URL).
 */
export const EPIC_LANGUAGE_AUDIO = "AUDIO";
export const EPIC_LANGUAGE_TEXT = "TEXT";
export const EPIC_KOREAN_LABEL = "Korean";
