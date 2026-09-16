// Steam 엔드포인트와 수집 파라미터. 값의 근거(실측 날짜, 한계)를 주석으로 남긴다.

export const STEAM_APPDETAILS_URL = "https://store.steampowered.com/api/appdetails";
export const STEAM_STORESEARCH_URL = "https://store.steampowered.com/api/storesearch/";
export const STEAM_FEATURED_URL = "https://store.steampowered.com/api/featuredcategories";
/** 인기순위 검색(비공식 JSON, 페이지당 최대 100개). featuredcategories 는 60개 안팎이라 시드 상위 N개용으로는 부족 */
export const STEAM_TOPSELLERS_URL = "https://store.steampowered.com/search/results/";
export const TOPSELLERS_PAGE_SIZE = 100;
/** 한 검색 쿼리가 돌려주는 깊이 한계. start=6000 은 응답, 7000 은 빈 응답(2026-09-14 확인) */
export const TOPSELLERS_MAX_PAGES = 65;
export const TOPSELLERS_PAGE_INTERVAL_MS = 1500;
/**
 * 출시예정 패스가 한 실행에서 넘길 페이지 수. 인기순위와 같은 count 를 쓰므로 400건까지 본다
 * (2026-09-16 실측: count=100 이면 100건이 온다. 다만 하한이 있어 count=10 에도 25건이 왔다).
 * 작게 잡은 이유는 DISCOVERY_PASSES 주석에 있다: 이 목록은 바닥나지 않아 상한이 곧 몫이다.
 */
export const UPCOMING_MAX_PAGES = 4;
export const STEAM_STORE_APP_URL = "https://store.steampowered.com/app";
/** 할인 종료 시각, 행사명은 appdetails 에 없다. 공개 스토어 API(GetItems)의 active_discounts 에만 있다 */
export const STEAM_STOREITEMS_URL = "https://api.steampowered.com/IStoreBrowseService/GetItems/v1/";
/** GetItems 는 appid 100개까지 한 요청에 넣어도 100개를 그대로 돌려준다(2026-09-14 확인) */
export const STEAM_GETITEMS_BATCH = 100;
/**
 * GetItems 의 type 필드(EStoreAppType). 0 = 게임, 4 = DLC.
 * 엘든 링(1245620) type 0, 그 DLC(2778580) type 4 로 확인했다(2026-09-14 실측).
 * appdetails 의 문자열 type("game" | "dlc") 과 같은 뜻이지만 배치 경로는 숫자로 온다.
 */
export const STEAM_APP_TYPE_DLC = 4;
/**
 * 체험판(EStoreAppType 1). 출시예정 목록을 훑기 시작하면서 필요해졌다 —
 * 2026-09-16 실측으로 그 목록 100건 중 10건이 체험판이었다(인기순위에는 거의 없다).
 * 가르지 않으면 "Aerosurge Demo" 같은 행이 본편으로 등록돼 출시예정 목록을 채운다.
 */
export const STEAM_APP_TYPE_DEMO = 1;
export const STEAM_ASSET_BASE_URL = "https://shared.akamai.steamstatic.com/store_item_assets";

/**
 * 패치 기록 — 공개 뉴스 API. 배치가 없어 게임 1개가 요청 1회다(빈도는 sync/patch-list 가 막는다).
 * 공지 중 patchnotes 태그만 서버가 걸러 준다(2026-09-15 실측: CS2 251건, 엘든 링 28건).
 */
export const STEAM_NEWS_URL = "https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/";
export const STEAM_NEWS_FEED = "steam_community_announcements";
export const STEAM_NEWS_TAG = "patchnotes";
/**
 * 한 게임에서 받아올 최근 패치 수. 30 이면 자주 고치는 게임(CS2 는 한 해 수십 건)도
 * 재조회 주기(PATCH_LIST_REFRESH_DAYS) 사이에 빠지는 것이 없다.
 */
export const STEAM_NEWS_COUNT = 30;
/** 본문을 안 쓰므로 1글자로 잘라 받는다(§10 저작권) — 응답 크기도 같이 줄어든다 */
export const STEAM_NEWS_MAXLENGTH = 1;
/**
 * 글 단위 스토어 주소. 응답의 url 은 akamaihd 외부 리다이렉트라 그대로 쓰지 않는다 —
 * 이 형태가 스토어 안에서 열린다(2026-09-15 확인: 200).
 */
export function steamNewsViewUrl(appid: string, gid: string): string {
  return `https://store.steampowered.com/news/app/${appid}/view/${gid}`;
}

/**
 * Steam 태그 id → 장르명. GetItems 는 appdetails 의 genres 대신 tagid 만 준다.
 * 태그 전체(446개)를 장르로 쓰면 장르 어휘가 폭발하므로 scripts/seed.ts 의 DEFAULT_GENRES 12종만 매핑한다.
 * id 는 IStoreService/GetTagList/v1?language=koreana 로 확인 (2026-09-14).
 */
export const STEAM_GENRE_TAG_IDS: Record<number, string> = {
  19: "액션", 21: "어드벤처", 597: "캐주얼", 492: "인디", 128: "대규모 멀티플레이어", 699: "레이싱",
  122: "RPG", 599: "시뮬레이션", 701: "스포츠", 9: "전략", 113: "무료 플레이", 493: "앞서 해보기",
};

/**
 * 발견용 검색 슬라이스. 한 쿼리는 ~6,500건에서 바닥나므로, 전체 인기순위를 다 훑은 뒤
 * 장르 태그로 잘라 계속 파고든다(슬라이스 간 중복은 호출부에서 제거). null = 태그 필터 없음.
 */
export const DISCOVERY_SLICES: Array<string | null> = [null, ...Object.keys(STEAM_GENRE_TAG_IDS)];

/**
 * 발견이 훑을 패스. 검색 필터 하나와 태그 슬라이스 하나가 한 패스다.
 *
 * 출시예정(comingsoon)을 맨 앞에 두는 이유(2026-09-16 실측): 인기순위만 훑으면 아직 안 나온 게임이
 * 카탈로그에 늦게 들어오고, 그 사이 미래 출시일을 가진 본편이 116건에 머문다. 같은 검색 API 에
 * filter 만 바꾸면 되므로 새 엔드포인트도 새 예산도 필요 없다.
 *
 * 그런데 출시예정 목록은 바닥나지 않는다 — 매일 새 등록이 들어와 늘 "처음 보는 후보" 를 준다.
 * 상한(UPCOMING_MAX_PAGES)을 두지 않으면 시드 몫을 이 패스가 통째로 먹고 인기순위 발견이
 * 영원히 안 돈다. 그래서 앞자리를 주되 몇 페이지에서 끊고 나머지는 인기순위에 넘긴다.
 */
export const DISCOVERY_PASSES: Array<{ filter: string; tags: string | null; maxPages: number }> = [
  { filter: "comingsoon", tags: null, maxPages: UPCOMING_MAX_PAGES },
  ...DISCOVERY_SLICES.map((tags) => ({ filter: "topsellers", tags, maxPages: TOPSELLERS_MAX_PAGES })),
];

/** GetItems 의 supported_player_categoryids → 멀티플레이 추론 (§11-7: 인원수는 알 수 없음) */
export const PLAYER_CATEGORY = {
  solo: [2],
  multi: [1],
  coop: [9, 38, 39, 48],
  pvp: [36, 37, 47, 49],
} as const;
