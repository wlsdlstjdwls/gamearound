// 인디 홍보 기본기 스키마(2026-10-27, docs/기획_인디홍보_상위노출멤버십_2026-10-27.md 3장) — "소개했다" 에서 "플레이했다" 까지의 고리.
// 바깥 클릭 하루 집계, 하루 조회, 인디 글 댓글, 개발자 소식 받기. 글 본체(schema-indie)와 갈라 둔 이유: 저쪽은 "글" 이고
// 여기는 글에 쌓이는 반응이다. 유료 노출(기획서 4장)이 붙으면 그 성과 숫자가 이 표들을 읽는다.
//
// 하루 단위 표의 day 는 한국 날짜다(쓰는 쪽이 `now() at time zone 'Asia/Seoul'` 로 잘라 넣는다). 클릭, 조회마다 행을 남기면
// 표가 끝없이 자라고 "지난 30일" 집계가 행 수만큼 돈다 — 글, 날 한 칸에 수만 올린다(indie_view_months 와 같은 판단).
import { pgTable, uuid, text, integer, date, index, primaryKey, timestamp } from "drizzle-orm/pg-core";
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
 * 상세 조회의 유입 경로 하루 집계(2026-10-27, 기획서 4.3 메이커 멤버십 "내 게임 통계 자세히(유입 경로, 일별 그래프)").
 * source 는 lib/indie/traffic 의 갈래 이름이다(홈, 인디 목록, 검색엔진, 유튜브 등). 들어온 주소를 그대로 적지 않는 이유:
 * 바깥 주소에는 남의 검색어, 개인 링크가 묻어 오고, 갈래가 끝없이 늘어 화면에 세울 수 없다.
 * 모두에게서 세고 보여 주기만 멤버십으로 가른다 — 가입한 날부터 세면 첫 달 그래프가 빈다.
 */
export const indieViewSources = pgTable("indie_view_sources", {
  postId: uuid("post_id").references(() => indiePosts.id, { onDelete: "cascade" }).notNull(),
  day: date("day").notNull(),
  source: text("source").notNull(),
  views: integer("views").default(0).notNull(),
  ...auditColumns(),
}, (t) => [primaryKey({ columns: [t.postId, t.day, t.source] })]);

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

/**
 * 플레이테스트 모집(2026-10-27, 기획서 2장 5번 "개발 중인 게임이 가장 원하는 것은 테스터다", 3장 5번). 인디 글 하나에 모집 여럿이 쌓이지만
 * 열린 모집은 한 번에 하나다(services/indie/playtests 가 지킨다) — 같은 게임의 모집 둘이 나란히 서면 어느 쪽에 신청할지 모른다.
 * 끝은 둘 중 이른 것: 마감 시각(closesAt)이 지나거나 개발자가 일찍 닫았거나(closedAt). 지우지 않는다 — 신청자 목록은 모집이 끝난 뒤에 더 쓰인다.
 */
export const indiePlaytests = pgTable("indie_playtests", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").references(() => indiePosts.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  /** 무엇을 해 보는지, 어떻게 받는지, 보상 등. 마크다운 없이 줄바꿈만(인디 글 본문과 같은 규칙) */
  body: text("body").notNull(),
  /** 모집 인원. 다 차면 신청을 받지 않는다 */
  slots: integer("slots").notNull(),
  closesAt: timestamp("closes_at", { withTimezone: true }).notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  ...auditColumns(),
}, (t) => [index("indie_playtests_post_idx").on(t.postId, t.createdAt), index("indie_playtests_closes_idx").on(t.closesAt)]);

/**
 * 플레이테스트 신청. message 는 신청자가 개발자에게 남기는 말(연락처, 기기)이고 개발자만 본다. 이메일은 넘기지 않는다 —
 * 연락 길은 신청자가 고른다(디스코드, 메일 등). 신청을 거두면 줄을 지운다.
 */
export const indiePlaytestApplications = pgTable("indie_playtest_applications", {
  playtestId: uuid("playtest_id").references(() => indiePlaytests.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  message: text("message").notNull(),
  ...auditColumns(),
}, (t) => [primaryKey({ columns: [t.playtestId, t.userId] }), index("indie_playtest_applications_user_idx").on(t.userId)]);
