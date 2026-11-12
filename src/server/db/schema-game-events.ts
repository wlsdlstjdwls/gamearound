// 게임 이벤트, 소식 링크 — 게임 상세 "이벤트, 소식" 카드의 원천(sync/game-events 가 쓰고 services/game-events 가 읽는다).
//
// 무엇을 담나(2026-11-12 사용자 지시): 출처 페이지의 공유용 태그(제목, 설명, 그림 주소)와 원문 링크뿐이다.
// AI 요약도 본문 복제도 하지 않는다. 그림은 주소만 두고 원본 서버에서 바로 띄운다(핫링크, schema-preorder 와 같은 이유).
//
// 출처: nintendo_kr(한국닌텐도 뉴스의 이벤트, 체험판, 무료 업데이트 글과 공식 소개 페이지), steam(앱별 파트너 이벤트).
// PS, Xbox 는 행사 이름을 주는 곳이 없어 빠졌다(2026-11-12 실측: Xbox 상품 응답은 할인 기간만, PS 행사 페이지는 막힘).
import { pgTable, uuid, text, timestamp, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
import { auditColumns } from "./audit";
import { games } from "./schema";

export const gameEvents = pgTable("game_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id").references(() => games.id, { onDelete: "cascade" }).notNull(),
  /** nintendo_kr | steam */
  source: text("source").notNull(),
  /** 출처 안의 식별자(닌텐도 글 slug, 스팀 이벤트 gid). 같은 글을 두 번 담지 않는 열쇠다 */
  sourceKey: text("source_key").notNull(),
  /** event | demo | update | page(공식 소개 페이지) — 이름표는 lib/game-events/messages */
  kind: text("kind").notNull(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  /** 기간을 주는 출처(스팀)만 채운다. 닌텐도 글은 기간이 본문 문장에만 있어 비운다 */
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  /** 관리자가 내린 카드. 다시 받아도 되살리지 않는다 */
  hidden: boolean("hidden").default(false).notNull(),
  ...auditColumns(),
}, (t) => [
  // 묶음이 아닌 글도 스위치판, 스위치2 판 두 게임에 붙을 수 있어 게임까지 넣어 유일하게 한다
  uniqueIndex("game_events_source_key_game_uq").on(t.source, t.sourceKey, t.gameId),
  index("game_events_game_idx").on(t.gameId, t.publishedAt),
]);

/**
 * 게임마다 출처에 마지막으로 물어본 시각. 스팀 이벤트는 게임 하나에 요청 하나라 회차마다 가장 오래 안 본 게임부터 돈다.
 * 이벤트가 없는 게임도 "봤다" 를 남겨야 같은 게임만 계속 묻지 않는다 — 그래서 game_events 와 따로 둔다.
 */
export const gameEventChecks = pgTable("game_event_checks", {
  gameId: uuid("game_id").references(() => games.id, { onDelete: "cascade" }).notNull(),
  source: text("source").notNull(),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull(),
  ...auditColumns(),
}, (t) => [uniqueIndex("game_event_checks_uq").on(t.gameId, t.source)]);
