// /admin/notify-sends — 알림발송관리(2026-10-30, 사용자 "직접 보낼 수 있게"). 위 조회조건, 왼쪽 발송 이력, 오른쪽 이력 상세 또는 직접 발송 폼.
// 조회조건(기간, 상태, 템플릿)은 주소에 싣는다 — 이력은 쌓이기만 해서 서버가 기간으로 잘라 읽어야 한다. ?compose=코드 로 오면 그 템플릿으로 발송 폼을 연다.
import type { Metadata } from "next";
import { NotifySendsScreen } from "@/components/admin/notify/sends-screen";
import { ADMIN_NAV } from "@/lib/admin/messages";
import { CODE_GROUPS } from "@/lib/codes/groups";
import { NOTIFY_COMPOSE_PARAM } from "@/lib/routes";
import { periodRange, resolvePeriod } from "@/lib/stats/period";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { notifySendStatusEnum, type NotifySendStatus } from "@/server/db/schema";
import { getActiveCodes } from "@/server/services/common-codes";
import { listNotifySends, listNotifyTemplates, NOTIFY_SENDS_LIMIT } from "@/server/services/notify-admin";

export const metadata: Metadata = { title: ADMIN_NAV.notifySends };

/** 기본 조회 기간과 한 번에 볼 수 있는 기간(일). 이력은 날마다 몇 건이라 한 달이면 한 판에 든다 */
const DEFAULT_DAYS = 7;
const MAX_DAYS = 92;

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminNotifySendsPage({ searchParams }: { searchParams: Search }) {
  await requireRoleOrForbid("admin");
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const period = resolvePeriod({ from: one("from"), to: one("to") }, { defaultDays: DEFAULT_DAYS, maxDays: MAX_DAYS });
  const statusRaw = one("status");
  const status = (notifySendStatusEnum.enumValues as readonly string[]).includes(statusRaw ?? "") ? (statusRaw as NotifySendStatus) : null;
  const template = one("template") || null;
  const { start, end } = periodRange(period);

  const [rows, templates, channels] = await Promise.all([
    listNotifySends({ from: start, to: end, status, templateCode: template }),
    listNotifyTemplates(),
    getActiveCodes(CODE_GROUPS.notifyChannel),
  ]);
  return (
    <NotifySendsScreen
      rows={rows}
      limit={NOTIFY_SENDS_LIMIT}
      filter={{ ...period, status: status ?? "all", template: template ?? "all" }}
      templates={templates}
      channels={channels.map((c) => ({ value: c.code, label: c.name }))}
      compose={one(NOTIFY_COMPOSE_PARAM) ?? null}
    />
  );
}
