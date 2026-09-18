// 공개 DTO — route, 컴포넌트가 받는 모양. 모두 JSON 직렬화 가능(Date → ISO 문자열).
// DB 행 타입을 그대로 노출하지 않는 이유: 스키마가 바뀌어도 화면 계약은 유지돼야 한다.
import type { CompanyRole, ContentType, Currency, Platform, Region, SyncStatus, UpgradeKind, UserScoreKind } from "@/server/db/schema";

/**
 * 스토어 이용자가 매긴 점수. 평론가 점수와 축이 다르다.
 * value 는 0~100 정수이고 무슨 뜻인지는 kind 가 말한다 — 화면은 kind 를 보고 문구를 고른다(lib/user-score).
 */
export type UserScoreDto = { value: number; kind: UserScoreKind; count: number };

export type PlatformDto = {
  platform: Platform;
  /**
   * 이 가격을 파는 나라. 같은 기기라도 나라가 다르면 다른 행이라 화면에서 구분해 줘야 한다 —
   * 한국 계정으로 못 사는 가격을 아무 표시 없이 나란히 두면 최저가를 잘못 읽는다.
   */
  region: Region;
  storeUrl: string | null;
  releaseDate: string | null;
  currentVersion: string | null;
  listPrice: number | null;
  currentPrice: number | null;
  /** 위 두 가격의 통화. 가격은 최소 단위 정수라 화면은 이 값 없이 포맷할 수 없다 */
  currency: Currency;
  discountPct: number | null;
  /** 할인 기간, 행사명 (소스가 주는 만큼만. steam=종료+행사명, xbox=시작, 종료) */
  discountStartsAt: string | null;
  discountEndsAt: string | null;
  discountName: string | null;
  metacriticScore: number | null;
  opencriticScore: number | null;
  /** 이 스토어 이용자들의 점수. 주지 않는 스토어(PlayStation, 닌텐도, Epic, GOG)는 null */
  userScore: UserScoreDto | null;
  lastSyncedAt: string | null;
  syncStatus: SyncStatus | null;
  /** 이 스토어가 "추가 콘텐츠 있음"이라고 알려준 값. DLC 목록을 못 가져오는 플랫폼에서도 유무는 말할 수 있다 */
  hasAddOns: boolean | null;
  /**
   * 이 플랫폼에서 이 게임을 포함하는 구독. 게임 단위가 아니라 플랫폼 단위로 매다는 이유:
   * Game Pass 는 Xbox 에서만 유효한데 게임 위에 붙여 두면 PS 탭을 보는 사람에게도
   * "구독으로 할 수 있다" 로 읽힌다. 값이 붙은 스토어 안에서만 말해야 참이다.
   */
  subscriptions: SubscriptionDto[];
};

export type NewsDto = {
  id: string;
  title: string;
  url: string;
  sourceName: string;
  thumbnailUrl: string | null;
  publishedAt: string;
  /** 홈 뉴스 목록에서 연결 게임 표시용 */
  game?: { slug: string; title: string } | null;
};

/** 패치 기록 한 건. 본문은 담지 않는다 — 이유는 schema 의 patch_notes 주석(§10 저작권) */
export type PatchNoteDto = {
  id: string;
  /** 제목에서 읽어낸 버전. 버전을 안 적는 게시물이 흔해 null 이 기본이다 */
  version: string | null;
  title: string;
  /**
   * 우리가 쓴 한글 제목과 한글 요약. 스토어가 한국어 패치 노트를 주지 않아 채워 넣는 값이다.
   * 아직 안 채운 기록은 null 이고 화면은 원문 제목으로 폴백한다 — 채우는 일이 밀려도 목록은 선다.
   */
  titleKo: string | null;
  summaryKo: string | null;
  /** 본문이 있는 스토어 페이지. 글 단위 주소가 없는 소스(GOG)는 null 이고 화면은 링크 없이 보여 준다 */
  url: string | null;
  publishedAt: string;
};

/**
 * 한 플랫폼의 패치 기록 묶음. "플랫폼별 패치 속도 비교"가 쓰는 모양이다.
 *
 * 속도 값은 전부 **우리가 모은 범위 안에서만** 참이다. 스토어가 돌려주는 최근 몇십 건만 받고
 * 수집을 시작하기 전의 패치는 아예 모른다 — 화면이 그 사실을 함께 말해야 한다.
 */
export type PlatformPatchesDto = {
  platform: Platform;
  region: Region;
  notes: PatchNoteDto[];
  /** 기록된 패치 사이 평균 간격(일). 기록이 2건 미만이면 계산할 수 없어 null */
  averageIntervalDays: number | null;
  /** 가장 최근 패치 시각 */
  latestAt: string | null;
  count: number;
};

export type PlaytimeDto = {
  mainStoryHours: string | null;
  mainExtraHours: string | null;
  completionistHours: string | null;
  lastSyncedAt: string | null;
};

export type SourceRefDto = {
  source: string;
  externalId: string;
  url: string | null;
};

/** 게임에 붙는 회사 요약. 상세 화면의 칩과 회사 화면 링크가 이 모양을 쓴다 */
export type GameCompanyDto = {
  slug: string;
  /** 화면에 그대로 쓸 이름. 한국어명이 있으면 한국어, 없으면 영문 */
  name: string;
  countryNameKo: string | null;
  role: CompanyRole;
};

/** 회사 화면의 헤더 */
export type CompanyDetail = {
  slug: string;
  name: string;
  nameEn: string;
  nameKo: string | null;
  countryCode: string | null;
  countryNameKo: string | null;
  /** 설립 연도만 쓴다 — 일 단위는 화면에서 의미가 없고 위키데이터 정밀도도 들쭉날쭉하다 */
  foundedYear: number | null;
  hqNameKo: string | null;
  websiteUrl: string | null;
  description: string | null;
  lastSyncedAt: string | null;
  gameCount: number;
  onSaleCount: number;
};

