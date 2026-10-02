// 관리자 할 일 판 서비스 — 읽기 쪽(판 한 장, 지난 일, 담당자 후보). 쓰기는 mutations.ts.
// 300줄을 넘어 갈랐다(담당자 축, 2026-09-30). 호출부는 폴더의 index.ts 로 그대로 들어온다.
//
// 화면까지 Drizzle 행을 흘리지 않는다(AGENTS §1) — 판은 붙인 대상(게임, 매장)의 이름까지 보여 줘야 하는데
// 그건 행에 없는 값이라, DTO 를 만드는 자리가 어차피 필요하다.
import "server-only";
import { asc, desc, eq, inArray, isNotNull, isNull, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/server/db/client";
import { adminTaskAttachments, adminTaskNotes, adminTaskReads, adminTasks, games, shops, users, type SourceName } from "@/server/db/schema";
import { requireAdmin } from "@/server/services/users";
import type { AdminTask, ArchivedTask, Board, TaskAssignee, TaskAttachment, TaskNote } from "@/lib/admin/tasks";

/**
 * 담당자 이름. 표시 이름이 비었으면 이메일을 쓴다 — 빈 칸으로 두면 "담당 없음" 과 구별이 안 된다.
 * 기록의 적은 사람도 같은 규칙이다.
 */
const personName = (name: string | null, email: string | null): string | null => name?.trim() || email || null;

/** 담당자 조인용 별칭. 판 질의에서 users 가 "적은 사람" 이 아니라 "쥔 사람" 이라는 것을 이름으로 드러낸다 */
const assignee = alias(users, "assignee");
/** 올린 사람 조인용 별칭. created_by 를 잇는다(감사 컬럼). 기록의 적은 사람과는 다른 조인이다 */
const author = alias(users, "author");

/**
 * 끝난 일은 최근 것만 판에 남긴다. 판은 "지금 무엇을 하나" 를 보는 자리고,
 * 끝난 일이 무한히 쌓이면 그 칸이 판에서 제일 긴 칸이 되어 나머지를 화면 밖으로 민다.
 */
export const DONE_VISIBLE_LIMIT = 20;

function emptyBoard(): Board {
  return { backlog: [], todo: [], doing: [], done: [] };
}

/**
 * 걷은 일은 최근 것만 읽는다. "지난 일" 은 찾아보는 자리라 끝없이 늘어놓을 까닭이 없고,
 * 기록까지 한 번에 읽으므로 상한이 없으면 질의 하나가 해마다 무거워진다. 판 쓰는 사람이 둘이라 석 달치쯤 된다.
 */
export const ARCHIVE_VISIBLE_LIMIT = 100;

/**
 * 할 일 여럿과 그 기록을 DTO 로. 판과 지난 일 화면이 같이 쓴다 — 두 화면이 카드 한 장을 다른 모양으로 만들면
 * 지난 일에서 연 카드만 담당자나 게임이 빠지는 식으로 어긋난다.
 *
 * 기록은 두 번째 질의로 한꺼번에 읽어 **나란히** 보낸다(Promise.all). 카드를 펼칠 때마다 물으면
 * 카드 수만큼 왕복이 늘고, Neon 왕복 하나가 220ms 다(neon-roundtrip-cost). 줄 세우지 않으므로
 * 화면이 기다리는 시간은 여전히 왕복 한 번이다. 기록 질의도 같은 조건(걷었나)으로 할 일과 이어 거른다 —
 * 판이 걷은 일의 기록까지 끌고 오지 않게.
 */
async function readTasks(where: SQL, order: SQL[], limit?: number): Promise<(AdminTask & { archivedAt: Date | null })[]> {
  const db = getDb();
  const taskQuery = db
    .select({
      id: adminTasks.id,
      title: adminTasks.title,
      body: adminTasks.body,
      status: adminTasks.status,
      priority: adminTasks.priority,
      category: adminTasks.category,
      sortOrder: adminTasks.sortOrder,
      dueAt: adminTasks.dueAt,
      doneAt: adminTasks.doneAt,
      archivedAt: adminTasks.archivedAt,
      source: adminTasks.source,
      updatedAt: adminTasks.updatedAt,
      gameId: games.id,
      gameSlug: games.slug,
      gameTitleKo: games.titleKo,
      gameTitleEn: games.titleEn,
      shopId: shops.id,
      shopName: shops.name,
      assigneeId: assignee.id,
      assigneeName: assignee.displayName,
      assigneeEmail: assignee.email,
      authorId: author.id,
      authorName: author.displayName,
      authorEmail: author.email,
    })
    .from(adminTasks)
    .leftJoin(games, eq(games.id, adminTasks.gameId))
    .leftJoin(shops, eq(shops.id, adminTasks.shopId))
    .leftJoin(assignee, eq(assignee.id, adminTasks.assigneeId))
    .leftJoin(author, eq(author.id, adminTasks.createdBy))
    .where(where)
    .orderBy(...order);

  // 기록은 할 일과 같은 조건으로 거른다. 상한이 있는 쪽(지난 일)은 할 일 id 를 먼저 알아야 해서 줄 세운다 —
  // 상한 없이 기록을 다 읽는 것보다 왕복 하나가 싸다(걷은 일의 기록은 해마다 쌓인다)
  const noteQuery = (ids?: string[]) =>
    db
      .select({
        id: adminTaskNotes.id,
        taskId: adminTaskNotes.taskId,
        kind: adminTaskNotes.kind,
        body: adminTaskNotes.body,
        fromStatus: adminTaskNotes.fromStatus,
        toStatus: adminTaskNotes.toStatus,
        createdAt: adminTaskNotes.createdAt,
        authorId: adminTaskNotes.createdBy,
        authorName: users.displayName,
        authorEmail: users.email,
      })
      .from(adminTaskNotes)
      .innerJoin(adminTasks, eq(adminTasks.id, adminTaskNotes.taskId))
      .leftJoin(users, eq(users.id, adminTaskNotes.createdBy))
      .where(ids ? inArray(adminTaskNotes.taskId, ids) : where)
      .orderBy(asc(adminTaskNotes.createdAt));

  // 첨부도 기록과 같은 방식이다 — 본문 것과 기록 것을 한 번에 읽어 코드에서 가른다
  const fileQuery = (ids?: string[]) =>
    db
      .select({
        id: adminTaskAttachments.id,
        taskId: adminTaskAttachments.taskId,
        noteId: adminTaskAttachments.noteId,
        url: adminTaskAttachments.url,
        name: adminTaskAttachments.name,
        contentType: adminTaskAttachments.contentType,
        size: adminTaskAttachments.byteSize,
      })
      .from(adminTaskAttachments)
      .innerJoin(adminTasks, eq(adminTasks.id, adminTaskAttachments.taskId))
      .where(ids ? inArray(adminTaskAttachments.taskId, ids) : where)
      .orderBy(asc(adminTaskAttachments.createdAt));

  let rows: Awaited<typeof taskQuery>;
  let noteRows: Awaited<ReturnType<typeof noteQuery>>;
  let fileRows: Awaited<ReturnType<typeof fileQuery>>;
  if (limit === undefined) {
    [rows, noteRows, fileRows] = await Promise.all([taskQuery, noteQuery(), fileQuery()]);
  } else {
    rows = await taskQuery.limit(limit);
    const ids = rows.map((r) => r.id);
    [noteRows, fileRows] = ids.length > 0 ? await Promise.all([noteQuery(ids), fileQuery(ids)]) : [[], []];
  }

  // 파일을 붙은 자리(본문이면 할 일, 기록이면 그 기록)로 가른다
  const filesByTask = new Map<string, TaskAttachment[]>();
  const filesByNote = new Map<string, TaskAttachment[]>();
  for (const { taskId, noteId, ...file } of fileRows) {
    const [map, key] = noteId ? [filesByNote, noteId] : [filesByTask, taskId];
    const list = map.get(key) ?? [];
    list.push(file);
    map.set(key, list);
  }

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
      authorId: n.authorId,
      authorName: personName(n.authorName, n.authorEmail),
      createdAt: n.createdAt,
      attachments: filesByNote.get(n.id) ?? [],
    });
    notesByTask.set(n.taskId, list);
  }

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    status: r.status,
    priority: r.priority,
    category: r.category,
    sortOrder: r.sortOrder,
    dueAt: r.dueAt,
    doneAt: r.doneAt,
    archivedAt: r.archivedAt,
    game: r.gameId ? { id: r.gameId, slug: r.gameSlug!, title: r.gameTitleKo ?? r.gameTitleEn! } : null,
    shop: r.shopId ? { id: r.shopId, name: r.shopName! } : null,
    source: (r.source as SourceName | null) ?? null,
    assignee: r.assigneeId ? { id: r.assigneeId, name: personName(r.assigneeName, r.assigneeEmail)! } : null,
    author: r.authorId ? { id: r.authorId, name: personName(r.authorName, r.authorEmail)! } : null,
    updatedAt: r.updatedAt,
    notes: notesByTask.get(r.id) ?? [],
    attachments: filesByTask.get(r.id) ?? [],
  }));
}

