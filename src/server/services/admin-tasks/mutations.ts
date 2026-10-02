// 관리자 할 일 판 서비스 — 쓰기 쪽(만들기, 고치기, 옮기기, 기록). 읽기는 board.ts.
import "server-only";
import { and, asc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { adminTaskNotes, adminTasks, type SourceName } from "@/server/db/schema";
import { createdBy, updatedBy } from "@/server/db/audit";
import { requireAdmin } from "@/server/services/users";
import type { TaskCategory, TaskPriority, TaskStatus } from "@/lib/admin/tasks";

export interface CreateTaskInput {
  title: string;
  body?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: TaskCategory;
  gameId?: string | null;
  shopId?: string | null;
  source?: SourceName | null;
  assigneeId?: string | null;
}

/** 새 할 일은 자기 칸 맨 위에 놓는다 — 방금 적은 것이 화면 밖에 있으면 적은 보람이 없다 */
export async function createTask(input: CreateTaskInput): Promise<string> {
  const admin = await requireAdmin();
  const db = getDb();
  const status = input.status ?? "todo";
  const [top] = await db
    .select({ min: sql<number>`coalesce(min(${adminTasks.sortOrder}), 0)::int` })
    .from(adminTasks)
    .where(eq(adminTasks.status, status));

  const [row] = await db
    .insert(adminTasks)
    .values({
      title: input.title.trim(),
      body: input.body?.trim() || null,
      status,
      priority: input.priority ?? "normal",
      category: input.category ?? "task",
      sortOrder: (top?.min ?? 0) - 1,
      gameId: input.gameId || null,
      shopId: input.shopId || null,
      source: input.source || null,
      assigneeId: input.assigneeId || null,
      ...createdBy("admin", admin.id),
    })
    .returning({ id: adminTasks.id });
  return row!.id;
}

export async function updateTask(
  id: string,
  patch: {
    title?: string;
    body?: string | null;
    priority?: TaskPriority;
    category?: TaskCategory;
    dueAt?: Date | null;
    gameId?: string | null;
    assigneeId?: string | null;
  },
): Promise<void> {
  const admin = await requireAdmin();
  await getDb()
    .update(adminTasks)
    .set({
      ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
      ...(patch.body !== undefined ? { body: patch.body?.trim() || null } : {}),
      ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
      ...(patch.category !== undefined ? { category: patch.category } : {}),
      ...(patch.dueAt !== undefined ? { dueAt: patch.dueAt } : {}),
      // null 은 "뗐다" 는 뜻이라 그대로 적는다 — 여기서는 수집이 아니라 사람이 쥔 값이다(§7 의 null 규칙 밖)
      ...(patch.gameId !== undefined ? { gameId: patch.gameId } : {}),
      ...(patch.assigneeId !== undefined ? { assigneeId: patch.assigneeId } : {}),
      ...updatedBy("admin", admin.id),
    })
    .where(eq(adminTasks.id, id));
}

/**
 * 칸을 옮긴다. 옮긴 카드는 받는 칸 맨 위에 놓는다 —
 * 방금 "하는 중" 으로 끌어온 일이 그 칸 바닥에 깔리면 판을 보는 의미가 없다.
 *
 * `done` 으로 갈 때만 doneAt 을 찍고, 거기서 나오면 지운다. 되돌린 일이 끝난 시각을 갖고 있으면
 * 나중에 "언제 끝냈나" 를 물을 때 거짓말을 한다.
 */
export async function moveTask(id: string, to: TaskStatus): Promise<void> {
  const admin = await requireAdmin();
  const db = getDb();
  const [[top], [before]] = await Promise.all([
    db
      .select({ min: sql<number>`coalesce(min(${adminTasks.sortOrder}), 0)::int` })
      .from(adminTasks)
      .where(eq(adminTasks.status, to)),
    db.select({ status: adminTasks.status }).from(adminTasks).where(eq(adminTasks.id, id)),
  ]);
  if (!before) return;

  await db
    .update(adminTasks)
    .set({
      status: to,
      sortOrder: (top?.min ?? 0) - 1,
      doneAt: to === "done" ? new Date() : null,
      ...updatedBy("admin", admin.id),
    })
    .where(eq(adminTasks.id, id));

  /*
   * 옮긴 자취를 기록에 남긴다. 사람이 적지 않아도 "언제 시작했고 언제 끝냈나" 가 남아야
   * 카드 하나가 곧 그 일의 이력이 된다 — 그게 이 판을 메모장과 가르는 자리다.
   *
   * 같은 칸으로 다시 놓는 것(드래그가 제자리에 떨어질 때)은 자취가 아니다. 그것까지 적으면
   * 기록이 의미 없는 줄로 불어나 진짜 적은 글이 묻힌다.
   */
  if (before.status !== to) {
    await db.insert(adminTaskNotes).values({
      taskId: id,
      kind: "move",
      fromStatus: before.status,
      toStatus: to,
      ...createdBy("admin", admin.id),
    });
  }
}

/** 기록 한 줄 남기기. 후속 내용, 막힌 지점, 끝내며 남기는 말이 여기로 들어온다 */
export async function addNote(taskId: string, body: string): Promise<void> {
  const admin = await requireAdmin();
  await getDb().insert(adminTaskNotes).values({
    taskId,
    kind: "note",
    body: body.trim(),
    ...createdBy("admin", admin.id),
  });
}

/**
 * 기록 지우기. 사람이 적은 글만 지운다 —
 * 칸 이동 자취까지 지우게 두면 이력이 "고칠 수 있는 이야기" 가 되어 근거로 못 쓴다.
 */
export async function deleteNote(id: string): Promise<void> {
  await requireAdmin();
  await getDb().delete(adminTaskNotes).where(and(eq(adminTaskNotes.id, id), eq(adminTaskNotes.kind, "note")));
}

/**
 * 같은 칸 안에서 한 칸 위/아래로. 드래그 대신 이걸 두는 이유는 키보드로도 순서를 바꿀 수 있어야 해서다
 * (AGENTS §6 a11y). 드래그는 마우스에만 있는 길이라, 그것만 두면 순서 바꾸기가 특정 입력기기 전용이 된다.
 */
export async function reorderTask(id: string, dir: "up" | "down"): Promise<void> {
  const admin = await requireAdmin();
  const db = getDb();

  const [me] = await db
    .select({ status: adminTasks.status, sortOrder: adminTasks.sortOrder, createdAt: adminTasks.createdAt })
    .from(adminTasks)
    .where(eq(adminTasks.id, id));
  if (!me) return;

  const siblings = await db
    .select({ id: adminTasks.id, sortOrder: adminTasks.sortOrder })
    .from(adminTasks)
    // 걷은 일은 판에 없다 — 이웃으로 치면 "아래로" 가 보이지 않는 카드와 자리를 바꿔 아무 일도 안 일어난 것처럼 보인다
    .where(and(eq(adminTasks.status, me.status), isNull(adminTasks.archivedAt)))
    .orderBy(asc(adminTasks.sortOrder), asc(adminTasks.createdAt));

  const at = siblings.findIndex((s) => s.id === id);
  const swapWith = dir === "up" ? at - 1 : at + 1;
  if (at < 0 || swapWith < 0 || swapWith >= siblings.length) return;

  // 이웃과 자리를 맞바꾼다. 같은 번호가 겹쳐 있어도 인덱스 기준으로 새 번호를 주므로 순서가 확정된다
  const reordered = [...siblings];
  [reordered[at], reordered[swapWith]] = [reordered[swapWith]!, reordered[at]!];
  await Promise.all(
    reordered.map((s, i) =>
      db
        .update(adminTasks)
        .set({ sortOrder: i, ...updatedBy("admin", admin.id) })
        .where(eq(adminTasks.id, s!.id)),
    ),
  );
}

export async function deleteTask(id: string): Promise<void> {
  await requireAdmin();
  await getDb().delete(adminTasks).where(eq(adminTasks.id, id));
}

/**
 * 끝난 일 치우기 — 판에서 **걷는다**(지우지 않는다). 판을 정리하는 유일한 길이다 — 하나씩 지우면 아무도 안 치운다.
 *
 * 2026-10-02 까지는 DELETE 였다. 기록이 cascade 로 같이 사라져 끝낸 일의 이력을 다시 볼 길이 없었다
 * (사용자: "치우기는 숨김이어야 한다"). 이제 archived_at 만 찍고, 걷은 일은 지난 일 화면에서 본다.
 * 판에 안 보이던 끝난 일(DONE_VISIBLE_LIMIT 밖)도 같이 걷는다 — 칸에 안 보여도 끝난 일이다.
 */
export async function archiveDone(): Promise<number> {
  const admin = await requireAdmin();
  const rows = await getDb()
    .update(adminTasks)
    .set({ archivedAt: new Date(), ...updatedBy("admin", admin.id) })
    .where(and(eq(adminTasks.status, "done"), isNotNull(adminTasks.doneAt), isNull(adminTasks.archivedAt)))
    .returning({ id: adminTasks.id });
  return rows.length;
}

/**
 * 걷은 일을 판으로 되돌린다. 칸은 그대로(완료)다 — 걷기 전 자리가 완료 칸뿐이라 되돌릴 곳도 거기다.
 * 다시 하려면 판에서 칸을 옮긴다. 그래야 칸 이동 자취가 남는다.
 */
export async function restoreTask(id: string): Promise<void> {
  const admin = await requireAdmin();
  await getDb()
    .update(adminTasks)
    .set({ archivedAt: null, ...updatedBy("admin", admin.id) })
    .where(and(eq(adminTasks.id, id), isNotNull(adminTasks.archivedAt)));
}
