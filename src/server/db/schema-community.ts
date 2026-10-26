// 게시판 도메인 스키마(기획서 v2.0 5.2 게임 게시판, 5.3 개발자 라운지, 8장 Post, Comment, PostSave).
// 게임 게시판(리뷰, 공략, 홍보)과 라운지(개발일지, 질문, 피드백)는 한 테이블이다 — 글쓰기 화면이 하나고(S-14)
// 카테고리만 바꾸면 아래 칸이 바뀌는 구조라(기획서 6.4), 테이블을 가르면 같은 목록, 검색, 인기 산식을 다섯 벌 갖는다.
//
// 좋아요 수, 댓글 수는 행에 따로 쌓는다(likeCount, commentCount). 목록이 한 쪽 20줄마다 집계를 돌면
// 줄 수만큼 하위 질의가 붙고, 인기글 정렬은 그 값으로 order by 해야 해서 집계 위에서는 인덱스를 못 탄다.
// 쌓는 값은 좋아요, 댓글을 쓰고 지우는 함수가 같은 질의 안에서 고친다(services/community).
import { pgTable, pgEnum, uuid, text, integer, boolean, index, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { auditColumns } from "./audit";
import { users } from "./schema";

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
    viewCount: integer("view_count").default(0).notNull(),
    likeCount: integer("like_count").default(0).notNull(),
    commentCount: integer("comment_count").default(0).notNull(),
    status: postStatusEnum("status").default("published").notNull(),
    ...auditColumns(),
  },
  (t) => [index("posts_category_created_idx").on(t.category, t.createdAt), index("posts_author_idx").on(t.authorUserId)],
);

export const postComments = pgTable(
  "post_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }).notNull(),
    authorUserId: uuid("author_user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    body: text("body").notNull(),
    /**
     * 운영진 숨김(기획서 v2.0 2.2 "부적절한 글 숨김"). 글과 같은 갈래를 쓴다 — 지우지 않고 숨기는 이유는 되살릴 길을 남기려는 것이다.
     * 숨긴 댓글은 commentCount 에서도 뺀다(services/community/admin) — 인기 점수가 숨긴 댓글로 오르지 않게
     */
    status: postStatusEnum("status").default("published").notNull(),
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
