// GOG 엔드포인트와 수집 파라미터. 값의 근거(실측 날짜, 한계)를 주석으로 남긴다.

export const GOG_CATALOG_URL = "https://catalog.gog.com/v1/catalog";
export const GOG_API_URL = "https://api.gog.com";
export const GOG_COUNTRY = "KR";
/** ko-KR 은 카탈로그를 0건으로 만든다 — 제목도 영문으로 온다 */
export const GOG_LOCALE = "en-US";
/** 카탈로그 한 페이지 최대치(실측 100). 전체 6,000여 건이 64페이지 안에 들어온다 */
export const GOG_CATALOG_PAGE_SIZE = 100;
/** 발견이 넘길 최대 페이지. 실제 종료 조건은 빈 페이지다 */
export const GOG_DISCOVERY_MAX_PAGES = 120;
/** 본편만 — 카탈로그의 productType 필터. DLC, 팩은 빠진다 */
export const GOG_GAME_FILTER = "in:game";
/** 배치 조회에 한 번에 넣을 ID 수. products 와 prices 를 각각 한 번씩 부른다 */
export const GOG_BATCH_SIZE = 50;

/**
 * 패치 기록 — products 응답에 expand=changelog 를 붙이면 변경 기록 HTML 이 통째로 온다
 * (2026-09-15 실측: 사이버펑크 2077 244KB, 위쳐 3 8.5KB, 위쳐 1 841B).
 *
 * 글 단위 API 가 아니라 한 덩어리 HTML 이라 제목(h1~h6)만 훑어 날짜가 든 것을 패치로 본다.
 * 날짜가 없는 제목("Vehicles", "Photo Mode")은 패치 안의 소제목이라 자동으로 걸러진다.
 * 본문은 읽지도 담지도 않는다(§10 저작권) — 우리가 남기는 것은 제목, 버전, 날짜뿐이다.
 */
export const GOG_CHANGELOG_EXPAND = "changelog";
/**
 * 한 게임에서 담을 변경 기록 수. 응답 자체는 통째로 오므로 이 값이 요청 크기를 줄이지는 않는다 —
 * 줄이는 것은 DB 행 수다. 사이버펑크는 제목만 수백 개라 상한이 없으면 한 게임이 표를 덮는다.
 */
export const GOG_CHANGELOG_MAX = 50;
