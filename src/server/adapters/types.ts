// 어댑터 인터페이스 — 설계서 §4.1. 어댑터는 "가져오기만" 한다. DB 반영은 sync/가 맡음.
import type { Currency, DeckCompat, OsFamily, Platform, Region, RequirementTier, UserScoreKind } from "@/server/db/schema";

/** 크롤러 공통 User-Agent (§10: UA 명시) — 실제 값은 서비스 아이덴티티(lib/site)에서 만든다 */
export { CRAWLER_USER_AGENT } from "@/lib/site";

// wikidata(회사)와 wikidata_game(게임)은 다른 소스다 — schema 의 sourceEnum 주석 참고
export type Source = "steam" | "psstore" | "xbox" | "nintendo" | "nintendo_jp" | "epic" | "hltb" | "opencritic" | "metacritic" | "rss" | "wikidata" | "wikidata_game" | "gamepass";

export interface StoreSnapshot {
  platform: Platform;
  /** 이 가격을 파는 나라. 주지 않으면 KR 로 본다 — 기존 소스는 전부 한국 스토어다 */
  region?: Region;
  storeExternalId: string;
  /**
   * 스토어의 "작품" 코드(닌텐도 initial code). 나라가 달라도 같은 작품이면 같은 값이라
   * 지역 간 동일 게임 판정에 쓴다. 주는 소스만 채운다 — schema 의 game_platforms.title_code 주석 참고.
   */
  titleCode?: string | null;
  storeUrl: string;
  /** 통화의 최소 단위 정수(KRW=원, USD=센트). 통화는 아래 currency 가 말한다 */
  listPrice: number | null;
  currentPrice: number | null;
  /** 이 스토어가 파는 통화. 주지 않으면 KRW 로 본다 — 기존 소스는 전부 원화다 */
  currency?: Currency;
  discountPct: number | null;
  /** 할인 시작 시각 (ISO datetime). 주는 소스만 채움 — xbox */
  discountStartsAt?: string | null;
  /** 할인 종료 예정 시각 (ISO datetime). steam, xbox */
  discountEndsAt?: string | null;
  /** 행사명 ("여름 세일", "주말 특가" 등). steam 만 토큰 → 한국어 라벨 */
  discountName?: string | null;
  currentVersion?: string | null;
  releaseDate?: string | null;   // ISO date (YYYY-MM-DD)
  /**
   * 이 스토어가 "추가 콘텐츠 있음"이라고 알려준 값. xbox Properties.HasAddOns 가 준다.
   * DLC 목록을 못 가져오는 플랫폼에서도 유무만은 표시하기 위한 별도 신호다.
   */
  hasAddOns?: boolean | null;
  /**
   * 밸브가 매긴 스팀덱 구동 등급. 스팀만 준다(schema 의 deck_compat 주석).
   * 밸브가 아직 안 본 게임은 응답이 "모름"(0)으로 오고, 우리는 그것을 값이 아니라 null 로 옮긴다.
   */
  deckCompat?: DeckCompat | null;
  /**
   * 그 OS 네이티브 지원 여부. 스토어가 말한 값 그대로 옮긴다 — 우회 실행(Proton 등)은 여기 담지 않는다.
   * 세 값을 객체로 묶지 않는 이유: 반영 단계가 평평한 필드를 그대로 훑어 널만 걸러 낸다(platform-writer).
   */
  nativeWindows?: boolean | null;
  nativeMac?: boolean | null;
  nativeLinux?: boolean | null;
  /**
   * 이 판이 한국어 글자(화면, 자막) / 한국어 음성을 지원하는가. schema 의 ko_text 주석.
   * 스토어가 구분해 주지 않는 값은 undefined 로 둔다 — false 는 "지원 안 한다" 는 단언이다.
   */
  koText?: boolean | null;
  koVoice?: boolean | null;
  /** 본편이 알려주는 DLC 외부 ID 목록. steam appdetails 의 dlc 배열 (2026-09-14 실측) */
  dlcExternalIds?: string[];
  /** DLC 가 알려주는 본편 외부 ID. steam appdetails 의 fullgame.appid */
  parentExternalId?: string | null;
  /**
   * 이 레코드 자체가 무엇인지. 주지 않는 소스는 undefined(= 본편으로 본다).
   * demo, music 이 있는 이유: 출시예정 목록에는 체험판과 사운드트랙이 섞여 온다
   * (steam comingsoon 100건 중 체험판 10건, 사운드트랙 7건 — 2026-09-16 실측).
   * 본편으로 등록하면 출시예정 화면이 그 17%로 찬다.
   * software 는 게임이 아닌 앱(Wallpaper Engine, Soundpad)이다 — 인기순 앞줄을 차지해서 뺀다.
   */
  contentType?: "game" | "dlc" | "demo" | "music" | "software" | null;
  /**
   * 이 스토어가 "지금 이 구독에 포함돼 있다"고 말한 구독 키 목록(subscriptions.key).
   *
   * 구독은 원래 카탈로그 전체를 받아 맞추는 축인데(run-subscriptions), PlayStation 은 그런 목록 API 가 없고
   * 대신 게임 단건 응답이 자기가 어느 구독에 들었는지 말해 준다. 그래서 게임 단위로 실어 나른다.
   * 주지 않는 소스는 undefined 이고, 그때는 구독 축을 아예 건드리지 않는다 — 빈 배열([])과 다르다.
   * 빈 배열은 "이 게임은 어느 구독에도 안 들었다"는 단언이라 기존 포함 기록을 내린다.
   */
  subscriptionKeys?: string[];
  /**
   * 그 스토어 이용자들이 매긴 점수. 평론가 점수와 다른 축이라 따로 둔다.
   * value 는 0~100 정수이고 뜻은 kind 가 말한다(schema 의 user_score 주석).
   * 값을 안 주는 스토어는 이 필드를 비운다 — 0 을 넣으면 "아무도 안 좋아한다" 가 된다.
   */
  userScore?: { value: number; kind: UserScoreKind; count: number } | null;

