// /admin/tasks/plan — 업무관리의 일정(WBS) 보기(2026-11-04). 화면은 components/admin/plan-screen.
// 여기는 일정 줄, 이은 카드, 담당자 후보를 나란히 읽어 넘기기만 한다(왕복을 줄 세우지 않는다, neon-roundtrip-cost).
import type { Metadata } from "next";
import { PlanScreen } from "@/components/admin/plan-screen";
import { ADMIN_NAV, PLAN_MESSAGES } from "@/lib/admin/messages";
import { todayIsoKst } from "@/lib/calendar";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { getPlan } from "@/server/services/admin-plan";
import { listAssignees } from "@/server/services/admin-tasks";

export const metadata: Metadata = { title: `${ADMIN_NAV.tasks} ${PLAN_MESSAGES.viewPlan}` };
// 일정은 늘 지금 값을 봐야 한다 — 칸반에서 카드를 옮기면 진행률이 바뀐다
export const dynamic = "force-dynamic";

export default async function AdminTasksPlanPage() {
  await requireRoleOrForbid("admin");
  const [{ items, cards }, assignees] = await Promise.all([getPlan(), listAssignees()]);
  return <PlanScreen items={items} cards={cards} assignees={assignees} today={todayIsoKst()} />;
}
