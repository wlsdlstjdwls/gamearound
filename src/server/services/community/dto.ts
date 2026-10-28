// 게시판 화면 계약. Drizzle 행을 그대로 흘리지 않는다(AGENTS.md 1장) — 작성자 이름처럼 다른 테이블에서 오는 값을
// 한 덩어리로 받고, 스키마가 바뀌어도 화면은 이 모양만 안다.
import type { PostCategory, PromoType } from "@/server/db/schema";

export type PostRowDto = {
  id: string;
  category: PostCategory;
  title: string;
  spoiler: boolean;
  promoType: PromoType | null;
  authorName: string;
  /** 작성자가 승인된 인디 게임을 공개 중인 개발자인지(목업 brow, postv 의 "개발자" 배지). 근거는 services/community/columns */
  authorIsDeveloper: boolean;
  /** 글쓴이가 메이커 멤버십 회원인지(메이커 꼬리표). 근거는 services/community/columns */
  authorIsMaker: boolean;
  createdAt: Date;
  commentCount: number;
  likeCount: number;
  viewCount: number;
  href: string;
  /** 관련 게임(리뷰, 공략은 글쓰기에서 필수). 칸이 생기기 전 글, 라운지 글, 게임 행이 지워진 글은 null */
  game: PostGameDto | null;
};

/** 글에 붙은 게임 — 이름과 게임 상세 주소만 싣는다(id, slug 같은 저장 모양은 화면에 흘리지 않는다) */
export type PostGameDto = { title: string; href: string };

export type PostPage = { items: PostRowDto[]; total: number; page: number; totalPages: number };

export type PostNeighbor = { title: string; href: string } | null;

export type PostDetailDto = PostRowDto & {
  body: string;
  link: string | null;
  isMine: boolean;
  liked: boolean;
  saved: boolean;
  prev: PostNeighbor;
  next: PostNeighbor;
};

/** parentId: 답글이면 원댓글 id(한 단계, schema-community 의 post_comments.parentId). 인디 글 댓글은 답글이 없어 비운다 */
export type CommentDto = { id: string; body: string; authorName: string; createdAt: Date; isMine: boolean; parentId?: string | null };

export type BoardHomeDto = {
  today: number;
  counts: Partial<Record<PostCategory, number>>;
  rising: PostRowDto[];
  waiting: PostRowDto[];
  latestPromos: PostRowDto[];
};

/** 관리자 글 목록 한 줄(/admin/posts). 운영진은 글쓴이를 가려진 이름이 아니라 계정으로 가려야 해서 이메일을 함께 싣는다 */
export type AdminPostRowDto = PostRowDto & { authorEmail: string; status: "published" | "hidden" };

/** 관리자 댓글 목록 한 줄. 어느 글에 달렸는지와 그 글이 숨겨졌는지를 같이 본다 */
export type AdminCommentRowDto = {
  /** 어느 표의 댓글인가 — 게시판 글(comment)과 인디 글(indieComment, 2026-10-27). 숨김 액션이 이 값으로 표를 고른다 */
  kind: "comment" | "indieComment";
  id: string;
  body: string;
  status: "published" | "hidden";
  authorName: string;
  authorEmail: string;
  createdAt: Date;
  postTitle: string;
  postHref: string;
  postStatus: "published" | "hidden";
};