  // Steam 기준 소스에서만 채워지는 게임 마스터 정보(신규 게임 생성용)
  meta?: {
    titleEn: string;
    titleKo?: string | null;
    description?: string | null;
    /** 가로 배너(460×215) — 카드, 목록용 */
    coverUrl?: string | null;
    /** 세로 아트(600×900) — 상세 헤더용. 주는 소스만 채움(steam GetItems) */
    portraitUrl?: string | null;
    developer?: string | null;
    publisher?: string | null;
    genres?: string[];
    multiplayer?: { localMax?: number; onlineMax?: number; coop?: boolean; pvp?: boolean; solo?: boolean };
  };
}

export interface MetaSnapshot {
  /**
   * 검색 별칭(game_aliases). 제목에 없는 말로 게임을 찾게 하는 값이라 다른 메타 값과 성격이 다르다 —
   * 플레이타임, 평점은 "그 게임의 속성"이지만 별칭은 "그 게임을 부르는 다른 이름"이다.
   * 그래도 MetaSnapshot 에 둔 이유는 조회 경로가 같기 때문이다(제목으로 매칭 후 단건 조회).
   */
  aliases?: string[];
  playtime?: { main: number | null; extra: number | null; completionist: number | null };
  /**
   * 이 게임을 기록해 둔 이용자 수(HLTB). 플레이타임과 같은 응답에서 오지만 뜻이 달라 따로 둔다 —
   * 저쪽은 "얼마나 걸리나" 이고 이쪽은 "몇 명이나 거쳤나" 다. 후자가 인기 축의 재료다
   * (schema 의 games.hltbLoggedCount).
   */
  loggedCount?: number | null;
  scores?: { metacritic?: number | null; opencritic?: number | null };
  genres?: string[];
  multiplayer?: { localMax?: number; onlineMax?: number; coop?: boolean; pvp?: boolean };
}

/**
 * 회사 정보. 스토어가 아니라 백과사전(위키데이터)에서 온다 — 스토어는 회사명 문자열만 주고 국가를 주지 않는다.
 * 값이 없는 필드는 null 로 오고, sync 는 null 로 기존 값을 덮지 않는다.
 */
export interface CompanyInfo {
  /** 외부 식별자(위키데이터 Q번호). 재조회 키이자 중복 방지 키 */
  externalId: string;
  nameEn: string;
  nameKo: string | null;
  countryCode: string | null;   // ISO 3166-1 alpha-2
  countryNameKo: string | null;
  foundedAt: string | null;     // YYYY-MM-DD
  hqNameKo: string | null;
  websiteUrl: string | null;
  description: string | null;
}

