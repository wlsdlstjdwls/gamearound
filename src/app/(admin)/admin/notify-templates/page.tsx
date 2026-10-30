// /admin/notify-templates — 알림템플릿관리(2026-10-30, 사용자 "텔레그램 알림 템플릿도 설정 가능하도록").
// 업무요청, 데이터 점검처럼 코드가 보내는 알림(시스템 템플릿)도 여기 문구를 쓴다. 고르기 칸(분류, 받는 곳)은 공통코드에서 읽는다.
import type { Metadata } from "next";
import { NotifyTemplatesScreen } from "@/components/admin/notify/templates-screen";
import { ADMIN_NAV } from "@/lib/admin/messages";
import { CODE_GROUPS } from "@/lib/codes/groups";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { getActiveCodes } from "@/server/services/common-codes";
import { listNotifyTemplates } from "@/server/services/notify-admin";

export const metadata: Metadata = { title: ADMIN_NAV.notifyTemplates };

export default async function AdminNotifyTemplatesPage() {
  await requireRoleOrForbid("admin");
  const [templates, channels, categories] = await Promise.all([listNotifyTemplates(), getActiveCodes(CODE_GROUPS.notifyChannel), getActiveCodes(CODE_GROUPS.notifyCategory)]);
  return (
    <NotifyTemplatesScreen
      templates={templates}
      channels={channels.map((c) => ({ value: c.code, label: c.name }))}
      categories={categories.map((c) => ({ value: c.code, label: c.name }))}
    />
  );
}
