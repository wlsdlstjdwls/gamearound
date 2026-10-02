// 관리자 할 일 판 서비스 — 쓰기 쪽(만들기, 고치기, 옮기기, 기록). 읽기는 board.ts.
import "server-only";
import { and, asc, eq, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { adminTaskNotes, adminTaskReads, adminTasks, type SourceName } from "@/server/db/schema";
import { createdBy, updatedBy } from "@/server/db/audit";
import { requireAdmin } from "@/server/services/users";
import { deleteBlobs } from "@/server/services/blob-files";
import { attachmentUrls } from "./attachments";
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
 * 칸을 옮기거나 같은 칸 안에서 자리를 바꾼다(2026-10-02, 위로/아래로 단추를 걷고 끌기로 합쳤다).
 *
 * `before` 를 주면 그 카드 바로 앞에 놓고(null 이면 칸 맨 끝), 칸 전체에 번호를 새로 매긴다.
 * 끌어 놓는 사람은 "이 둘 사이" 를 가리키므로 번호 하나만 고쳐서는 그 자리를 못 만든다 — 같은 번호가 겹친 칸도 있다.
 * 자리를 카드 id 로 받는 이유: 판은 거른 채로 끌 수 있다. 화면의 몇 번째를 받으면 숨은 카드 때문에 엉뚱한 자리에 선다.
 *
 * `before` 를 안 주면(팝업의 칸 단추) 받는 칸 맨 위에 놓는다 — 방금 "하는 중" 으로 옮긴 일이 바닥에 깔리면 판을 보는 의미가 없다.
 * 끝난 칸은 순서가 끝낸 시각이라(board.ts) 자리를 받지 않는다.
 *
 * `done` 으로 갈 때만 doneAt 을 찍고, 거기서 나오면 지운다. 되돌린 일이 끝난 시각을 갖고 있으면
 * 나중에 "언제 끝냈나" 를 물을 때 거짓말을 한다.
 */
export async function moveTask(id: string, to: TaskStatus, before?: string | null): Promise<void> {
  const admin = await requireAdmin();
  const db = getDb();
  const [me] = await db.select({ status: adminTasks.status }).from(adminTasks).where(eq(adminTasks.id, id));
  if (!me) return;
  const sameColumn = me.status === to;
  // 끝난 칸 안에서 놓는 건 할 일이 없다 — 거기서 doneAt 을 다시 찍으면 끝낸 시각이 거짓이 된다
  if (sameColumn && to === "done") return;

  const statusPatch = sameColumn ? {} : { status: to, doneAt: to === "done" ? new Date() : null };

  if (before === undefined || to === "done") {
    const [top] = await db
      .select({ min: sql<number>`coalesce(min(${adminTasks.sortOrder}), 0)::int` })
      .from(adminTasks)
      .where(eq(adminTasks.status, to));
    await db
      .update(adminTasks)
      .set({ ...statusPatch, sortOrder: (top?.min ?? 0) - 1, ...updatedBy("admin", admin.id) })
      .where(eq(adminTasks.id, id));
  } else {
    const siblings = await db
      .select({ id: adminTasks.id })
      .from(adminTasks)
      // 걷은 일은 판에 없다 — 번호를 같이 매길 까닭이 없다
      .where(and(eq(adminTasks.status, to), isNull(adminTasks.archivedAt), ne(adminTasks.id, id)))
      .orderBy(asc(adminTasks.sortOrder), asc(adminTasks.createdAt));
    const order = siblings.map((r) => r.id);
    const at = before ? order.indexOf(before) : -1;
    order.splice(at < 0 ? order.length : at, 0, id);
    await Promise.all(
      order.map((taskId, i) =>
        db
          .update(adminTasks)
          .set({ ...(taskId === id ? statusPatch : {}), sortOrder: i, ...updatedBy("admin", admin.id) })
          .where(eq(adminTasks.id, taskId)),
      ),
    );
  }

  /*
   * 옮긴 자취를 기록에 남긴다. 사람이 적지 않아도 "언제 시작했고 언제 끝냈나" 가 남아야
   * 카드 하나가 곧 그 일의 이력이 된다 — 그게 이 판을 메모장과 가르는 자리다.
   *
   * 같은 칸 안에서 자리만 바꾼 것은 자취가 아니다. 그것까지 적으면
   * 기록이 의미 없는 줄로 불어나 진짜 적은 글이 묻힌다.
   */
  if (!sameColumn) {
    await db.insert(adminTaskNotes).values({
      taskId: id,
      kind: "move",
      fromStatus: me.status,
      toStatus: to,
      ...createdBy("admin", admin.id),
    });
  }
}

/**
 * 기록 한 줄 남기기. 후속 내용, 막힌 지점, 끝내며 남기는 말이 여기로 들어온다.
 * 글 없이 파일만 남기는 기록도 있다(첨부, 2026-10-02) — 그때 body 는 비운다. 새 기록의 id 를 돌려준다(파일을 그 기록에 붙인다).
 */
export async function addNote(taskId: string, body: string): Promise<string> {
  const admin = await requireAdmin();
  const [row] = await getDb()
    .insert(adminTaskNotes)
    .values({
      taskId,
      kind: "note",
      body: body.trim() || null,
      ...createdBy("admin", admin.id),
    })
    .returning({ id: adminTaskNotes.id });
  return row!.id;
}

/**
 * 기록 지우기. 사람이 적은 글만 지운다 —
 * 칸 이동 자취까지 지우게 두면 이력이 "고칠 수 있는 이야기" 가 되어 근거로 못 쓴다.
 */
export async function deleteNote(id: string): Promise<void> {
  await requireAdmin();
  // 기록에 붙은 파일도 같이 치운다(deleteTask 와 같은 이유로 주소를 먼저 모은다)
  const urls = await attachmentUrls({ noteId: id });
  const rows = await getDb()
    .delete(adminTaskNotes)
    .where(and(eq(adminTaskNotes.id, id), eq(adminTaskNotes.kind, "note")))
    .returning({ id: adminTaskNotes.id });
  if (rows.length > 0) await deleteBlobs(urls);
}

/** 할 일 지우기. 첨부 파일 주소를 먼저 모은다 — cascade 가 행은 지우지만 저장소 파일은 못 지운다 */
export async function deleteTask(id: string): Promise<void> {
  await requireAdmin();
  const urls = await attachmentUrls({ taskId: id });
  await getDb().delete(adminTasks).where(eq(adminTasks.id, id));
  await deleteBlobs(urls);
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

/**
 * 이 카드를 지금 열었다고 적는다(새 기록 셈의 기준). 카드를 열 때마다 불리므로 한 줄 upsert 로 끝낸다.
 * updated_* 감사 칸은 시각과 함께 갈아 끼운다 — 이 행을 고치는 사람은 늘 그 행의 주인이다.
 */
export async function markTaskSeen(taskId: string): Promise<void> {
  const admin = await requireAdmin();
  const now = new Date();
  await getDb()
    .insert(adminTaskReads)
    .values({ taskId, userId: admin.id, seenAt: now, ...createdBy("admin", admin.id) })
    .onConflictDoUpdate({ target: [adminTaskReads.taskId, adminTaskReads.userId], set: { seenAt: now, ...updatedBy("admin", admin.id) } });
}
