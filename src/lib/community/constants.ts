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
  qna: "질문/피드백",
};

/**
 * 말머리 색. 기획서 7장은 "카테고리마다 서로 다른 색" 이었지만 2026-10-28 사용자가 뒤집었다
 * ("겹치는 것도 많고 너무 알록달록 하니까 오히려 구려"). 말머리는 브랜드색 한 갈래로 두고, 갈래는 글자가 말한다.
 * 표를 남겨 둔 이유: 다시 카테고리별 색으로 돌아갈 때 이 자리 하나만 고치면 된다.
 */
export const CATEGORY_TONE: Record<PostCategory, "acc"> = {
  review: "acc",
  guide: "acc",
  promo: "acc",
  devlog: "acc",
  qna: "acc",
};

export const PROMO_TYPES = ["my_game", "project"] as const satisfies readonly PromoType[];
export const PROMO_TYPE_LABEL: Record<PromoType, string> = { my_game: "내가 만든 게임", project: "진행 중인 프로젝트" };
/** 홍보 유형은 말머리 옆 곁딱지라 색 없는 회색이다(2026-10-28, 위 CATEGORY_TONE 과 같은 이유). 기획서 4.4 의 파랑, 주황은 걷었다 */
export const PROMO_TYPE_TONE: Record<PromoType, "neutral"> = { my_game: "neutral", project: "neutral" };

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

/**
 * 글 상세 주소. 메뉴 소속(lib/nav 의 resolveNav)은 경로만 보고 정해진다 — 그래서 게시판 글은 제 게시판 목록 아래에 세운다
 * (/board/reviews/p/<id>). 예전 주소 /board/p/<id> 는 카테고리가 없어 하위 메뉴 띠가 아무 칸도 못 켰다(기획서 4.3
 * "상세 화면에서도 소속 메뉴를 유지"). 카테고리를 주소 조건(?c=)으로 싣는 길도 있었지만, 그러면 같은 글이 주소 둘을 갖고
 * 조건 없는 링크에서 칸이 다시 꺼진다. 글의 카테고리는 바뀌지 않으니 경로에 넣어도 링크가 낡지 않는다.
 * 예전 주소는 지우지 않고 새 주소로 보낸다(app/(public)/board/p/[id]) — 알림함, 바깥에 퍼진 링크가 그 주소를 들고 있다.
 * 라운지 글은 아직 /lounge/p/<id> 그대로다(라운지 화면 몫).
 */
export function postPath(id: string, category: PostCategory): string {
  const tail = `/p/${encodeURIComponent(id)}`;
  return isLoungeCategory(category) ? `${ROUTES.lounge}${tail}` : `${CATEGORY_LIST_PATH[category]}${tail}`;
}

/** 댓글 자리 표식. 댓글 목록(/lounge/comments)이 이 앵커로 글 상세의 그 댓글까지 내려 보낸다 */
export function commentAnchor(commentId: string): string {
  return `comment-${commentId}`;
}

/** 글 상세의 그 댓글 자리 주소 */
export function commentPath(postId: string, category: PostCategory, commentId: string): string {
  return `${postPath(postId, category)}#${commentAnchor(commentId)}`;
}

/** 글 id 꼴(uuid). 주소로 들어온 값이 질의까지 가기 전에 거른다 — 엉뚱한 값은 DB 가 uuid 변환 오류를 낸다 */
const POST_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isPostId(id: string): boolean {
  return POST_ID_RE.test(id);
}

/** 관련 게임 칸이 서는 카테고리(목업 S-14 는 리뷰, 공략만 두지만 홍보도 게임을 알리는 글이라 선택으로 받는다) */
export const GAME_LINK_CATEGORIES = ["review", "guide", "promo"] as const satisfies readonly PostCategory[];
/** 관련 게임이 꼭 있어야 하는 카테고리(목업 "관련 게임 필수") — 게임 없는 리뷰, 공략은 무엇에 대한 글인지 목록에서 안 읽힌다 */
export const GAME_REQUIRED_CATEGORIES = ["review", "guide"] as const satisfies readonly PostCategory[];

export function takesGame(c: PostCategory): boolean {
  return (GAME_LINK_CATEGORIES as readonly string[]).includes(c);
}

export function requiresGame(c: PostCategory): boolean {
  return (GAME_REQUIRED_CATEGORIES as readonly string[]).includes(c);
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
/**
 * 본문 HTML 자체의 상한. 위 상한은 태그를 걷은 글자 수다 — HTML 은 태그, 그림 주소가 붙어 글자보다 몇 배 길어진다.
 * 그림 20장(주소 하나 120자 안팎)과 꾸밈이 붙어도 들어가고, 붙여 넣기로 거대한 HTML 을 밀어 넣는 것은 막는 선이다.
 */
export const POST_HTML_MAX = 120_000;
export const COMMENT_BODY_MAX = 2_000;
