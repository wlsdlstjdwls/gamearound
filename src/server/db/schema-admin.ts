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
import { games, users } from "./schema";
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

  /*
   * 담당자(2026-09-30, 사용자 요청: "일 등록할 때 담당자 지정"). 판을 쓰는 사람이 둘 이상이 되면서
   * "누가 쥔 일인가" 가 카드에 서야 했다. 비워 둘 수 있다 — 아무도 안 쥔 일도 판에 산다.
   * 계정이 지워지면 할 일은 남고 담당만 비운다(set null) — 그 일은 여전히 해야 할 일이다.
   * created_by 와 따로 두는 이유: 적은 사람과 할 사람은 다르다.
   */
  assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),

  ...auditColumns(),
}, (t) => [
  // 판은 늘 "칸별로 모아 순서대로" 읽는다. 이 화면의 질의는 사실상 이것 하나다
  index("admin_tasks_board_idx").on(t.status, t.sortOrder),
  // 게임 상세에서 "이 게임에 걸린 할 일" 을 되짚을 때 쓴다
  index("admin_tasks_game_idx").on(t.gameId).where(sql`game_id is not null`),
]);

/**
 * 기록 한 줄의 갈래.
 *
 * `note` 는 사람이 적은 글이다 — 후속 내용, 막힌 지점, 끝내며 남기는 말.
 * `move` 는 판이 스스로 남긴 자취다(어느 칸에서 어느 칸으로).
 *
 * **왜 자취를 별도 로그가 아니라 같은 표에 넣나:** 카드를 열었을 때 사람이 보고 싶은 것은
 * "이 일이 어떻게 흘러왔나" 하나다. 사람 글과 칸 이동이 다른 곳에 살면 화면이 둘을 시각순으로
 * 다시 섞어야 하고, 그 섞는 코드가 두 표의 시각 필드를 계속 맞춰야 한다. 한 줄로 두면 질의 하나다.
 */
export const adminTaskNoteKindEnum = pgEnum("admin_task_note_kind", ["note", "move"]);

/**
 * 할 일에 달리는 기록. 후속 내용, 완료 내용, 주고받는 말이 여기 쌓인다.
 *
 * **왜 카드의 `body` 로는 모자라나:** `body` 는 "이 일이 무엇인가" 를 적는 자리라 고쳐 쓰는 값이다.
 * 진행은 덮어쓰면 안 된다 — 지난주에 왜 막혔는지가 이번 주 판단의 근거다. 그래서 쌓이는 표를 따로 둔다.
 *
 * **왜 답글(계층)이 없나:** 이 판은 관리자가 쓴다. 답글을 두려면 parentId 와 들여쓰기 렌더가 붙는데,
 * 쓰는 사람이 한둘인 판에서 그 구조는 읽기만 어렵게 한다. 시각순 한 줄이면 충분하다.
 * 여럿이 쓰게 되는 날 parentId 를 더하면 된다 — 그때까지는 넣지 않는다.
 *
 * 할 일이 지워지면 기록도 함께 지운다(cascade). `gameId` 가 set null 인 것과 반대인 이유는,
 * 게임은 할 일 바깥에서도 살지만 기록은 그 할 일 없이는 읽을 수 없는 글이기 때문이다.
 */
export const adminTaskNotes = pgTable("admin_task_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => adminTasks.id, { onDelete: "cascade" }),
  kind: adminTaskNoteKindEnum("kind").default("note").notNull(),

  /** 사람이 적은 글. `move` 자취는 쓸 말이 없으므로 비운다 */
  body: text("body"),

  /*
   * 칸 이동 자취의 앞뒤 칸. 화면 문구("할 일 에서 하는 중 으로")를 여기 굳혀 넣지 않는 이유는
   * 칸 이름이 화면 낱말이기 때문이다 — 낱말을 바꾸면 지난 기록만 옛 이름으로 남는다.
   * 원값을 적고 읽을 때 이름을 붙인다(TASK_STATUS_LABEL).
   */
  fromStatus: adminTaskStatusEnum("from_status"),
  toStatus: adminTaskStatusEnum("to_status"),

  ...auditColumns(),
}, (t) => [
  // 읽기는 늘 "이 할 일의 기록을 시각순으로" 하나다
  index("admin_task_notes_task_idx").on(t.taskId, t.createdAt),
]);
