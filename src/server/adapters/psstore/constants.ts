// PlayStation Store 엔드포인트와 수집 파라미터. 값의 근거(실측 날짜, 한계)를 주석으로 남긴다.

export const PSSTORE_GRAPHQL_URL = "https://web.np.playstation.com/api/graphql/v1/op";
export const PSSTORE_CONCEPT_URL = "https://store.playstation.com/ko-kr/concept";
export const PSSTORE_PRODUCT_URL = "https://store.playstation.com/ko-kr/product";
export const PSSTORE_COUNTRY = "KR";
export const PSSTORE_LANGUAGE = "ko";
/**
 * 지역, 언어를 정하는 헤더. 이게 없으면 미국 스토어 가격(달러)이 온다.
 * CSRF 차단이 있어 content-type 도 같이 보내야 한다 — 없으면 200 대신 "potential Cross-Site Request Forgery" 다.
 */
export const PSSTORE_HEADERS: Record<string, string> = {
  "x-psn-store-locale-override": "ko-KR",
  "content-type": "application/json",
};

/**
 * 전체 게임 카테고리(cat.gma.x_All_games). PS4, PS5 가 한 목록에 들어온다 — KR 7,571건(2026-09-14 실측).
 * 플랫폼별 카테고리는 상품(에디션) 단위로 오는데, 이 카테고리만 콘셉트(게임) 단위로 와서 중복이 없다.
 */
export const PSSTORE_ALL_GAMES_CATEGORY = "28c9c2b2-cecc-415c-9a08-482a605cb104";
/** 서버가 24로 깎는다 — 48, 96 을 넣으면 목록이 0건으로 온다(2026-09-14 실측) */
export const PSSTORE_PAGE_SIZE = 24;
/** 7,571 / 24 ≈ 316 페이지. 여유를 둔 상한이고 실제 종료 조건은 빈 페이지다 */
export const PSSTORE_DISCOVERY_MAX_PAGES = 400;
/** 검색 결과에서 콘셉트 id 를 알아내려고 상세를 더 볼 상품 수. 검색은 매칭 단계에서만 쓰여 얕게 본다 */
export const PSSTORE_SEARCH_LOOKUP_MAX = 3;

/**
 * 질의 해시(Apollo persisted query). 이 API 는 화이트리스트라 질의문을 그대로 POST 하면
 * "Query not whitelisted" 로 막힌다 — 해시로만 부를 수 있다(2026-09-14 실측).
 *
 * 갱신 방법: 크롬에서 아래 주소를 열고 콘솔에 이 한 줄을 넣으면 현재 해시가 나온다.
 *   performance.getEntriesByType("resource").map(e => e.name).filter(n => n.includes("graphql"))
 * 대상 화면 — categoryGrid: /ko-kr/pages/browse, conceptDetail: /ko-kr/concept/<id>, search: /ko-kr/search/<말>
 *
 * 해시가 낡으면 "not whitelisted" 오류로 수집이 실패하고 관리자 화면에 그대로 뜬다.
 * 스토어가 질의를 바꿀 때만 달라지므로 자주 있는 일은 아니다.
 */
export const PSSTORE_QUERY_HASHES = {
  categoryGrid: "88c0b9a1273c6d320c51cd73e390924e21ae28bf09f01cde8b84b1034b16cd03",
  conceptDetail: "c47dab9bb8162ee451bc6f0d8c2e8738ab48c8dd7c50dbe2b30f441c1b8ca119",
  productDetail: "1f0ca607e170abbfb7d67bd76c9bbc97f21fe2e807be49e5fe764e14566cb605",
  search: "4df6284f982e57bec70f23c77e2c219dc792eb19af7fb3d3a81767aa3f1958aa",
} as const;

/** 콘셉트 하나가 PS4, PS5 판을 다 갖는 경우가 많아 상품 id 로 가른다. PPSA = PS5, CUSA = PS4 세대 타이틀 id */
export const PSSTORE_PS5_TITLE_ID = /-PPSA\d/;
export const PSSTORE_PS4_TITLE_ID = /-CUSA\d/;

/**
 * 한국 스토어 제목 뒤에 붙는 지원 언어 표기. "ELDEN RING PS4 & PS5 (중국어(간체자), 한국어, ...)" 처럼 온다.
 * 게임 제목이 아니라 상품 표기라 titleKo 에서 걷어낸다.
 */
export const PSSTORE_LANGUAGE_SUFFIX = /\s*\((?:[^()]|\([^()]*\))*(?:어|판)(?:[^()]|\([^()]*\))*\)\s*$/;

