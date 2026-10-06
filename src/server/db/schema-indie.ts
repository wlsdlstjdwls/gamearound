// 인디 홍보 도메인 스키마 — 개발자가 자기 게임을 직접 소개하는 글.
//
// 왜 games 행을 만들지 않나: 홍보 글의 절반은 아직 어느 스토어에도 없는 게임(개발 중, 데모, 펀딩)이다.
// games 는 "스토어와 이어진 공개 본편" 이 계약이라(mainGamesOnly) 여기에 사람이 쓴 행을 섞으면
// 목록, 검색, 가격 비교가 전부 그 행을 걸러야 한다. 홍보 글은 따로 살고, 이미 카탈로그에 있으면 gameId 로 잇기만 한다.
//
// 왜 승인 없이 바로 서나(2026-10-06 사용자 결정): 올린 사람이 기다리지 않게. 대신 막는 장치가 셋이다 —
// 한 사람이 살려 둘 수 있는 글 수 상한, 신고가 쌓이면 스스로 내려가는 문턱, 관리자 숨김.
// 게임 상세 화면에 붙는 것만은 관리자가 연결을 확인한 뒤다(gameLinkVerifiedAt) — 아무나 남의 대작에
// "개발자 소개" 를 걸면 그 화면이 개발사를 사칭하게 된다.
import { pgTable, pgEnum, uuid, text, integer, jsonb, timestamp, index, uniqueIndex, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { auditColumns } from "./audit";
import { games, users } from "./schema";

/** 개발 단계. 화면 배지와 목록 거르기가 이 값을 본다 */
export const indieStageEnum = pgEnum("indie_stage", ["in_development", "demo", "early_access", "released"]);
/**
 * published 가 기본이다. hidden 은 관리자 숨김과 신고 누적 자동 숨김 둘 다다 — 사유(statusReason)로 가른다.
 * 지우기는 상태가 아니라 행 삭제다(올린 사람이 지우면 남길 이유가 없다).
 */
export const indiePostStatusEnum = pgEnum("indie_post_status", ["published", "hidden"]);

export type IndieStage = (typeof indieStageEnum.enumValues)[number];
export type IndiePostStatus = (typeof indiePostStatusEnum.enumValues)[number];

/** 바깥 링크 한 줄. 종류는 lib/indie/constants 의 INDIE_LINK_KINDS */
export type IndieLink = { kind: string; url: string };

export const indiePosts = pgTable("indie_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** 공개 주소 `/indie/[slug]`. 제목 + 무작위 꼬리라 예약어(new, mine)와 겹칠 일이 없다 */
  slug: text("slug").notNull().unique(),
  authorUserId: uuid("author_user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  /** 카탈로그에 이미 있는 게임이면 잇는다. 게임 행이 지워져도 글은 남는다 */
  gameId: uuid("game_id").references(() => games.id, { onDelete: "set null" }),
  /** 관리자가 "이 사람이 그 게임 개발자다" 를 확인한 시각. 이 값이 있어야 게임 상세에 붙는다 */
  gameLinkVerifiedAt: timestamp("game_link_verified_at", { withTimezone: true }),
  title: text("title").notNull(),
  /** 카드에 서는 한 줄 소개 */
  tagline: text("tagline").notNull(),
  body: text("body").notNull(),
  stage: indieStageEnum("stage").default("in_development").notNull(),
  /** 플랫폼 키 목록(lib/indie/constants 의 INDIE_PLATFORMS). platformEnum 은 스토어 축이라 모바일, 웹이 없다 */
  platforms: text("platforms").array().default([]).notNull(),
  /** "2027년 상반기" 처럼 사람이 적는 말. 날짜로 받으면 미정인 게임이 거짓 날짜를 적는다 */
  releaseNote: text("release_note"),
  /** 개발자, 팀 이름. 가입 닉네임과 다를 수 있다 */
  developerName: text("developer_name").notNull(),
  links: jsonb("links").$type<IndieLink[]>().default([]).notNull(),
  /** 유튜브 영상 ID 만 담는다. 주소를 담으면 화면이 매번 다시 파싱하고, 임의 주소를 iframe 에 넣는 길이 생긴다 */
  youtubeId: text("youtube_id"),
  status: indiePostStatusEnum("status").default("published").notNull(),
  statusReason: text("status_reason"),
  /** 마지막 검토 뒤 쌓인 신고 수. 문턱을 넘으면 스스로 숨는다. 관리자가 되살리면 0 으로 돌린다 */
  reportCount: integer("report_count").default(0).notNull(),
  ...auditColumns(),
}, (t) => [
  // 공개 목록은 published 를 최신순으로 본다
  index("indie_posts_status_created_idx").on(t.status, t.createdAt),
  index("indie_posts_author_idx").on(t.authorUserId),
  index("indie_posts_game_idx").on(t.gameId),
]);

/** 글에 붙는 그림. sort 0 이 커버다 — 커버 칸을 따로 두면 "커버를 지웠더니 스크린샷이 커버가 안 된다" 가 생긴다 */
export const indiePostImages = pgTable("indie_post_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").references(() => indiePosts.id, { onDelete: "cascade" }).notNull(),
  url: text("url").notNull(),
  /** Blob 경로. 지울 때와 "이 글 아래 경로인가" 를 볼 때 쓴다 */
  pathname: text("pathname").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  sort: integer("sort").default(0).notNull(),
  ...auditColumns(),
}, (t) => [
  index("indie_post_images_post_idx").on(t.postId, t.sort),
  // 같은 파일 등록이 두 번 오면(되누르기, 재시도) 한 줄로 둔다
  uniqueIndex("indie_post_images_pathname_uq").on(t.pathname),
]);

/** 신고. 한 사람이 한 글에 한 번만 — 혼자 문턱을 넘기는 길을 막는다 */
export const indiePostReports = pgTable("indie_post_reports", {
  postId: uuid("post_id").references(() => indiePosts.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  reason: text("reason").notNull(),
  ...auditColumns(),
}, (t) => [primaryKey({ columns: [t.postId, t.userId] })]);

export const indiePostsRelations = relations(indiePosts, ({ one, many }) => ({
  author: one(users, { fields: [indiePosts.authorUserId], references: [users.id] }),
  game: one(games, { fields: [indiePosts.gameId], references: [games.id] }),
  images: many(indiePostImages),
  reports: many(indiePostReports),
}));

export const indiePostImagesRelations = relations(indiePostImages, ({ one }) => ({
  post: one(indiePosts, { fields: [indiePostImages.postId], references: [indiePosts.id] }),
}));

export const indiePostReportsRelations = relations(indiePostReports, ({ one }) => ({
  post: one(indiePosts, { fields: [indiePostReports.postId], references: [indiePosts.id] }),
}));