/**
 * 회사 조회 어댑터. `lookup` 은 **확실할 때만** 값을 준다 —
 * 동명이인(같은 이름의 다른 회사)을 자동 확정하면 국가가 틀린 채로 화면에 박힌다.
 * 후보가 0건이거나 2건 이상이면 null 을 돌려주고, 호출부가 관리자 검수 큐로 넘긴다.
 */
export interface CompanyAdapter {
  source: Source;
  lookup(name: string): Promise<CompanyInfo | null>;
  /**
   * 이름 여러 개를 한 번에 묻는다. 수집 배치가 쓴다 — 이름마다 lookup 을 부르면 느린 상세 질의가
   * 이름 수만큼 나가지만, 여기서는 후보를 모아 몇 번으로 끝낸다.
   * 결과에 없는 이름은 "이번에 못 물었다"(마감, 오류)는 뜻이다 — 못 찾았다는 뜻이 아니다.
   */
  lookupMany(names: string[], opts: CompanyLookupOptions): Promise<CompanyLookupBatch>;
  minIntervalMs: number;
}

/** 이름 하나의 판정. not_found 와 ambiguous 를 가르는 이유는 사람이 볼 때 할 일이 달라서다 */
export type CompanyLookup =
  | { status: "found"; info: CompanyInfo }
  /** 검색에 이름이 정확히 일치하는 항목이 없다 — 위키데이터에 없는 회사거나 우리 표기가 약칭이다 */
  | { status: "not_found" }
  /** 후보는 있었지만 회사 하나로 못 좁혔다(동명 회사, 회사가 아닌 동명 항목) */
  | { status: "ambiguous" };

export interface CompanyLookupOptions {
  /** 이 시각(epoch ms)을 넘기면 남은 이름은 묻지 않고 돌아온다. 함수 실행 상한 안에 끝내기 위해서다 */
  deadline?: number;
  /**
   * 요청 하나를 감싸는 재시도. 재시도 정책은 sync 가 정한다(sync/retry) — 어댑터가 정하면
   * 배치 전체를 다시 도는 것 말고는 방법이 없어 이미 받은 검색 결과까지 버리게 된다.
   */
  retry?: <T>(fn: () => Promise<T>) => Promise<T>;
}

export interface CompanyLookupBatch {
  results: Map<string, CompanyLookup>;
  errors: Array<{ name: string; error: unknown }>;
}

/**
 * 구독 카탈로그 어댑터. 구독은 게임 단위가 아니라 "카탈로그 전체 목록" 단위로 온다.
 * 반환값은 스토어 외부 ID 목록이고, 우리 DB 의 game_platforms.store_external_id 와 맞춘다.
 */
export interface SubscriptionAdapter {
  source: Source;
  /** catalogId 는 subscriptions.catalog_id (Game Pass 컬렉션 GUID 등) */
  fetchCatalog(catalogId: string): Promise<string[]>;
  minIntervalMs: number;
}

export interface NewsItem {
  title: string;
  url: string;
  sourceName: string;
  thumbnailUrl?: string;
  publishedAt: string; // ISO datetime
}

/**
 * 스토어가 공개한 패치 기록 1건. 본문은 담지 않는다 — 이유는 schema 의 patch_notes 주석(§10 저작권).
 * 이 계약이 대답하는 것은 "언제 고쳤나" 이고, "무엇을 고쳤나" 는 스토어 페이지로 보낸다.
 */
export interface PatchNote {
  /** 스토어 안에서 이 패치를 가리키는 값. 재수집할 때 같은 패치를 두 번 넣지 않기 위한 키다 */
  externalId: string;
  title: string;
  /** 제목에서 읽어낸 버전. 버전을 안 적는 게시물이 흔해 null 이 기본이다 */
  version?: string | null;
  /** 본문이 있는 스토어 페이지. 글 단위 주소를 주지 않는 소스는 null 이고, 화면은 링크 없이 보여 준다 */
  url?: string | null;
  publishedAt: string; // ISO datetime
}