/** 회사 목록의 한 줄 */
export type CompanySummary = {
  slug: string;
  name: string;
  countryNameKo: string | null;
  gameCount: number;
};

/** 본편에 딸린 DLC 한 건. 가격은 본편과 같은 플랫폼 계약(PlatformDto)을 쓴다 */
export type DlcDto = {
  slug: string;
  title: string;
  platforms: PlatformDto[];
};

/** 지금 이 플랫폼을 구독으로 즐길 수 있는지 */
/** 구독 포함 배지 1개. 기기는 담지 않는다 — 한 구독이 여러 기기에 걸치고(PS Plus), 화면도 쓰지 않는다 */
export type SubscriptionDto = {
  key: string;
  label: string;
};

/** 세대 간 업그레이드 안내 */
export type UpgradeDto = {
  fromPlatform: Platform;
  toPlatform: Platform;
  kind: UpgradeKind;
  price: number | null;
  storeUrl: string | null;
  note: string | null;
};

export type GameDetail = {
  id: string;
  slug: string;
  /**
   * 이 행이 본편인지 DLC, 에디션, 번들, 체험판인지. 화면이 제목 옆에 그대로 적는다 —
   * DLC 도 자기 상세를 갖는데, 종류를 안 적으면 "왜 이 게임은 값이 1,900원이지" 로 읽힌다.
   */
  contentType: ContentType;
  /**
   * 본편. DLC, 에디션에만 있고 본편 자신은 null 이다.
   * 스토어가 부모를 안 알려 준 자식도 많아(부모 없는 DLC 18,642건) null 이 흔하다 — 링크는 있을 때만 건다.
   */
  parent: { slug: string; title: string } | null;
  titleKo: string | null;
  titleEn: string;
  description: string | null;
  coverUrl: string | null;
  /** 세로 아트(600×900). 없는 게임은 null → UI 가 coverUrl(가로 배너)로 폴백 */
  portraitUrl: string | null;
  developer: string | null;
  publisher: string | null;
  localMaxPlayers: number | null;
  onlineMaxPlayers: number | null;
  supportsSolo: boolean;
  supportsCoop: boolean;
  supportsPvp: boolean;
  isRetro: boolean;
  /**
   * 게임이 아는 가장 이른 출시일. 플랫폼 행 전체에서 고른 값이라 어느 탭을 보든 같다.
   *
   * 왜 게임 단위로 한 칸을 더 두나: 출시일은 플랫폼마다 따로 오는데 PlayStation 은 그 값을
   * 아예 주지 않는다(2026-09-16 실측). PS 탭만 열어 본 사람에게는 출시일이 없는 게임이 되는데,
   * 같은 게임의 스팀 행은 날짜를 알고 있다 — 스토어끼리 빈칸을 메우게 한다.
   * 날짜를 아무도 모르면 null 이고, 그때는 화면이 그 줄을 그리지 않는다.
   */
  releaseDate: string | null;
  updatedAt: string;
  genres: string[];
  platforms: PlatformDto[];
  playtime: PlaytimeDto | null;
  news: NewsDto[];
  sourceRefs: SourceRefDto[];
  /** 회사 엔티티로 승격된 것만. 매칭 전이면 빈 배열이고 화면은 developer/publisher 문자열로 폴백한다 */
  companies: GameCompanyDto[];
  dlcs: DlcDto[];
  /**
   * 에디션, 기종 변형("PS4 & PS5 버전", "디지털 디럭스 에디션").
   * DLC 와 나눠 두는 이유: 둘 다 본편의 자식이지만 사용자에게는 다른 질문이다 —
   * DLC 는 "더 살 것이 있나", 에디션은 "어느 판을 살까". 한 칸에 섞으면 둘 다 안 읽힌다.
   */
  editions: DlcDto[];
  /** 지금 구독으로 즐길 수 있는 플랫폼들 */
  subscriptions: SubscriptionDto[];
  upgrades: UpgradeDto[];
};

/** 카드/목록용 요약. `best`는 대표 플랫폼(할인 최대 또는 최저가) */
export type GameSummary = {
  slug: string;
  titleKo: string | null;
  titleEn: string;
  coverUrl: string | null;
  best: {
    platform: Platform;
    listPrice: number | null;
    currentPrice: number | null;
    currency: Currency;
    discountPct: number | null;
    discountEndsAt: string | null;
    discountName: string | null;
    releaseDate: string | null;
  } | null;
  /**
   * 이 게임이 붙어 있는 플랫폼 전부(나라 구분 없이 기기 단위, PLATFORM_ORDER 순).
   * 카드가 배지로 그대로 펴서 보여 준다 — "외 2개" 는 무엇이 있는지 말해 주지 않아 다시 눌러 봐야 했다.
   */
  platforms: Platform[];
  /**
   * 카드에 띄울 장르(가나다순, CARD_GENRE_MAX 개까지). 목록에서 나오는 두 번째 질문이
   * "무슨 장르냐" 라서 카드를 열지 않고 답이 나야 한다 — 플랫폼 배지와 같은 이유다.
   * 상세의 genres 와 달리 잘린 목록이다. 전부 보려면 상세로 간다.
   */
  genres: string[];
};

export type HomeData = {
  discounts: GameSummary[];
  recentReleases: GameSummary[];
  latestNews: NewsDto[];
};

/** 공개 API(/api/v1) 용 DTO — 내부 id 제외 */
export type PublicGameDto = Omit<GameDetail, "id" | "news"> & {
  news: Array<Omit<NewsDto, "id" | "game">>;
};
