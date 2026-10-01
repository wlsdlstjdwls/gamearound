// 관리자 할 일 판 서비스 — 읽기 쪽(판 한 장, 담당자 후보). 쓰기는 mutations.ts.
// 300줄을 넘어 갈랐다(담당자 축, 2026-09-30). 호출부는 폴더의 index.ts 로 그대로 들어온다.
//
// 화면까지 Drizzle 행을 흘리지 않는다(AGENTS §1) — 판은 붙인 대상(게임, 매장)의 이름까지 보여 줘야 하는데
// 그건 행에 없는 값이라, DTO 를 만드는 자리가 어차피 필요하다.
import "server-only";
import { asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/server/db/client";
import { adminTaskNotes, adminTasks, games, shops, users, type SourceName } from "@/server/db/schema";
import { requireAdmin } from "@/server/services/users";
import type { Board, TaskAssignee, TaskNote } from "@/lib/admin/tasks";

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
      category: adminTasks.category,
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
      authorName: personName(n.authorName, n.authorEmail),
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
      category: r.category,
      sortOrder: r.sortOrder,
      dueAt: r.dueAt,
      doneAt: r.doneAt,
      game: r.gameId ? { id: r.gameId, slug: r.gameSlug!, title: r.gameTitleKo ?? r.gameTitleEn! } : null,
      shop: r.shopId ? { id: r.shopId, name: r.shopName! } : null,
      source: (r.source as SourceName | null) ?? null,
      assignee: r.assigneeId ? { id: r.assigneeId, name: personName(r.assigneeName, r.assigneeEmail)! } : null,
      author: r.authorId ? { id: r.authorId, name: personName(r.authorName, r.authorEmail)! } : null,
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
