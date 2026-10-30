// 인디 홍보 글의 화면 계약 — 서비스가 돌려주고 화면이 읽는다(AGENTS §1, Drizzle 행 타입을 흘리지 않는다).
//
// 왜 서비스 파일이 아니라 여기인가: 폼과 그림 칸은 클라이언트 컴포넌트다. 서비스는 `server-only` 라
// 타입만 가져가려 해도 그 경로를 가리키게 된다(lib/shops/game-option 과 같은 이유).
import type { IndieLink, IndiePostStatus, IndieReview, IndieStage } from "@/server/db/schema";
import type { IndiePlatform } from "./constants";

export type IndieImageDto = { id: string; url: string; width: number; height: number };

/** 목록, 홈 줄의 카드 한 장. 커버 없는 글은 여기까지 오지 않는다 */
export type IndieCardDto = {
  slug: string;
  title: string;
  tagline: string;
  developerName: string;
  stage: IndieStage;
  platforms: IndiePlatform[];
  /** 장르 키(INDIE_GENRES). 이름은 화면이 genreLabels 로 바꾼다 */
  genres: string[];
  /** 카드 아래 줄의 "찜 N", "등록 날짜"(기획서 S-18 카드: 장르, 플랫폼, 찜 수, 등록일) */
  likeCount: number;
  viewCount: number;
  registeredAt: string;
  cover: IndieImageDto;
  /** 개발자가 메이커 멤버십 회원인지(메이커 꼬리표) */
  authorIsMaker: boolean;
};

/** 카탈로그 게임과의 연결. 확인 전이면 공개 화면은 이 값을 안 받는다 */
export type IndieGameLinkDto = { id: string; slug: string; title: string; verified: boolean };

export type IndieDetailDto = {
  id: string;
  slug: string;
  authorUserId: string;
  title: string;
  tagline: string;
  body: string;
  developerName: string;
  stage: IndieStage;
  platforms: IndiePlatform[];
  genres: string[];
  releaseNote: string | null;
  links: IndieLink[];
  youtubeId: string | null;
  images: IndieImageDto[];
  game: IndieGameLinkDto | null;
  status: IndiePostStatus;
  statusReason: string | null;
  review: IndieReview;
  reviewReason: string | null;
  likeCount: number;
  /** 누적 조회. 상세에서는 글쓴이의 내 게임 띠(components/indie/owner-bar)가 쓴다 */
  viewCount: number;
  createdAt: string;
  /** 개발자가 메이커 멤버십 회원인지(메이커 꼬리표) */
  authorIsMaker: boolean;
};

/** 내 글 목록 한 줄 */
export type IndieMineRowDto = {
  id: string;
  slug: string;
  title: string;
  stage: IndieStage;
  platforms: IndiePlatform[];
  genres: string[];
  status: IndiePostStatus;
  statusReason: string | null;
  review: IndieReview;
  reviewReason: string | null;
  hasCover: boolean;
  /** 첫 그림(대표). 등록현황, 등록 화면 줄이 작은 커버로 세운다(2026-10-28) */
  coverUrl: string | null;
  tagline: string;
  /** 라운지 홈 "내 게임 최근 소식" 이 반응으로 적는다(기획서 S-16 "찜 수") */
  likeCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
};

/** 게임 상세 마디. 소개 글이 길어 앞부분만 싣는다 */
export type IndieGameSectionDto = {
  slug: string;
  title: string;
  tagline: string;
  developerName: string;
  stage: IndieStage;
  cover: IndieImageDto | null;
};

/** 관리자 화면 한 줄 */
export type IndieAdminRowDto = {
  id: string;
  slug: string;
  title: string;
  developerName: string;
  authorEmail: string;
  status: IndiePostStatus;
  statusReason: string | null;
  review: IndieReview;
  /** 반려 사유. 관리자 "전체" 칸에서 반려된 글이 왜 반려됐는지 다시 보려고 싣는다 */
  reviewReason: string | null;
  reportCount: number;
  reportReasons: string[];
  game: IndieGameLinkDto | null;
  createdAt: string;
};

/** 내 게임 통계 한 줄(2026-10-27). 기간 수는 지난 INDIE_STATS_WINDOW_DAYS 일, 전체 수는 쌓아 둔 값이다 */
export type IndieStatsTotals = { views: number; plays: number; outbound: number; likes: number; comments: number };
export type IndieStatsRowDto = {
  id: string;
  slug: string;
  title: string;
  /** 공개(승인, 공개) 중인가. 아니면 반응이 모일 수 없어 화면이 안내를 단다 */
  live: boolean;
  window: IndieStatsTotals;
  allTime: { views: number; likes: number; comments: number };
  /** 기간 날짜별 조회(오래된 날부터, 빈 날 0). 줄마다 작은 추이 선으로 그린다(2026-10-28) */
  viewsByDay: number[];
  /** 공개 인디 게임 가운데 지난 30일 순위(2026-10-28). 값이 0 이거나 공개 전이면 null */
  ranks: IndieStatsRanks;
};
/** 항목별 순위(1부터). 같은 값은 같은 순위(rank) */
export type IndieStatsRanks = { views: number | null; plays: number | null; likes: number | null; comments: number | null };
/** 기간 날짜별 합(내 게임 모두). 통계 화면 맨 위 추이 그래프의 재료(2026-10-28) */
export type IndieStatsDay = { day: string; views: number; plays: number; likes: number; comments: number };
/** population: 순위의 모집단(지금 공개 중인 인디 게임 수) */
export type IndieStatsDto = { followers: number; window: IndieStatsTotals; rows: IndieStatsRowDto[]; days: IndieStatsDay[]; population: number };

/** 게임 하나의 통계 자세히(메이커 멤버십, 2026-10-27). days 는 오래된 날부터 기간 전부 — 아무 일 없던 날도 0 으로 선다 */
export type IndieStatsDetailDto = {
  id: string;
  slug: string;
  title: string;
  days: Array<{ day: string; views: number; plays: number; likes: number; comments: number }>;
  /** 유입 경로 갈래(lib/indie/traffic)별 조회. 많은 것부터, 0 인 갈래는 없다 */
  sources: Array<{ source: string; views: number }>;
  ranks: IndieStatsRanks;
  population: number;
};
