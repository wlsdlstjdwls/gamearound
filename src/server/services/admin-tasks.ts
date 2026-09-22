// 관리자 할 일 판 서비스. 검수 큐와 달리 사람이 직접 적고 직접 옮기는 일이 산다.
//
// 화면까지 Drizzle 행을 흘리지 않는다(AGENTS §1) — 판은 붙인 대상(게임, 매장)의 이름까지 보여 줘야 하는데
// 그건 행에 없는 값이라, DTO 를 만드는 자리가 어차피 필요하다.
import "server-only";
import { and, asc, eq, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { adminTaskNotes, adminTasks, games, shops, users, type SourceName } from "@/server/db/schema";
import { createdBy, updatedBy } from "@/server/db/audit";
import { requireAdmin } from "@/server/services/users";
import type { Board, TaskNote, TaskPriority, TaskStatus } from "@/lib/admin/tasks";

// 칸 목록과 DTO 모양은 클라이언트도 쓰므로 잎 파일에 있다(lib/admin/tasks). 여기서 재수출한다.
export { TASK_STATUSES } from "@/lib/admin/tasks";
export type { AdminTask, Board, TaskNote, TaskPriority, TaskStatus } from "@/lib/admin/tasks";

/**
 * 끝난 일은 최근 것만 판에 남긴다. 판은 "지금 무엇을 하나" 를 보는 자리고,
 * 끝난 일이 무한히 쌓이면 그 칸이 판에서 제일 긴 칸이 되어 나머지를 화면 밖으로 민다.
 */
export const DONE_VISIBLE_LIMIT = 20;

function emptyBoard(): Board {
  return { backlog: [], todo: [], doing: [], done: [] };
}

/**
 * 판 한 장. 질의 한 번으로 네 칸을 다 읽고 코드에서 가른다 — 칸마다 물으면 왕복이 넷이 된다.
 *
 * 기록은 두 번째 질의로 한꺼번에 읽어 **나란히** 보낸다(Promise.all). 카드를 펼칠 때마다 물으면
 * 카드 수만큼 왕복이 늘고, Neon 왕복 하나가 220ms 다(neon-roundtrip-cost). 줄 세우지 않으므로
 * 화면이 기다리는 시간은 여전히 왕복 한 번이다.
 */
export async function getBoard(): Promise<Board> {
  await requireAdmin();
  const db = getDb();
  const [rows, noteRows] = await Promise.all([
    db
    .select({
      id: adminTasks.id,
      title: adminTasks.title,
      body: adminTasks.body,
      status: adminTasks.status,
      priority: adminTasks.priority,
      sortOrder: adminTasks.sortOrder,
      dueAt: adminTasks.dueAt,
      doneAt: adminTasks.doneAt,
      source: adminTasks.source,
      updatedAt: adminTasks.updatedAt,
      gameId: games.id,
      gameSlug: games.slug,
      gameTitleKo: games.titleKo,
      gameTitleEn: games.titleEn,
      shopId: shops.id,
      shopName: shops.name,
    })
    .from(adminTasks)
    .leftJoin(games, eq(games.id, adminTasks.gameId))
    .leftJoin(shops, eq(shops.id, adminTasks.shopId))
    .orderBy(asc(adminTasks.sortOrder), asc(adminTasks.createdAt)),

    // 기록 전부. 할 일별로 나누는 일은 코드가 한다 — 카드마다 물으면 왕복이 카드 수만큼 는다
    db
      .select({
        id: adminTaskNotes.id,
        taskId: adminTaskNotes.taskId,
        kind: adminTaskNotes.kind,
        body: adminTaskNotes.body,
        fromStatus: adminTaskNotes.fromStatus,
        toStatus: adminTaskNotes.toStatus,
        createdAt: adminTaskNotes.createdAt,
        authorName: users.displayName,
        authorEmail: users.email,
      })
      .from(adminTaskNotes)
      .leftJoin(users, eq(users.id, adminTaskNotes.createdBy))
      .orderBy(asc(adminTaskNotes.createdAt)),
  ]);

  // 오래된 것이 위다 — 기록은 흘러온 순서로 읽어야 뜻이 통한다
  const notesByTask = new Map<string, TaskNote[]>();
  for (const n of noteRows) {
    const list = notesByTask.get(n.taskId) ?? [];
    list.push({
      id: n.id,
      kind: n.kind,
      body: n.body,
      from: n.fromStatus,
      to: n.toStatus,
      authorName: n.authorName?.trim() || n.authorEmail || null,
      createdAt: n.createdAt,
    });
    notesByTask.set(n.taskId, list);
  }

  const board = emptyBoard();
  for (const r of rows) {
    board[r.status].push({
      id: r.id,
      title: r.title,
      body: r.body,
      status: r.status,
      priority: r.priority,
      sortOrder: r.sortOrder,
      dueAt: r.dueAt,
      doneAt: r.doneAt,
      game: r.gameId ? { id: r.gameId, slug: r.gameSlug!, title: r.gameTitleKo ?? r.gameTitleEn! } : null,
      shop: r.shopId ? { id: r.shopId, name: r.shopName! } : null,
      source: (r.source as SourceName | null) ?? null,
      updatedAt: r.updatedAt,
      notes: notesByTask.get(r.id) ?? [],
    });
  }
  // 끝난 칸만 최근 순으로 뒤집고 자른다 — 나머지 칸은 사람이 잡은 순서가 곧 우선순위다
  board.done = board.done
    .sort((a, b) => (b.doneAt?.getTime() ?? 0) - (a.doneAt?.getTime() ?? 0))
    .slice(0, DONE_VISIBLE_LIMIT);
  return board;
}

export interface CreateTaskInput {
  title: string;
  body?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  gameId?: string | null;
  shopId?: string | null;
  source?: SourceName | null;
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
      sortOrder: (top?.min ?? 0) - 1,
      gameId: input.gameId || null,
      shopId: input.shopId || null,
      source: input.source || null,
      ...createdBy("admin", admin.id),
    })
    .returning({ id: adminTasks.id });
  return row!.id;
}

export async function updateTask(
  id: string,
  patch: { title?: string; body?: string | null; priority?: TaskPriority; dueAt?: Date | null; gameId?: string | null },
): Promise<void> {
  const admin = await requireAdmin();
  await getDb()
    .update(adminTasks)
    .set({
      ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
      ...(patch.body !== undefined ? { body: patch.body?.trim() || null } : {}),
      ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
      ...(patch.dueAt !== undefined ? { dueAt: patch.dueAt } : {}),
      // null 은 "뗐다" 는 뜻이라 그대로 적는다 — 여기서는 수집이 아니라 사람이 쥔 값이다(§7 의 null 규칙 밖)
      ...(patch.gameId !== undefined ? { gameId: patch.gameId } : {}),
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
    .where(eq(adminTasks.status, me.status))
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

/** 끝난 일 치우기. 판을 정리하는 유일한 길이다 — 하나씩 지우면 아무도 안 치운다 */
export async function clearDone(): Promise<number> {
  await requireAdmin();
  const rows = await getDb()
    .delete(adminTasks)
    .where(and(eq(adminTasks.status, "done"), isNotNull(adminTasks.doneAt)))
    .returning({ id: adminTasks.id });
  return rows.length;
}
