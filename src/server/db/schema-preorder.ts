// 예약 특전 스키마 — 한국닌텐도 뉴스의 "패키지 버전 예약 및 조기 구입 특전 안내" 글에서 뽑은 사실.
//
// 글(posts)과 특전(bonuses)을 가른 이유: 수집 단위는 글이고, 화면 단위는 특전이다. 같은 글을 다시 받았을 때
// "이미 본 글인가" 를 글 주소(sourceSlug) 하나로 판단하고, 판매처가 바뀐 글은 특전 줄만 갈아 끼운다.
//
// 무엇을 담지 않나(2026-10-07 약관 실측, nintendo.com/kr 이용약관): 문장, 사진, 디자인의 복제, 게시를 금지한다.
// 그래서 홍보 문장은 저장하지 않고 **사실(특전 이름, 판매처, ※ 조건, 기간)만** 담는다. 이미지는 주소만 담아
// 원본 서버에서 바로 띄운다(핫링크) — 우리 저장소나 이미지 최적화 캐시에 사본을 만들지 않는다.
import { pgTable, pgEnum, uuid, text, integer, date, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { auditColumns } from "./audit";
import { games } from "./schema";

/**
 * published: 특전을 하나 이상 뽑았고 게임에 이었다 — 게임 상세에 바로 선다.
 * review: 뽑았지만 게임을 못 이었거나, 특전을 하나도 못 뽑았다 — 관리자 화면에서만 보인다.
 * hidden: 관리자가 내렸다. 다시 받아도 되살리지 않는다(같은 글 주소면 건너뛴다).
 */
export const preorderPostStatusEnum = pgEnum("preorder_post_status", ["published", "review", "hidden"]);
/** 패키지판 특전과 다운로드판 특전. 받는 곳(매장, e숍)이 달라 화면에서 가른다 */
export const preorderEditionEnum = pgEnum("preorder_edition", ["package", "download"]);

export type PreorderPostStatus = (typeof preorderPostStatusEnum.enumValues)[number];
export type PreorderEdition = (typeof preorderEditionEnum.enumValues)[number];

export const preorderBonusPosts = pgTable("preorder_bonus_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** 출처 이름. 지금은 nintendo_kr 하나지만 다른 퍼블리셔 공지가 붙을 자리를 남긴다 */
  source: text("source").notNull(),
  /** 출처의 글 식별자(닌텐도는 Contentful 엔트리 ID). 같은 글을 두 번 담지 않는 열쇠다 */
  sourceSlug: text("source_slug").notNull(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  /** 글이 가리키는 한국 eShop 본편 번호들(7001 접두). 게임을 못 이었을 때 관리자가 보는 단서다 */
  nsuids: text("nsuids").array().default([]).notNull(),
  /** 이은 게임. 글 하나가 여러 판(스위치, 스위치2)을 가리켜도 화면은 본편 하나에 붙인다 */
  gameId: uuid("game_id").references(() => games.id, { onDelete: "set null" }),
  status: preorderPostStatusEnum("status").default("review").notNull(),
  /** review 인 이유 — 관리자 화면에 그대로 뜬다 */
  statusReason: text("status_reason"),
  /** 파서 판. 틀이 바뀌어 다시 뽑아야 할 때 옛 판으로 뽑은 글만 골라낸다 */
  parseVersion: integer("parse_version").notNull(),
  ...auditColumns(),
}, (t) => [
  uniqueIndex("preorder_posts_source_slug_uq").on(t.source, t.sourceSlug),
  // 게임 상세가 "이 게임의 공개 글" 을 찾는다
  index("preorder_posts_game_status_idx").on(t.gameId, t.status),
]);

export const preorderBonuses = pgTable("preorder_bonuses", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").references(() => preorderBonusPosts.id, { onDelete: "cascade" }).notNull(),
  edition: preorderEditionEnum("edition").default("package").notNull(),
  /** 특전 이름("에코백"). 글의 소제목 그대로 */
  name: text("name").notNull(),
  /**
   * 받는 곳 원문("오프라인 대원샵(...), 전국 오프라인 게임전문점"). 매장 단위로 쪼개지 않는다 —
   * "G마켓, 옥션, 롯데ON 내 디지털터치 판매처" 처럼 묶음 표현이 많아 쉼표로 자르면 틀린다(2026-10-07 실측).
   */
  retailers: text("retailers"),
  /** ※ 로 시작하는 조건들("데스크패드와 키캡키링 중 1개 선택"). 줄마다 하나 */
  notes: text("notes").array().default([]).notNull(),
  /** 원본 이미지 주소(핫링크). 우리 쪽에 사본을 두지 않는다 — 파일 머리 주석 */
  imageUrl: text("image_url"),
  /** 마감일. 다운로드판만 "대상 기간: ...까지" 로 적힌다. 패키지판은 "재고 소진 시" 라 비운다 */
  endsOn: date("ends_on"),
  sortOrder: integer("sort_order").notNull(),
  ...auditColumns(),
}, (t) => [index("preorder_bonuses_post_idx").on(t.postId, t.sortOrder)]);
