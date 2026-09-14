// 공개 DTO — route, 컴포넌트가 받는 모양. 모두 JSON 직렬화 가능(Date → ISO 문자열).
// DB 행 타입을 그대로 노출하지 않는 이유: 스키마가 바뀌어도 화면 계약은 유지돼야 한다.
import type { CompanyRole, Platform, SyncStatus, UpgradeKind } from "@/server/db/schema";

export type PlatformDto = {
  platform: Platform;
  storeUrl: string | null;
  releaseDate: string | null;
  currentVersion: string | null;
  listPrice: number | null;
  currentPrice: number | null;
  discountPct: number | null;
  /** 할인 기간, 행사명 (소스가 주는 만큼만. steam=종료+행사명, xbox=시작, 종료) */
  discountStartsAt: string | null;
  discountEndsAt: string | null;
  discountName: string | null;
  metacriticScore: number | null;
  opencriticScore: number | null;
  lastSyncedAt: string | null;
  syncStatus: SyncStatus | null;
  /** 이 스토어가 "추가 콘텐츠 있음"이라고 알려준 값. DLC 목록을 못 가져오는 플랫폼에서도 유무는 말할 수 있다 */
  hasAddOns: boolean | null;
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
export type SubscriptionDto = {
  key: string;
  label: string;
  platform: Platform;
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
  updatedAt: string;
  genres: string[];
  platforms: PlatformDto[];
  playtime: PlaytimeDto | null;
  news: NewsDto[];
  sourceRefs: SourceRefDto[];
  /** 회사 엔티티로 승격된 것만. 매칭 전이면 빈 배열이고 화면은 developer/publisher 문자열로 폴백한다 */
  companies: GameCompanyDto[];
  dlcs: DlcDto[];
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
    discountPct: number | null;
    discountEndsAt: string | null;
    discountName: string | null;
    releaseDate: string | null;
  } | null;
  platformCount: number;
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
