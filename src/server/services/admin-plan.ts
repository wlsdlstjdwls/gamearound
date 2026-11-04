// 업무 일정(WBS) 서비스(2026-11-04). 일정 줄 읽기, 화면 전체 저장, 업무요청 카드 잇기.
//
// 계산(번호, 상위 기간, 진행률)은 여기서 하지 않는다 — 화면이 끌기, 들여쓰기로 줄을 바꿀 때마다 같은 계산을 다시 해야 해서
// lib/admin/plan 에 두고 화면이 부른다. 여기는 저장된 줄과 이은 카드만 돌려준다.
import "server-only";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { adminPlanItems, adminTasks } from "@/server/db/schema";
import { createdBy, updatedBy } from "@/server/db/audit";
import { requireAdmin } from "@/server/services/users";
import { createTask } from "@/server/services/admin-tasks";
import { buildPlanRows, type PlanCard, type PlanItem, type PlanOption } from "@/lib/admin/plan";
import type { SavePlanInput } from "@/lib/admin/plan-schemas";



const ITEM_COLUMNS = {
  id: adminPlanItems.id,
  parentId: adminPlanItems.parentId,
  sortOrder: adminPlanItems.sortOrder,
  title: adminPlanItems.title,
  track: adminPlanItems.track,
  kind: adminPlanItems.kind,
  startOn: adminPlanItems.startOn,
  endOn: adminPlanItems.endOn,
  progress: adminPlanItems.progress,
  assigneeId: adminPlanItems.assigneeId,
  output: adminPlanItems.output,
  memo: adminPlanItems.memo,
};

/** 일정 줄 전부와 이은 카드. 두 질의를 한 왕복(batch)으로 보낸다(neon-roundtrip-cost) */
export async function getPlan(): Promise<{ items: PlanItem[]; cards: PlanCard[] }> {
  await requireAdmin();
  const db = getDb();
  const [items, cards] = await db.batch([
    db.select(ITEM_COLUMNS).from(adminPlanItems),
    db
      .select({ id: adminTasks.id, title: adminTasks.title, status: adminTasks.status, planItemId: adminTasks.planItemId, archivedAt: adminTasks.archivedAt })
      .from(adminTasks)
      .where(isNotNull(adminTasks.planItemId)),
  ]);
  return {
    items,
    cards: cards.map((c) => ({ id: c.id, title: c.title, status: c.status, planItemId: c.planItemId!, archived: c.archivedAt != null })),
  };
}

/** 업무요청 팝업의 일정 칸 목록. 번호를 붙여 표 순서 그대로 */
export async function listPlanOptions(): Promise<PlanOption[]> {
  const db = getDb();
  const items = await db.select(ITEM_COLUMNS).from(adminPlanItems);
  return buildPlanRows(items).map((r) => ({ id: r.id, label: `${r.no} ${r.title}` }));
}

/**
 * 화면 전체 저장. 바뀐 줄은 한 문장(INSERT ... ON CONFLICT)으로 넣거나 고치고, 지운 줄은 지운다 — 둘을 한 묶음(batch)으로.
 * 새 줄의 열쇠는 화면이 만든 uuid 다. 그래야 새 상위 아래 새 하위를 한 번에 보낼 수 있다(상위 열쇠를 저장 전에 안다).
 * 한 문장 안의 자기 참조 외래키는 문장 끝에 검사하므로 상위와 하위가 같은 문장에 있어도 된다.
 */
export async function savePlan(input: SavePlanInput): Promise<void> {
  const admin = await requireAdmin();
  const db = getDb();
  const rows = input.upsert.map((it) => ({
    ...it,
    // 이정표는 날 하나다 — 끝을 시작과 같게 맞춘다(끌기, 입력 어느 길로 와도)
    endOn: it.kind === "milestone" ? it.startOn : it.endOn,
    ...createdBy("admin", admin.id),
  }));
  const ops = [];
  if (rows.length > 0) {
    const ex = (col: string) => sql.raw(`excluded.${col}`);
    ops.push(
      db
        .insert(adminPlanItems)
        .values(rows)
        .onConflictDoUpdate({
          target: adminPlanItems.id,
          set: {
            parentId: ex("parent_id"),
            sortOrder: ex("sort_order"),
            title: ex("title"),
            track: ex("track"),
            kind: ex("kind"),
            startOn: ex("start_on"),
            endOn: ex("end_on"),
            progress: ex("progress"),
            assigneeId: ex("assignee_id"),
            output: ex("output"),
            memo: ex("memo"),
            ...updatedBy("admin", admin.id),
          },
        }),
    );
  }
  if (input.deleted.length > 0) ops.push(db.delete(adminPlanItems).where(inArray(adminPlanItems.id, input.deleted)));
  const [first, ...rest] = ops;
  if (first) await db.batch([first, ...rest]);
}

/** 일정 줄에서 업무요청 카드를 만든다. 제목과 담당을 그대로 옮기고 할 일 칸 맨 위에 놓는다 */
export async function createTaskForPlanItem(itemId: string): Promise<string | null> {
  await requireAdmin();
  const db = getDb();
  const [item] = await db.select({ title: adminPlanItems.title, assigneeId: adminPlanItems.assigneeId }).from(adminPlanItems).where(eq(adminPlanItems.id, itemId));
  if (!item) return null;
  return createTask({ title: item.title, assigneeId: item.assigneeId, planItemId: itemId });
}

/** 카드의 일정 연결을 바꾼다(null 이면 해제). 바뀐 때만 쓴다 */
export async function setTaskPlanItem(taskId: string, planItemId: string | null): Promise<void> {
  const admin = await requireAdmin();
  const db = getDb();
  await db
    .update(adminTasks)
    .set({ planItemId, ...updatedBy("admin", admin.id) })
    .where(and(eq(adminTasks.id, taskId), planItemId ? sql`${adminTasks.planItemId} is distinct from ${planItemId}::uuid` : isNotNull(adminTasks.planItemId)));
}
