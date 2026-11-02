// 회원 화면이 미리 보기로 읽는 알림 템플릿 문구(2026-11-02). 요청 안에서 한 번만 묻는다(react cache) — 가격 알림 목록은 줄마다 미리 보기가 있다.
import "server-only";
import { cache } from "react";
import { inArray } from "drizzle-orm";
import type { NoticeCopy } from "@/lib/notify/copy";
import { getDb } from "@/server/db/client";
import { notifyTemplates } from "@/server/db/schema";

export const getNoticeCopy = cache(async (codes: readonly string[]): Promise<NoticeCopy> => {
  if (codes.length === 0) return {};
  const rows = await getDb()
    .select({ code: notifyTemplates.code, subject: notifyTemplates.subject, body: notifyTemplates.body, active: notifyTemplates.active })
    .from(notifyTemplates)
    .where(inArray(notifyTemplates.code, [...codes]))
    .catch(() => []);
  return Object.fromEntries(rows.map((r) => [r.code, { subject: r.subject, body: r.body, active: r.active }]));
});
