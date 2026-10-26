// 게시판 상수 한 벌(기획서 v2.0 4.3, 4.4, 5.2, 7장). 서버(services/community)와 화면이 같이 읽는 순수 값이다.
import { ROUTES } from "@/lib/routes";
import type { PostCategory, PromoType } from "@/server/db/schema";

export const POST_CATEGORIES = ["review", "guide", "promo", "devlog", "qna"] as const satisfies readonly PostCategory[];
/** 게임 게시판에 서는 카테고리 */
export const BOARD_CATEGORIES = ["review", "guide", "promo"] as const satisfies readonly PostCategory[];
/** 개발자 라운지에 서는 카테고리 */
export const LOUNGE_CATEGORIES = ["devlog", "qna"] as const satisfies readonly PostCategory[];

export const CATEGORY_LABEL: Record<PostCategory, string> = {
  review: "리뷰",
  guide: "공략",
  promo: "홍보",
  devlog: "개발일지",
  qna: "질문, 피드백",
};

/**
 * 말머리 색(기획서 7장 "카테고리마다 서로 다른 색"). 토큰 이름만 둔다 — 화면이 bg-{tone}-soft text-{tone} 로 칠한다.
 * 리뷰는 라임(브랜드), 공략은 민트, 홍보는 호박, 라운지 둘은 파랑이다.
 */
export const CATEGORY_TONE: Record<PostCategory, "acc" | "ok" | "warn" | "info"> = {
  review: "acc",
  guide: "ok",
  promo: "warn",
  devlog: "info",
  qna: "info",
};

export const PROMO_TYPES = ["my_game", "project"] as const satisfies readonly PromoType[];
export const PROMO_TYPE_LABEL: Record<PromoType, string> = { my_game: "내가 만든 게임", project: "진행 중인 프로젝트" };
/** 기획서 4.4: 내가 만든 게임 파랑, 진행 중인 프로젝트 주황 */
export const PROMO_TYPE_TONE: Record<PromoType, "info" | "warn"> = { my_game: "info", project: "warn" };

/** 목록 화면 주소(카테고리 하나짜리). 등록 뒤 돌아갈 곳이기도 하다(기획서 6.4) */
export const CATEGORY_LIST_PATH: Record<PostCategory, string> = {
  review: ROUTES.boardReviews,
  guide: ROUTES.boardGuides,
  promo: ROUTES.boardPromos,
  devlog: ROUTES.loungeDevlogs,
  qna: ROUTES.loungeQna,
};

export function isLoungeCategory(c: PostCategory): boolean {
  return (LOUNGE_CATEGORIES as readonly string[]).includes(c);
}

/** 글 상세 주소. 라운지 글은 라운지 메뉴 안에 서야 해서 경로를 가른다(lib/nav 의 소속 판정이 경로만 본다) */
export function postPath(id: string, category: PostCategory): string {
  return `${isLoungeCategory(category) ? ROUTES.lounge : ROUTES.board}/p/${encodeURIComponent(id)}`;
}

export function writePath(category?: PostCategory): string {
  const base = category && isLoungeCategory(category) ? `${ROUTES.lounge}/write` : `${ROUTES.board}/write`;
  return category ? `${base}?category=${category}` : base;
}

/** 한 쪽 20줄(기획서 4.3 "게시판 글 20개") */
export const POSTS_PAGE_SIZE = 20;
/** 인기글 기간(기획서 5.2: 최근 7일, 30일, 전체 기간). 0 = 전체 */
export const POPULAR_PERIODS = [7, 30, 0] as const;
export type PopularPeriod = (typeof POPULAR_PERIODS)[number];
export const POPULAR_PERIOD_LABEL: Record<PopularPeriod, string> = { 7: "최근 7일", 30: "최근 30일", 0: "전체 기간" };
/** 검색 범위(기획서 7장: 전체는 세 필드 OR, 모두 부분 일치) */
export const SEARCH_SCOPES = ["all", "title", "body", "author"] as const;
export type SearchScope = (typeof SEARCH_SCOPES)[number];
export const SEARCH_SCOPE_LABEL: Record<SearchScope, string> = { all: "전체", title: "제목", body: "내용", author: "작성자" };

/** 인기 점수 = 좋아요 + 댓글 x 2(기획서 7장). 댓글이 무거운 이유: 누르는 것보다 쓰는 것이 품이 든다 */
export const POPULAR_COMMENT_WEIGHT = 2;
/** 급상승: 최근 3일 안의 글을 (좋아요 + 댓글 x 2) / (경과일 + 1) 로 줄 세운다(기획서 5.2) */
export const RISING_WINDOW_DAYS = 3;
export const RISING_LIMIT = 4;
/** 댓글을 기다리는 글: 최근 14일, 댓글 0개, 최신순 6개 */
export const WAITING_WINDOW_DAYS = 14;
export const WAITING_LIMIT = 6;
/** 새로 올라온 홍보(게시판 홈 오른쪽 패널) */
export const LATEST_PROMO_LIMIT = 5;
/** 답변 기다리는 질문 알약: 댓글 1개 이하인 질문(기획서 4.4) */
export const AWAITING_ANSWER_MAX_COMMENTS = 1;

/** 입력 상한. 제목은 목록 한 줄에 서는 길이, 본문은 긴 공략 한 편이 들어가는 길이 */
export const POST_TITLE_MAX = 100;
export const POST_BODY_MAX = 20_000;
export const COMMENT_BODY_MAX = 2_000;
