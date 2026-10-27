// 인디 홍보 기본기 스키마(2026-10-27, docs/기획_인디홍보_상위노출멤버십_2026-10-27.md 3장) — "소개했다" 에서 "플레이했다" 까지의 고리.
// 바깥 클릭 하루 집계, 하루 조회, 인디 글 댓글, 개발자 소식 받기. 글 본체(schema-indie)와 갈라 둔 이유: 저쪽은 "글" 이고
// 여기는 글에 쌓이는 반응이다. 유료 노출(기획서 4장)이 붙으면 그 성과 숫자가 이 표들을 읽는다.
//
// 하루 단위 표의 day 는 한국 날짜다(쓰는 쪽이 `now() at time zone 'Asia/Seoul'` 로 잘라 넣는다). 클릭, 조회마다 행을 남기면
// 표가 끝없이 자라고 "지난 30일" 집계가 행 수만큼 돈다 — 글, 날 한 칸에 수만 올린다(indie_view_months 와 같은 판단).
import { pgTable, uuid, text, integer, date, index, primaryKey } from "drizzle-orm/pg-core";
import { auditColumns } from "./audit";
import { users } from "./schema";
import { postStatusEnum } from "./schema-community";
import { indiePosts } from "./schema-indie";

/**
 * 바깥 링크 클릭(플레이하기, 구매, 공식 사이트 등) 하루 집계. linkKind 는 그 링크의 종류(lib/indie/constants 의 INDIE_LINK_KINDS,
 * 스토어면 "store:pc")다 — 주소를 열쇠로 쓰지 않는 이유: 글쓴이가 주소를 고치면 같은 단추의 숫자가 두 줄로 갈라진다.
 */
export const indieLinkClicks = pgTable("indie_link_clicks", {
  postId: uuid("post_id").references(() => indiePosts.id, { onDelete: "cascade" }).notNull(),
  day: date("day").notNull(),
  linkKind: text("link_kind").notNull(),
  clicks: integer("clicks").default(0).notNull(),
  ...auditColumns(),
}, (t) => [primaryKey({ columns: [t.postId, t.day, t.linkKind] })]);

/** 상세 조회 하루 집계. 달 집계(indie_view_months)는 명예의 전당 몫이라 "지난 30일" 을 셀 수 없어 따로 둔다 */
export const indieViewDays = pgTable("indie_view_days", {
  postId: uuid("post_id").references(() => indiePosts.id, { onDelete: "cascade" }).notNull(),
  day: date("day").notNull(),
  views: integer("views").default(0).notNull(),
  ...auditColumns(),
}, (t) => [primaryKey({ columns: [t.postId, t.day] })]);

/**
 * 인디 글 댓글. 게시판 댓글(post_comments)을 안 쓰는 이유: 그쪽 postId 는 posts 를 가리키는 외래키다 — 인디 글을 posts 에
 * 섞으면 게시판 목록, 검색, 인기 산식이 전부 인디 글을 걸러야 한다(schema-indie 머리 주석의 games 와 같은 이유).
 * 숨김 갈래는 게시판과 같은 값을 쓴다 — 운영진 화면이 두 댓글을 같은 말로 다룬다.
 */
export const indiePostComments = pgTable("indie_post_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").references(() => indiePosts.id, { onDelete: "cascade" }).notNull(),
  authorUserId: uuid("author_user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  body: text("body").notNull(),
  status: postStatusEnum("status").default("published").notNull(),
  ...auditColumns(),
}, (t) => [
  index("indie_post_comments_post_idx").on(t.postId, t.createdAt),
  // 명예의 전당이 "그 달 댓글" 을 센다
  index("indie_post_comments_created_idx").on(t.createdAt),
]);

/**
 * 개발자 소식 받기. 글이 아니라 사람(글쓴이)을 따른다 — 개발일지(라운지 글)에는 어느 인디 게임의 글인지 적는 칸이 없고
 * (services/indie/lounge 머리 주석), 한 개발자가 게임을 여럿 올려도 소식은 한 번만 받으면 된다.
 */
export const developerFollows = pgTable("developer_follows", {
  developerUserId: uuid("developer_user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  followerUserId: uuid("follower_user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  ...auditColumns(),
}, (t) => [primaryKey({ columns: [t.developerUserId, t.followerUserId] }), index("developer_follows_follower_idx").on(t.followerUserId)]);
