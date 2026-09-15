// 어댑터 인터페이스 — 설계서 §4.1. 어댑터는 "가져오기만" 한다. DB 반영은 sync/가 맡음.
import type { Currency, Platform, Region } from "@/server/db/schema";

/** 크롤러 공통 User-Agent (§10: UA 명시) — 실제 값은 서비스 아이덴티티(lib/site)에서 만든다 */
export { CRAWLER_USER_AGENT } from "@/lib/site";

// wikidata(회사)와 wikidata_game(게임)은 다른 소스다 — schema 의 sourceEnum 주석 참고
export type Source = "steam" | "psstore" | "xbox" | "nintendo" | "nintendo_jp" | "epic" | "gog" | "hltb" | "opencritic" | "metacritic" | "rss" | "wikidata" | "wikidata_game" | "gamepass";

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
  /** 본편이 알려주는 DLC 외부 ID 목록. steam appdetails 의 dlc 배열 (2026-09-14 실측) */
  dlcExternalIds?: string[];
  /** DLC 가 알려주는 본편 외부 ID. steam appdetails 의 fullgame.appid */
  parentExternalId?: string | null;
  /** 이 레코드 자체가 본편인지 DLC 인지. 주지 않는 소스는 undefined(= 본편으로 본다) */
  contentType?: "game" | "dlc" | null;
  /**
   * 이 스토어가 "지금 이 구독에 포함돼 있다"고 말한 구독 키 목록(subscriptions.key).
   *
   * 구독은 원래 카탈로그 전체를 받아 맞추는 축인데(run-subscriptions), PlayStation 은 그런 목록 API 가 없고
   * 대신 게임 단건 응답이 자기가 어느 구독에 들었는지 말해 준다. 그래서 게임 단위로 실어 나른다.
   * 주지 않는 소스는 undefined 이고, 그때는 구독 축을 아예 건드리지 않는다 — 빈 배열([])과 다르다.
   * 빈 배열은 "이 게임은 어느 구독에도 안 들었다"는 단언이라 기존 포함 기록을 내린다.
   */
  subscriptionKeys?: string[];
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
  minIntervalMs: number;
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
  /** 본문이 있는 스토어 페이지. 글 단위 주소가 없는 소스(gog 변경 기록)는 null */
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
  discoverPages?(): AsyncIterable<SearchCandidate[]>;
  /** 소스별 요청 간격(ms). 크롤 대상은 보수적으로 */
  minIntervalMs: number;
}

export type StoreAdapter = SourceAdapter<StoreSnapshot> & {
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
   * 2026-09-15 실측으로 steam 과 gog 둘뿐이다. 나머지는 패치 시점을 알 방법이 없다:
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
};

export type MetaAdapter = SourceAdapter<MetaSnapshot>;
export type NewsAdapter = SourceAdapter<NewsItem[]>;

export class AdapterError extends Error {
  constructor(message: string, public readonly source: Source, public readonly retryable = true) {
    super(message);
    this.name = "AdapterError";
  }
}