export interface SearchCandidate {
  externalId: string;
  title: string;
  url: string;
  /**
   * 목록 응답에만 이미지가 있는 소스(psstore)를 위한 자리. 단건 조회로는 못 얻는 값이라
   * 발견 단계에서 들고 내려간다 — 채우지 않는 소스는 undefined 다.
   */
  coverUrl?: string | null;
  portraitUrl?: string | null;
  /** 지역 간 동일 작품 판정용 코드. 제목이 다른 문자 체계일 때 유일한 연결 고리다 */
  titleCode?: string | null;
  /**
   * 목록 응답이 게임 마스터까지 다 주는 소스(nintendo_jp 검색 JSON)를 위한 자리.
   * 그런 소스는 단건 조회 경로가 아예 없어서(nsuid 로 되묻는 API 가 없다) 여기서 받은 것이
   * 신규 게임 생성의 유일한 근거가 된다.
   */
  meta?: StoreSnapshot["meta"];
  /** 목록이 알려주는 기기, 발매일. meta 와 같은 이유로 들고 내려간다 */
  platform?: Platform;
  releaseDate?: string | null;
  /**
   * 이 후보가 스토어 **전체 인기순위**에서 몇 번째였나(1 = 1위).
   *
   * 발견 목록의 순서 자체가 정보인데 여태 버리고 있었다 — 판매량을 주는 스토어는 없으므로
   * 이 순번이 우리가 얻을 수 있는 가장 좋은 인기 근거다. 목록을 걸어 내려가는 김에 공짜로 딸려 온다.
   *
   * 채우지 않는 경우가 둘이다. 하나, 인기순이 아닌 목록(출시예정, 검색 결과) — 그 순서는 인기와
   * 무관하다. 둘, 장르로 좁힌 목록 — "액션 3위" 를 전체 순위와 같은 칸에 넣으면 거짓말이 된다.
   * 둘 다 undefined 로 둔다. 0 이나 큰 수를 넣지 않는다 — "모름" 과 "꼴찌" 는 다른 값이다.
   */
  rank?: number;
}

export interface SourceAdapter<T extends StoreSnapshot | MetaSnapshot | NewsItem[]> {
  source: Source;
  /** 제목으로 후보 검색 — 매칭 단계용 */
  search(query: string): Promise<SearchCandidate[]>;
  /** 외부 ID로 단건 조회 */
  fetch(externalId: string): Promise<T>;
  /**
   * 여러 ID를 한 요청으로 조회 (지원하는 소스만). 카탈로그가 수만 건이면 단건 조회로는 예산이 안 나온다.
   * 반환 Map 에 없는 ID = 그 게임만 실패 — 배치 전체를 실패로 만들지 않는다.
   */
  fetchMany?(externalIds: string[]): Promise<Map<string, T>>;
  /** fetchMany 한 요청에 넣을 수 있는 ID 수 */
  batchSize?: number;
  /**
   * fetchMany 가 **가격만** 주는 소스. 신규 등록 대상은 게임 마스터(meta)가 없으면 만들 수 없어
   * 어디서 얻을지를 여기서 밝힌다:
   *   "detail"    — 단건 조회(fetch)로 상세를 받는다. nintendo(KR) 상품 HTML
   *   "discovery" — 발견 목록이 이미 상세를 줬다. nintendo_jp 검색 JSON (단건 조회 경로가 없다)
   * 비우면 "배치가 마스터까지 준다"는 뜻이다(steam GetItems).
   */
  batchPricesOnly?: "detail" | "discovery";
  /**
   * 카탈로그를 페이지 단위로 훑는다 (지원하는 소스만). 이게 없으면 그 소스는
   * 이미 등록된 게임에 가격을 붙이기만 할 뿐, 그 플랫폼 독점작을 영원히 못 가져온다.
   *
   * "상위 N개" 가 아니라 페이지를 흘려보내는 이유: N 이 카탈로그보다 작은 소스(steam, nintendo)에서
   * 상위 N개만 돌려주면 그 N개가 전부 이미 아는 것이 된 순간 신규가 영원히 0건이 된다.
   * 어디까지 아는지는 DB 를 보는 호출부(sync/store-targets)만 알기 때문에, 거르는 일도 멈출 시점도 호출부가 정한다.
   * 요청 간격(minIntervalMs)은 페이지를 넘길 때마다 어댑터가 지킨다.
   */
  discoverPages?(startPage?: number): AsyncIterable<SearchCandidate[]>;
  /**
   * discoverPages 가 startPage 를 받아 **그 쪽부터** 읽을 수 있다(순서가 고정된 전수 목록).
   * 켜면 sync 가 지난 실행이 멈춘 쪽을 기억해 넘긴다(store-targets 의 발견 커서). 끄면 늘 처음부터다 —
   * 인기순, 관련도순처럼 순서가 매번 바뀌는 목록은 쪽 번호를 기억해 봐야 뜻이 없다.
   */
  resumableDiscovery?: boolean;
  /**
   * 발견 목록 한 쪽에 드는 시간(ms). 비우면 minIntervalMs 로 센다. 크론 몫 어림(cron-plan.test)만 쓴다 —
   * 목록 요청 간격이 상세 요청 간격과 다른 소스(nintendo 는 목록 1초, 상세 4초)를 위해 있다.
   */
  discoverPageMs?: number;
  /** 소스별 요청 간격(ms). 크롤 대상은 보수적으로 */
  minIntervalMs: number;
}

