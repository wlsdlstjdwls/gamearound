// 게시판 도메인 스키마(기획서 v2.0 5.2 게임 게시판, 5.3 개발자 라운지, 8장 Post, Comment, PostSave).
// 게임 게시판(리뷰, 공략, 홍보)과 라운지(개발일지, 질문, 피드백)는 한 테이블이다 — 글쓰기 화면이 하나고(S-14)
// 카테고리만 바꾸면 아래 칸이 바뀌는 구조라(기획서 6.4), 테이블을 가르면 같은 목록, 검색, 인기 산식을 다섯 벌 갖는다.
//
// 좋아요 수, 댓글 수는 행에 따로 쌓는다(likeCount, commentCount). 목록이 한 쪽 20줄마다 집계를 돌면
// 줄 수만큼 하위 질의가 붙고, 인기글 정렬은 그 값으로 order by 해야 해서 집계 위에서는 인덱스를 못 탄다.
// 쌓는 값은 좋아요, 댓글을 쓰고 지우는 함수가 같은 질의 안에서 고친다(services/community).
import { pgTable, pgEnum, uuid, text, integer, boolean, index, primaryKey, timestamp, type AnyPgColumn } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { auditColumns } from "./audit";
import { games, users } from "./schema";
import { indiePosts } from "./schema-indie";

/** 카테고리. 앞 셋은 게임 게시판, 뒤 둘은 개발자 라운지 */
export const postCategoryEnum = pgEnum("post_category", ["review", "guide", "promo", "devlog", "qna"]);
/** 홍보 유형(홍보에서만 필수). 기획서 v2.0 이 "라운지에 올린 게임" 유형을 뺐다 */
export const promoTypeEnum = pgEnum("promo_type", ["my_game", "project"]);
/** hidden 은 운영진 숨김. 지우기는 상태가 아니라 행 삭제다 */
export const postStatusEnum = pgEnum("post_status", ["published", "hidden"]);

export type PostCategory = (typeof postCategoryEnum.enumValues)[number];
export type PromoType = (typeof promoTypeEnum.enumValues)[number];

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    category: postCategoryEnum("category").notNull(),
    authorUserId: uuid("author_user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    /** 리뷰에서만 뜻이 있다(필수 선택). 다른 카테고리는 false 로 둔다 */
    spoiler: boolean("spoiler").default(false).notNull(),
    promoType: promoTypeEnum("promo_type"),
    /** 홍보에서만 받는 선택 링크 */
    link: text("link"),
    /**
     * 관련 게임(목업 S-14 "관련 게임", 2026-10-26 사용자 승인). 리뷰, 공략은 글쓰기에서 필수, 홍보는 선택이다 —
     * 그 규칙은 입력 검증(lib/community/schemas)이 맡고 칸은 비워 둘 수 있게 둔다. 이 칸이 생기기 전에 올라온 글과
     * 라운지 글은 게임이 없고, 게임 행이 중복 정리로 지워져도 글은 남아야 해서 set null 이다.
     */
    gameId: uuid("game_id").references(() => games.id, { onDelete: "set null" }),
    /**
     * 라운지 글(개발일지, 질문)이 어느 인디 게임의 글인가(2026-10-29). 비우면 글쓴이의 모든 게임에 걸친 글이다 —
     * 인디 상세 "관련 소식" 은 이 게임에 묶인 글과 아무 게임에도 안 묶인 글쓴이 글을 세우고, 다른 게임에 묶인 글은 뺀다.
     * 게임 글이 지워져도 개발일지는 남아야 해서 set null 이다. 게임 게시판 글의 게임(gameId, 카탈로그)과는 다른 칸이다.
     */
    indiePostId: uuid("indie_post_id").references((): AnyPgColumn => indiePosts.id, { onDelete: "set null" }),
    viewCount: integer("view_count").default(0).notNull(),
    likeCount: integer("like_count").default(0).notNull(),
    commentCount: integer("comment_count").default(0).notNull(),
    status: postStatusEnum("status").default("published").notNull(),
    ...auditColumns(),
  },
  (t) => [index("posts_category_created_idx").on(t.category, t.createdAt), index("posts_author_idx").on(t.authorUserId), index("posts_game_idx").on(t.gameId), index("posts_indie_post_idx").on(t.indiePostId)],
);

export const postComments = pgTable(
  "post_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }).notNull(),
    authorUserId: uuid("author_user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    /**
     * 답글이면 그 댓글(10-28 사용자 "대댓글이 안 된다"). 한 단계만 둔다 — 답글의 답글은 같은 원댓글 밑에 붙인다
     * (services/community/reactions 의 addComment 가 원댓글로 끌어올린다). 깊이가 끝없으면 모바일 폭에서 들여쓰기가 글을 짓누른다.
     * 원댓글이 지워지면 답글도 같이 지운다(cascade) — 말을 건 상대가 없는 답글만 남으면 뜻이 안 선다.
     */
    parentId: uuid("parent_id").references((): AnyPgColumn => postComments.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    /**
     * 운영진 숨김(기획서 v2.0 2.2 "부적절한 글 숨김"). 글과 같은 갈래를 쓴다 — 지우지 않고 숨기는 이유는 되살릴 길을 남기려는 것이다.
     * 숨긴 댓글은 commentCount 에서도 뺀다(services/community/admin) — 인기 점수가 숨긴 댓글로 오르지 않게
     */
    status: postStatusEnum("status").default("published").notNull(),
    /**
     * 글쓴이가 이 댓글을 본 때(2026-10-28 사용자 "확인했으면 새로움 표시는 안 보여야"). 비어 있으면 "새 댓글" 이다.
     * 알림함(notifications.readAt)으로 대신하지 않는 이유: 알림은 글 단위 한 줄이라 어느 댓글인지 모르고, 알림이 생기기 전 댓글엔 행이 없다.
     * 보는 사람이 글쓴이 한 명뿐이라 읽음 표를 따로 두지 않고 칸 하나로 둔다. 글쓴이 제 댓글은 질의가 빼고 센다(services/community/inbox)
     */
    ownerSeenAt: timestamp("owner_seen_at", { withTimezone: true }),
    ...auditColumns(),
  },
  (t) => [index("post_comments_post_idx").on(t.postId, t.createdAt)],
);

export const postLikes = pgTable(
  "post_likes",
  {
    postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    ...auditColumns(),
  },
  (t) => [primaryKey({ columns: [t.postId, t.userId] })],
);

/** 저장한 글(내 활동, 기획서 S-24) */
export const postSaves = pgTable(
  "post_saves",
  {
    postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    ...auditColumns(),
  },
  (t) => [primaryKey({ columns: [t.postId, t.userId] }), index("post_saves_user_idx").on(t.userId)],
);

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, { fields: [posts.authorUserId], references: [users.id] }),
  comments: many(postComments),
}));

export const postCommentsRelations = relations(postComments, ({ one }) => ({
  post: one(posts, { fields: [postComments.postId], references: [posts.id] }),
  author: one(users, { fields: [postComments.authorUserId], references: [users.id] }),
}));