/**
 * 콘셉트 상세(conceptRetrieveForCtasWithPrice)에는 이미지가 없다 — 목록 응답의 media 배열에만 있다(2026-09-14 실측).
 * 그래서 발견 단계에서 커버를 들고 내려간다. 질의가 화이트리스트라 선택 필드를 늘릴 수도 없다.
 *
 * 역할별 실측(한 페이지 24건 기준):
 *   MASTER 1024×1024(1:1, 24/24) | GAMEHUB_COVER_ART 3840×2160(16:9, 24/24)
 *   PORTRAIT_BANNER 1440×2160(2:3, 19/24) | SIXTEEN_BY_NINE_BANNER, FOUR_BY_THREE_BANNER 14~22/24
 * 카드용 가로 배너로는 항상 있는 GAMEHUB_COVER_ART 를, 세로 아트로는 PORTRAIT_BANNER 를 쓴다.
 */
export const PSSTORE_COVER_ROLE = "GAMEHUB_COVER_ART";
export const PSSTORE_PORTRAIT_ROLE = "PORTRAIT_BANNER";

/**
 * 이미지 CDN 은 w 를 그대로 쓰지 않고 사전 크기로 올림한다(2026-09-14 실측).
 * w=640 → 764×430(71KB)이 카드(460×215)의 2배 해상도에 가장 가깝다. 원본은 800KB 라 그대로 쓰면 안 된다.
 * w=600 → 세로 아트가 660×990 언저리로 온다(상세 헤더 600×900 기준).
 */
export const PSSTORE_COVER_WIDTH = 640;
export const PSSTORE_PORTRAIT_WIDTH = 600;

/**
 * price.applicability 가 이 값이면 "지금 살 수 있는 값"이 아니라 구독 가입자용 값이다.
 * PlayStation Plus 스페셜 카탈로그에 든 게임이 여기 걸린다 — discountedValue=0, 표시 문자열은 "포함".
 * 실측(2026-09-14): 사이버펑크 2077(234567), 파이널 판타지 XVI(10002100) 둘 다
 * UPSELL 버튼이 ADD_TO_CART 버튼보다 앞에 온다. 순서를 믿으면 안 되고 이 값으로 걸러야 한다.
 */
export const PSSTORE_UPSELL_APPLICABILITY = "UPSELL";

/**
 * 그 UPSELL 버튼이 "구독에 포함"을 뜻하는 경우만 골라 구독 키로 바꾼다.
 *
 * PlayStation 에는 구독 카탈로그를 통째로 주는 API 가 없다. 대신 콘셉트 상세의 webcta 가
 * 이 게임이 어느 구독에 들었는지 말해 준다 — 그래서 구독 축을 게임 단위로 채운다.
 *
 * 버튼 종류를 화이트리스트로 둔 이유: 같은 UPSELL 자리에 "포함"이 아닌 것들이 섞여 온다(2026-09-14 실측,
 * 콘셉트 192건 표본).
 *   포함    UPSELL_PS_PLUS_GAME_CATALOG(TIER_20, "포함") | UPSELL_PS_PLUS_CLASSIC_GAME_COLLECTION(TIER_30)
 *           UPSELL_EA_ACCESS_FREE | UPSELL_UBISOFT_PLUS_FREE
 *   체험판  UPSELL_PS_PLUS_TRIAL("2시간 체험") | UPSELL_EA_ACCESS_PLAY_FIRST_TRIAL("10시간 체험")
 *   할인    UPSELL_EA_ACCESS_DISCOUNT("EA Play로 10% 할인")
 * 체험판과 할인을 포함으로 읽으면 "구독하면 공짜"라는 틀린 말을 화면에 박는다.
 *
 * 티어 표기는 한국 스토어 문구 그대로다 — TIER_20 은 "스페셜", TIER_30 은 "디럭스"
 * (다른 나라의 Extra, Premium 에 해당한다. 한국은 클라우드 스트리밍이 없어 이름이 다르다).
 */
export const PSSTORE_INCLUSION_CTA: Record<string, string> = {
  UPSELL_PS_PLUS_GAME_CATALOG: "psplus_special",
  UPSELL_PS_PLUS_CLASSIC_GAME_COLLECTION: "psplus_deluxe",
  UPSELL_EA_ACCESS_FREE: "ea_play_ps",
  UPSELL_UBISOFT_PLUS_FREE: "ubisoft_plus_ps",
};