export type StoreAdapter = SourceAdapter<StoreSnapshot> & {
  /**
   * 스토어 전체 인기순위만 앞에서부터 훑는다. 후보에 rank 가 실려 온다.
   *
   * discoverPages 와 가르는 이유(2026-09-21 실측): 발견은 "신규를 N개 채우면 멈춘다".
   * 스팀은 출시예정 패스가 맨 앞이고 그 목록은 매일 새것을 주므로, 신규 몫이 거기서 다 차면
   * 인기순위 페이지를 **한 장도 안 읽고** 끝난다(실측: seed-top=60 이 첫 페이지에서 want 로 멈췄다).
   * 순위는 신규와 아무 상관이 없는 값인데 신규 목표에 인질로 잡혀 있었다.
   *
   * 이 경로는 출시예정을 거치지 않고 인기순위 1위부터 바로 연다 — 낭비도 없고 멈출 이유도 없다.
   * 순위를 주지 않는 소스는 이 메서드를 두지 않는다(콘솔 스토어는 인기순 목록이 없다).
   */
  listPopularPages?(maxPages: number): AsyncIterable<SearchCandidate[]>;
  /**
   * 본편이 가진 DLC 외부 ID 목록. 배치 조회가 "자식 → 부모" 방향만 주는 소스(steam GetItems)에서는
   * 본편을 아무리 갱신해도 그 본편의 DLC 를 영원히 못 만난다 — 목록은 단건 요청으로만 온다.
   * 요청을 한 번 더 쓰는 경로라 호출은 sync/dlc-list 가 빈도와 건수를 막아 준다.
   * 스냅샷에 dlcExternalIds 를 이미 채워 주는 소스는 이 메서드를 두지 않는다.
   */
  listDlcIds?(key: string): Promise<string[]>;
  /**
   * 목록 요청이 ID 만이 아니라 게임 마스터까지 주는 소스용(nintendo_jp 검색 JSON).
   * 그런 소스는 배치가 가격만 주고 단건 조회 경로가 아예 없어서, 여기서 받은 마스터가
   * 새 DLC 를 만들 유일한 근거다 — ID 만 돌려주면 제목도 이미지도 없는 게임이 생긴다.
   * listDlcIds 와 둘 중 하나만 둔다.
   */
  listDlcCandidates?(key: string): Promise<SearchCandidate[]>;
  /**
   * 위 두 메서드에 넘길 키를 어디서 읽을지. 비우면 store_external_id.
   * 닌텐도 일본은 판매 단위(nsuid)가 아니라 작품 코드(icode)로 본편과 DLC 가 묶이고,
   * nsuid 로 되묻는 질의가 없어서 game_platforms.title_code 말고는 물어볼 키가 없다.
   */
  dlcListKey?: "externalId" | "titleCode";
  /**
   * 이 게임의 패치 기록. **공개하는 스토어에만 둔다.**
   *
   * 2026-09-15 실측으로 steam 뿐이다. 나머지는 패치 시점을 알 방법이 없다:
   *   xbox      displaycatalog 의 Packages[].Version 이 전부 "0" 이고(철권 8 확인),
   *             남는 LastModifiedDate 는 가격, 이미지 수정에도 움직여 패치 시각이 아니다
   *   psstore   질의가 화이트리스트라 필드를 늘릴 수 없다(어댑터 주석의 해시 고정)
   *   nintendo  eShop 응답에 버전도 갱신일도 없다
   *   epic      catalogOffer 에 같은 성격의 필드가 없다
   * 추측해서 채우지 않는다 — 패치가 아닌 날짜를 패치라고 적으면 "패치 속도" 가 통째로 거짓말이 된다.
   *
   * 게임 1개가 요청 1회라 빈도와 건수는 sync/patch-list 가 막는다(listDlcIds 와 같은 경로다).
   */
  listPatchNotes?(key: string): Promise<PatchNote[]>;

  /**
   * 이 게임의 구동 사양. **배치로 못 받는다** — GetItems 응답에는 requirement 계열 키가 아예 없고
   * (include_platforms, include_full_description 을 켜고 확인했다, 2026-09-18 실측)
   * 단건 경로(appdetails)에만 있다. 그래서 게임 1개가 요청 1회다.
   *
   * 대신 사양은 거의 안 변해서 한 바퀴 돌고 나면 다시 물을 일이 거의 없다 —
   * 빈도와 건수는 sync/requirements 가 막는다(listDlcIds 와 같은 경로다).
   * 콘솔 스토어에는 이 메서드를 두지 않는다. 사양이라는 개념 자체가 없다.
   */
  /** externalId: 열쇠가 storeUrl 인 소스(에픽)가 주소로 못 찾을 때 외부 ID 로 다시 물을 수 있게 같이 넘긴다 */
  fetchRequirements?(key: string, externalId?: string): Promise<RequirementsResult>;
  /**
   * 위 메서드에 넘길 키를 어디서 읽을지. 비우면 store_external_id.
   * 에픽의 외부 ID 는 `namespace:offerId` 인데 사양을 주는 콘텐츠 API 는 그것을 모르고 페이지
   * slug 만 받는다. slug 가 들어 있는 자리가 store_url 뿐이라 거기서 읽는다(dlcListKey 와 같은 모양).
   */
  requirementsKey?: "externalId" | "storeUrl";
};

