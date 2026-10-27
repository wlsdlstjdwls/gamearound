// 알림함 스키마(기획서 v2.0 M-03 헤더 종 아이콘, 8장 Notification). 가격 하락, 내 글의 새 댓글 같은 소식이 쌓인다.
// 웹푸시, 이메일과 따로 둔다 — 그 둘은 "보냈다" 로 끝나지만 알림함은 사이트 안에서 다시 읽는 기록이다.
// 읽음 표시는 후속이라(기획서 M-03) readAt 칸만 먼저 두고 화면은 아직 쓰지 않는다.
import { pgTable, pgEnum, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { auditColumns } from "./audit";
import { users } from "./schema";

export const notificationKindEnum = pgEnum("notification_kind", ["price_drop", "comment", "approval", "release", "dev_news"]);
export type NotificationKind = (typeof notificationKindEnum.enumValues)[number];

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    kind: notificationKindEnum("kind").notNull(),
    /** 한 줄 문구. 만들 때 다 적어 둔다 — 원본(글, 게임)이 지워져도 알림함은 읽혀야 한다 */
    body: text("body").notNull(),
    /** 누르면 갈 사이트 안 경로 */
    link: text("link"),
    readAt: timestamp("read_at", { withTimezone: true }),
    ...auditColumns(),
  },
  (t) => [index("notifications_user_created_idx").on(t.userId, t.createdAt)],
);
