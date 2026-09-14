// 공개 DTO — route·컴포넌트가 받는 모양. 모두 JSON 직렬화 가능(Date → ISO 문자열).
// DB 행 타입을 그대로 노출하지 않는 이유: 스키마가 바뀌어도 화면 계약은 유지돼야 한다.
import type { Platform, SyncStatus } from "@/server/db/schema";

export type PlatformDto = {
  platform: Platform;
  storeUrl: string | null;
  releaseDate: string | null;
  currentVersion: string | null;
  listPrice: number | null;
  currentPrice: number | null;
  discountPct: number | null;
  /** 할인 기간·행사명 (소스가 주는 만큼만. steam=종료+행사명, xbox=시작·종료) */
  discountStartsAt: string | null;
  discountEndsAt: string | null;
  discountName: string | null;
  metacriticScore: number | null;
  opencriticScore: number | null;
  lastSyncedAt: string | null;
  syncStatus: SyncStatus | null;
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
