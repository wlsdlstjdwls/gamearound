// 시스템관리 스키마(2026-10-30) — 공통코드, 알림 템플릿, 알림 발송 이력.
//
// 공통코드는 백오피스의 그룹 + 코드 2단 표다. 코드가 읽는 값만 여기 둔다(알림 받는 곳, 템플릿 분류 등).
// DB enum 으로 박힌 상태값(결제 상태, 수집 소스 등)은 옮기지 않는다 — 여기서 코드를 더해도 enum 이 받지 못해
// "추가했는데 아무 데도 안 뜨는" 코드가 생긴다. 그런 값의 이름표는 lib/*/messages 에 그대로 둔다.
//
// 지우지 않는다. 코드와 템플릿은 "미사용" 으로 끈다 — 지난 발송 이력과 다른 표가 그 코드를 들고 있다.
// 파일을 가른 이유는 다른 schema-* 와 같다. schema.ts 에서 재수출하므로 호출부 import 경로는 그대로다.
import { boolean, index, integer, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { auditColumns } from "./audit";

export const commonCodeGroups = pgTable("common_code_groups", {
  /** 그룹코드. 영문 대문자와 밑줄(NOTIFY_CHANNEL). 코드가 이 값으로 그룹을 찾으므로 저장한 뒤에는 바꾸지 않는다 */
  groupCode: text("group_code").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  /**
   * 코드마다 붙는 덧값 두 칸의 이름(백오피스 공통코드의 속성1, 속성2). 그룹마다 뜻이 달라 이름을 그룹이 정한다 —
   * 알림 받는 곳이면 "텔레그램 chat id". 비면 그 칸을 화면에 세우지 않는다
   */
  attr1Label: text("attr1_label"),
  attr2Label: text("attr2_label"),
  sortOrder: integer("sort_order").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  ...auditColumns(),
});

export const commonCodes = pgTable(
  "common_codes",
  {
    groupCode: text("group_code")
      .references(() => commonCodeGroups.groupCode, { onDelete: "restrict" })
      .notNull(),
    /** 코드값. 다른 표가 이 값을 들고 있으므로 저장한 뒤에는 바꾸지 않는다(이름만 고친다) */
    code: text("code").notNull(),
    name: text("name").notNull(),
    attr1: text("attr1"),
    attr2: text("attr2"),
    sortOrder: integer("sort_order").default(0).notNull(),
    active: boolean("active").default(true).notNull(),
    memo: text("memo"),
    ...auditColumns(),
  },
  (t) => [primaryKey({ columns: [t.groupCode, t.code] })],
);

export const notifyTemplates = pgTable("notify_templates", {
  /** 템플릿코드. 시스템 템플릿은 코드가 이 값으로 부른다(lib/notify/system-templates) */
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  /** 분류(공통코드 NOTIFY_CATEGORY) */
  category: text("category").notNull(),
  /** 받는 곳(공통코드 NOTIFY_CHANNEL). 발송할 때 그 코드의 chat id 로 바꾼다 */
  channel: text("channel").notNull(),
  /** 본문. 텔레그램 HTML 일부 태그와 {변수} 를 쓴다(lib/notify/template) */
  body: text("body").notNull(),
  /** 코드가 사건마다 부르는 템플릿. 코드와 변수는 코드가 정하므로 화면에서 코드를 못 바꾸고, 끄면 그 사건 알림이 멈춘다 */
  system: boolean("system").default(false).notNull(),
  active: boolean("active").default(true).notNull(),
  memo: text("memo"),
  ...auditColumns(),
});

/** sent: 텔레그램이 받았다, failed: 보냈는데 거절되거나 닿지 않았다, skipped: 보낼 수 없어 보내지 않았다(토큰 없음, 받는 곳 미사용 등) */
export const notifySendStatusEnum = pgEnum("notify_send_status", ["sent", "failed", "skipped"]);
export type NotifySendStatus = (typeof notifySendStatusEnum.enumValues)[number];

/** manual: 관리자가 발송관리 화면에서 보냈다, system: 사건(업무요청 등)이 보냈다 */
export const notifyTriggerEnum = pgEnum("notify_trigger", ["manual", "system"]);
export type NotifyTrigger = (typeof notifyTriggerEnum.enumValues)[number];

export const notifySends = pgTable(
  "notify_sends",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** 템플릿 없이 직접 쓴 글이면 비운다 */
    templateCode: text("template_code"),
    channel: text("channel").notNull(),
    /** 그때 실제로 보낸 chat id. 받는 곳 코드의 값이 나중에 바뀌어도 이 줄은 그때 값을 들고 있다 */
    chatId: text("chat_id"),
    trigger: notifyTriggerEnum("trigger").notNull(),
    /** 보낸 글 그대로(변수를 채운 텔레그램 HTML) */
    text: text("text").notNull(),
    status: notifySendStatusEnum("status").notNull(),
    /** 실패, 건너뜀 사유. 텔레그램이 준 본문을 앞부분만 남긴다 */
    error: text("error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    ...auditColumns(),
  },
  (t) => [index("notify_sends_created_idx").on(t.createdAt), index("notify_sends_template_idx").on(t.templateCode, t.createdAt)],
);
