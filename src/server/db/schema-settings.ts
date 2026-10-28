// 사이트 설정 — 관리자 화면에서 바꾸는 운영 값(2026-10-28, 첫 값은 명예의 전당 1위 인트로).
//
// 키 하나에 jsonb 값 하나. 설정마다 표나 칸을 만들지 않는 이유: 연출, 문구 같은 운영 값은 자주 늘고,
// 늘 때마다 마이그레이션을 부르면 안 된다. 값의 모양은 읽는 쪽(services/settings)이 zod 로 검증하고,
// 틀리거나 없으면 코드의 기본값으로 물러난다 — 이 표가 비어도 화면은 선다.
//
// 파일을 가른 이유는 다른 schema-* 와 같다. schema.ts 에서 재수출하므로 호출부 import 경로는 그대로다.
import { jsonb, pgTable, text } from "drizzle-orm/pg-core";
import { auditColumns } from "./audit";

export const siteSettings = pgTable("site_settings", {
  /** 설정 이름(services/settings 의 SETTING_KEYS) */
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  ...auditColumns(),
});
