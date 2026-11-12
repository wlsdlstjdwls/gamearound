// 한국닌텐도 뉴스 수집의 주소, 한계, 규칙. 근거는 2026-10-07 실측(이 망과 서울 IP 에서 curl).
//
// 스토어 어댑터가 아니다 — 가격도 발견도 없고, 레지스트리(adapters/index)에 넣지 않는다.
// 목록과 글 모두 별도 JSON API 가 없고 Next 의 RSC 데이터(self.__next_f.push)로 HTML 안에 실려 온다. RSS, sitemap 은 404.

/** 사이트 안 상대 링크("/kr/games/...")를 풀 기준 */
export const NINTENDO_SITE_ORIGIN = "https://www.nintendo.com";

/** 뉴스 목록. www.nintendo.co.kr/* 는 여기로 넘어온다 */
export const NEWS_BASE_URL = "https://www.nintendo.com/kr/news";

/** 목록 쪽 번호는 `?p=N`(1부터). `/2`, `/page/2` 는 404 다 */
export const newsListUrl = (page: number): string => (page <= 1 ? NEWS_BASE_URL : `${NEWS_BASE_URL}?p=${page}`);

/** 글 주소. slug 는 Contentful 엔트리 ID 다 */
export const newsArticleUrl = (slug: string): string => `${NEWS_BASE_URL}/article/${slug}`;

/** 출처 이름(preorder_bonus_posts.source) */
export const NINTENDO_KR_NEWS_SOURCE = "nintendo_kr";

/**
 * 특전 글을 고르는 제목 규칙. 실측한 특전 글 여섯 건이 전부 "…예약 (판매 일정 및) 조기 구입 특전 안내" 꼴이다.
 * "특전" 만으로 고르면 본체 동시구매 피규어 행사(특전이 본문에만 있고 제목은 "…받아보세요!")는 안 걸리지만
 * 이벤트 공지("포스트카드 증정 이벤트")도 안 걸린다 — 그 둘은 게임 하나의 예약 특전이 아니라 일부러 뺀다.
 */
export const BONUS_TITLE_PATTERN = /특전/;
export const BONUS_TITLE_CONTEXT = /예약|조기 구입/;

/** 판매처 문단의 끝말. 이 문단이 있어야 그 소제목을 특전으로 친다 */
export const RETAILER_TAIL = /\s*(?:에서|에서는)?\s*구입 시 증정\s*$/;
export const RETAILER_MARK = /구입 시 증정/;
/**
 * "판매처별 조기 구입 특전" 마디의 처음과 끝. 이 마디 안에서는 "구입 시 증정" 꼬리 없이 판매처만 적은 문단도
 * 판매처로 읽는다 — 스플래툰 레이더스 글의 장패드가 "온라인(SSG.COM, …), 오프라인(…)" 으로만 적혔다(2026-10-07 실측).
 * 끝은 다운로드판 마디나 본체, 주변기기 예약 안내가 시작되는 소제목이다(그 밑 "오프라인", "온라인" 은 판매처 안내지 특전이 아니다).
 */
export const RETAIL_SECTION_START = /판매처별/;
export const RETAIL_SECTION_END = /다운로드|예약 판매 개시|예약 개시/;
/**
 * 마디 안에서 판매처 문단으로 받아 줄 수 있는 모양. 홍보 문장("Nintendo Store에서 『…』 를 구입해주시는 고객님을 대상으로 …")은
 * 게임 제목 괄호를 품고 길다 — 그런 문단을 판매처로 옮기면 문장을 복제하게 된다.
 */
export const RETAILER_PLAIN_MAX = 300;
export const RETAILER_PLAIN_REJECT = /『|니다\.?$/;
/**
 * 특전 이름이 아닌 소제목. 특전 이름은 물건 이름이라 게임 제목 괄호나 느낌표가 없다 —
 * "Joy-Con 2로 「…」를 함께 즐기자!", "다양한 특전이 포함된 『… Collection』", "…캠페인 실시 중!" 같은 홍보 소제목이
 * 그 밑 문단의 "구입 시 증정" 때문에 특전으로 잡혔다(2026-10-07 실측, 목록 8쪽 13건).
 */