/** 판 한 장. 질의 한 번으로 네 칸을 다 읽고 코드에서 가른다 — 칸마다 물으면 왕복이 넷이 된다. 걷은 일은 빠진다 */
export async function getBoard(): Promise<{ board: Board; asOf: number; seen: Record<string, number> }> {
  const admin = await requireAdmin();
  // 내가 카드마다 마지막으로 연 때 — 카드의 "새 기록" 셈 기준이다. 판 질의와 나란히 읽는다(왕복을 줄 세우지 않는다)
  const [tasks, reads] = await Promise.all([
    readTasks(isNull(adminTasks.archivedAt), [asc(adminTasks.sortOrder), asc(adminTasks.createdAt)]),
    getDb().select({ taskId: adminTaskReads.taskId, seenAt: adminTaskReads.seenAt }).from(adminTaskReads).where(eq(adminTaskReads.userId, admin.id)),
  ]);
  const board = emptyBoard();
  for (const t of tasks) board[t.status].push(t);
  // 끝난 칸만 최근 순으로 뒤집고 자른다 — 나머지 칸은 사람이 잡은 순서가 곧 우선순위다
  board.done = board.done
    .sort((a, b) => (b.doneAt?.getTime() ?? 0) - (a.doneAt?.getTime() ?? 0))
    .slice(0, DONE_VISIBLE_LIMIT);
  // 읽은 시각을 같이 준다 — 카드의 "3일 전" 기준이다. 렌더 안에서 Date.now() 를 부르면 렌더가 순수하지 않다(수집 현황의 asOf 와 같은 방식)
  return { board, asOf: Date.now(), seen: Object.fromEntries(reads.map((r) => [r.taskId, r.seenAt.getTime()])) };
}

/** 지난 일 — 판에서 걷은 할 일. 걷은 때 최근 순이다(찾으러 오는 건 대개 방금 걷은 것이다) */
export async function listArchived(): Promise<ArchivedTask[]> {
  await requireAdmin();
  const tasks = await readTasks(isNotNull(adminTasks.archivedAt), [desc(adminTasks.archivedAt), desc(adminTasks.doneAt)], ARCHIVE_VISIBLE_LIMIT);
  return tasks.map((t) => ({ ...t, archivedAt: t.archivedAt! }));
}

/**
 * 담당자로 고를 수 있는 사람 — 관리자 계정 전부. 판은 관리자 화면이라 다른 사람에게 줄 일이 없다.
 * 이름순이다. 한둘뿐인 목록이라 캐시를 걸지 않는다(판 질의와 나란히 읽는다).
 */
export async function listAssignees(): Promise<TaskAssignee[]> {
  await requireAdmin();
  const rows = await getDb()
    .select({ id: users.id, name: users.displayName, email: users.email })
    .from(users)
    .where(eq(users.role, "admin"))
    .orderBy(asc(users.displayName), asc(users.email));
  return rows.map((r) => ({ id: r.id, name: personName(r.name, r.email)! }));
}
