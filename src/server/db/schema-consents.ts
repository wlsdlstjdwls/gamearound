// 가입 동의 기록(기획서 v2.0 S-27 "전체 동의, 이용약관(필수), 개인정보(필수), 가격 알림 이메일(선택)").
//
// users 칸이 아니라 따로 둔 이유: users 는 로그인마다 행 전체를 읽는다(services/users 의 findFirst).
// 거기에 칸을 더하면 마이그레이션이 돌기 전까지 모든 로그인이 "없는 칼럼" 으로 깨진다. 이 표는 가입 때만 쓴다.
// 동의 하나가 한 행이다 — 약관이 바뀌어 다시 동의를 받을 날이 오면 종류를 늘리지 않고 시각만 새로 적는다.
// 철회(선택 동의 끄기)는 행을 지운다. 언제 껐는지는 감사 칸(updated_*)이 아니라 지운 사실 자체로 남는다 — 지금은 끄는 화면이 없다.
import { pgEnum, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { auditColumns } from "./audit";
import { users } from "./schema";

/** terms 이용약관(필수), privacy 개인정보 수집, 이용(필수), alert_email 가격 알림 이메일 받기(선택) */
export const consentKindEnum = pgEnum("consent_kind", ["terms", "privacy", "alert_email"]);
export type ConsentKind = (typeof consentKindEnum.enumValues)[number];

export const userConsents = pgTable(
  "user_consents",
  {
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    kind: consentKindEnum("kind").notNull(),
    agreedAt: timestamp("agreed_at", { withTimezone: true }).defaultNow().notNull(),
    /**
     * 동의한 문서의 개정일(lib/legal 의 REVISED_AT, 2026-10-30). 약관을 고친 뒤 누가 어느 판에 동의했는지 가리려고 남긴다.
     * 문서가 없는 동의(가격 알림 이메일)와 이 칸이 생기기 전의 기록은 null 이다
     */
    documentVersion: text("document_version"),
    ...auditColumns(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.kind] })],
);
