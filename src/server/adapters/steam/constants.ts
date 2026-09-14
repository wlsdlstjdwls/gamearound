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
export const STEAM_ASSET_BASE_URL = "https://shared.akamai.steamstatic.com/store_item_assets";

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

/** GetItems 의 supported_player_categoryids → 멀티플레이 추론 (§11-7: 인원수는 알 수 없음) */
export const PLAYER_CATEGORY = {
  solo: [2],
  multi: [1],
  coop: [9, 38, 39, 48],
  pvp: [36, 37, 47, 49],
} as const;
