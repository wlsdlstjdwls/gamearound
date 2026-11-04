"use server";
// 업무 일정(WBS) Server Action(2026-11-04). 관리자 role 을 다시 보고, 화면과 같은 스키마(lib/admin/plan-schemas)로 검증한다.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionError } from "@/lib/db-errors";
import { PLAN_MESSAGES as M } from "@/lib/admin/messages";
import { savePlanSchema } from "@/lib/admin/plan-schemas";
import { ROUTES } from "@/lib/routes";
import { createTaskForPlanItem, registerPlanAttachment, removePlanAttachment, savePlan, setTaskPlanItem } from "@/server/services/admin-plan";
import { planAttachmentRegisterSchema } from "@/lib/admin/task-attachments";
import { requireAdmin } from "@/server/services/users";
import { bumpWorkVersion } from "@/server/services/admin-tasks";

export type PlanActionResult = { ok: true; id?: string } | { ok: false; error: string };

/** 칸반과 일정은 같은 경로의 두 보기다(?mode=plan) — 경로 하나를 밀면 둘 다 새로 읽는다 */
async function refresh() {
  revalidatePath(ROUTES.adminTasks);
  // 다른 사람의 열린 판이 알아채게(admin-tasks/live). 응답 전에 올린다 — 새로 그린 이 화면이 올린 번호를 받아 가야 제 고침으로 한 번 더 읽지 않는다
  await bumpWorkVersion();
}

export async function savePlanAction(input: unknown): Promise<PlanActionResult> {
  try {
    await requireAdmin();
    const parsed = savePlanSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: M.invalid };
    await savePlan(parsed.data);
    await refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: actionError(e, M.failed) };
  }
}

export async function createPlanTaskAction(itemId: unknown): Promise<PlanActionResult> {
  try {
    await requireAdmin();
    const id = z.uuid().parse(itemId);
    const taskId = await createTaskForPlanItem(id);
    if (!taskId) return { ok: false, error: M.failed };
    await refresh();
    return { ok: true, id: taskId };
  } catch (e) {
    return { ok: false, error: actionError(e, M.failed) };
  }
}

/** 카드의 일정 연결 바꾸기(빈 값이면 해제). 일정 화면의 "연결 해제" 와 업무요청 팝업의 일정 칸이 같이 쓴다 */
export async function linkTaskPlanAction(taskId: unknown, planItemId: unknown): Promise<PlanActionResult> {
  try {
    await requireAdmin();
    const task = z.uuid().parse(taskId);
    const item = z.union([z.uuid(), z.literal(""), z.null()]).parse(planItemId);
    await setTaskPlanItem(task, item || null);
    await refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: actionError(e, M.failed) };
  }
}

export async function registerPlanAttachmentAction(input: unknown): Promise<PlanActionResult> {
  try {
    await requireAdmin();
    const p = planAttachmentRegisterSchema.safeParse(input);
    if (!p.success) return { ok: false, error: M.invalid };
    await registerPlanAttachment(p.data);
    await refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: actionError(e, M.failed) };
  }
}

export async function removePlanAttachmentAction(id: unknown): Promise<PlanActionResult> {
  try {
    await requireAdmin();
    await removePlanAttachment(z.uuid().parse(id));
    await refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: actionError(e, M.failed) };
  }
}