export const NON_BONUS_HEADING = /[『「]|[!！]\s*$/;
/** 글 제목에서 게임 이름을 꺼내는 괄호. 번호로 못 이을 때 정확한 제목 일치로 잇는 데 쓴다 */
export const TITLE_BRACKET = /[『「]([^』」]+)[』」]/;
/** ※ 로 시작하는 조건 줄 */
export const NOTE_MARK = /^※\s*/;
/** 다운로드판 특전 마디. 소제목에 이 말이 있고 "대상 기간: …까지" 가 있으면 다운로드판 특전 하나로 친다 */
export const DOWNLOAD_HEADING = /다운로드/;
export const DOWNLOAD_PERIOD = /대상 기간\s*[:：]\s*(?:[^~]*~\s*)?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/;
/** 다운로드판 특전을 받는 곳. 글에는 "닌텐도 e숍" 으로 적힌다 */
export const DOWNLOAD_RETAILER = "닌텐도 e숍";

/** 한국 eShop 본편 번호. 7001 접두가 본편이다(7005 는 DLC, 7007 은 묶음 — catalog-structure 실측) */
export const KR_GAME_NSUID = /70010\d{9}/g;

/**
 * 파서 판. 글 틀이 바뀌어 규칙을 고치면 올린다 — 옛 판으로 뽑은 글만 다시 뽑을 수 있게.
 * 1: 2026-10-07 첫 판(소제목 + "구입 시 증정" 문단 짝, 다운로드판 대상 기간)
 */
export const PREORDER_PARSE_VERSION = 1;

/** 요청 간격. 목록 1쪽 + 새 글 몇 건이라 회당 요청이 적다. 닌텐도 스토어 수집과 같은 1초를 쓴다 */
export const NEWS_INTERVAL_MS = 1000;

/**
 * 게임 상세 "이벤트, 소식" 카드로 올릴 글의 제목 규칙(sync/game-events). 2026-11-12 뉴스 목록 4쪽(96건) 실측으로 정했다.
 * 순서가 우선순위다 — "체험판 배포 개시! ... 이벤트" 는 체험판으로 친다. 특전 글은 예약 특전 마디가 따로 받으므로 고르지 않는다.
 * 고른 예: "「피크민을 찾아라!」 이벤트가 개최됩니다", "게임 트라이얼 개최", "『스타폭스』 무료 업데이트가 오늘 배포", "온라인 챌린지".
 * 안 고르는 예: 발매 결정, 패키지 예약 일정, 인터뷰, CM 공개, 신작 소프트웨어 정보(여러 게임 묶음).
 */
export const EVENT_TITLE_RULES = [
  { kind: "demo", pattern: /체험판|게임 트라이얼/ },
  { kind: "update", pattern: /무료 업데이트/ },
  { kind: "event", pattern: /이벤트|대회|챌린지|축제|개최|컬래버레이션/ },
] as const;

/**
 * 공식 소개 페이지. 바깥 링크 글 중 주소가 게임 소개 사이트(/kr/games/...)인 것 — 사용자가 처음 든 예가 이것이다
 * (www.nintendo.com/kr/games/switch2/ampyc/, 2026-11-12). 이 페이지에 og 태그와 본편 번호가 다 있다.
 */
export const OFFICIAL_PAGE_LINK = /^https:\/\/www\.nintendo\.com\/kr\/games\//;

/**
 * 글 하나가 가리키는 게임이 이보다 많으면 묶음 글(Direct 정리, 세일 특집)로 보고 어느 게임에도 붙이지 않는다.
 * 이벤트 글은 스위치판과 스위치2 판 두 번호를 함께 적는 일이 흔해 2 로는 모자라다(피크민 이벤트 글: 번호 2개).
 */
export const EVENT_MAX_GAMES = 3;

/** 닌텐도 뉴스의 기본 공유 그림. 글마다 같은 로고라 카드 그림으로 쓰지 않는다 */
export const GENERIC_OG_IMAGE = /\/img\/og_nintendo\.png$/;