/**
 * 사양 한 덩어리(한 OS, 한 등급). 스토어가 준 원문과 우리가 뽑아낸 값을 함께 나른다 —
 * 원문을 같이 저장해야 파서를 고친 뒤 재수집 없이 다시 돌릴 수 있다(schema 의 game_requirements 주석).
 */
/**
 * 사양 요청 한 번의 답. 사양 말고 언어 지원도 같이 싣는다 —
 * 스팀 appdetails, 에픽 콘텐츠 API 는 사양 옆에 지원 언어를 같이 주는데, 다른 경로로 받으면 같은 응답을 한 번 더 받게 된다.
 * korean 이 undefined 면 그 응답이 언어를 말하지 않았다는 뜻이라 기존 값을 건드리지 않는다.
 */
export interface RequirementsResult {
  requirements: RequirementSnapshot[];
  korean?: KoreanSupport;
}

/** 한국어 지원. 값을 모르는 칸은 undefined 다(StoreSnapshot.koText 주석) */
export interface KoreanSupport {
  text?: boolean;
  voice?: boolean;
}

export interface RequirementSnapshot {
  osFamily: OsFamily;
  tier: RequirementTier;
  rawHtml: string;
  osText: string | null;
  cpuText: string | null;
  gpuText: string | null;
  directxText: string | null;
  noteText: string | null;
  /** 단위를 못 읽었으면 null 이다. 짐작해서 채우지 않는다 */
  ramMb: number | null;
  vramMb: number | null;
  storageMb: number | null;
  parseVersion: number;
  /** 0~1. 판정에 쓰는 네 칸 중 몇 할을 건졌나 */
  parseConfidence: number;
}

export type MetaAdapter = SourceAdapter<MetaSnapshot>;
export type NewsAdapter = SourceAdapter<NewsItem[]>;

export class AdapterError extends Error {
  constructor(message: string, public readonly source: Source, public readonly retryable = true) {
    super(message);
    this.name = "AdapterError";
  }
}
