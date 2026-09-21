// 관리자 할 일 판(칸반). 자동으로 쌓이는 검수 큐와 달리 **사람이 직접 적는** 일이 사는 자리다.
//
// 왜 외부 도구(Notion 등)가 아니라 여기인가: 이 프로젝트의 할 일 대부분이 카탈로그의 특정 행에 매여 있다
// ("이 게임 제목 오염 고치기", "이 매장 심사 보류 사유 확인"). 바깥에 적으면 그 줄을 찾아 들어오는 일을
// 사람이 매번 손으로 한다. 그래서 할 일 한 줄이 게임, 매장, 소스를 직접 가리킬 수 있게 뒀다 —
// 화면은 그 값으로 바로 가는 링크를 만든다.
//
// 파일을 가른 이유는 shops, products 와 같다. schema.ts 에서 재수출하므로 호출부 import 경로는 그대로다.
import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { auditColumns } from "./audit";
import { games } from "./schema";
import { sourceEnum } from "./schema-enums";
import { shops } from "./schema-shops";

/**
 * 판의 세로 칸. 넷으로 묶은 이유는 한 화면에 나란히 들어가야 하기 때문이다 —
 * 칸이 늘면 좁은 화면에서 가로 스크롤이 생기고, 그 순간 "한눈에 본다" 는 이 화면의 목적이 깨진다.
 *
 * `backlog` 는 "언젠가" 다. `todo` 와 가르는 기준은 **이번에 손댈 결심을 했는가** 하나다 —
 * 둘을 합치면 할 일 칸이 수십 줄로 불어나 아무도 안 본다.
 */
export const adminTaskStatusEnum = pgEnum("admin_task_status", ["backlog", "todo", "doing", "done"]);

/** 급함. 색만 다르게 쓰고 정렬에는 쓰지 않는다 — 순서는 사람이 직접 잡는다(sortOrder) */
export const adminTaskPriorityEnum = pgEnum("admin_task_priority", ["high", "normal", "low"]);

export const adminTasks = pgTable("admin_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  /** 본문. 배경, 다음 수, 막힌 지점을 적는 자리 */
  body: text("body"),
  status: adminTaskStatusEnum("status").default("todo").notNull(),
  priority: adminTaskPriorityEnum("priority").default("normal").notNull(),

  /*
   * 칸 안에서의 순서. 작을수록 위다.
   *
   * 왜 정수인가: 이 판은 관리자 한 사람이 쓴다. 동시에 두 사람이 같은 칸을 재정렬하는 일이 없으므로
   * 소수 자리(1.5 끼워넣기)나 링크드리스트 같은 장치가 필요 없다. 옮길 때 그 칸만 다시 번호를 매긴다.
   */
  sortOrder: integer("sort_order").default(0).notNull(),

  /** 마감. 없어도 된다 — 대부분의 할 일은 날짜가 아니라 순서로 관리된다 */
  dueAt: timestamp("due_at", { withTimezone: true }),
  /** done 으로 옮긴 시각. 판을 정리할 때 "언제 끝낸 일" 인지 보려고 남긴다 */
  doneAt: timestamp("done_at", { withTimezone: true }),

  /*
   * 할 일이 가리키는 대상. 셋 다 선택이고 동시에 채워도 된다.
   * 게임이 지워지면 할 일까지 사라지면 안 된다 — 그 삭제 자체가 할 일의 내용일 수 있다.
   * 그래서 cascade 가 아니라 set null 이다.
   */
  gameId: uuid("game_id").references(() => games.id, { onDelete: "set null" }),
  shopId: uuid("shop_id").references(() => shops.id, { onDelete: "set null" }),
  source: sourceEnum("source"),

  ...auditColumns(),
}, (t) => [
  // 판은 늘 "칸별로 모아 순서대로" 읽는다. 이 화면의 질의는 사실상 이것 하나다
  index("admin_tasks_board_idx").on(t.status, t.sortOrder),
  // 게임 상세에서 "이 게임에 걸린 할 일" 을 되짚을 때 쓴다
  index("admin_tasks_game_idx").on(t.gameId).where(sql`game_id is not null`),
]);
