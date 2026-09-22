"use server";
// 할 일 판 Server Action. 각 액션은 requireAdmin() 으로 role 을 재검증한다(§6) — 서비스도 한 번 더 본다.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ROUTES } from "@/lib/routes";
import { ADMIN_ACTION_MESSAGES, TASK_MESSAGES } from "@/lib/admin/messages";
import { sourceEnum } from "@/server/db/schema";
import { TASK_STATUSES } from "@/lib/admin/tasks";
import { addNote, clearDone, createTask, deleteNote, deleteTask, moveTask, reorderTask, updateTask } from "@/server/services/admin-tasks";
import { searchShopGames } from "@/server/services/shop-games";
import type { ShopGameOptionDto } from "@/lib/shops/game-option";
import { requireAdmin } from "@/server/services/users";

export type TaskActionState = { ok: true; message?: string } | { ok: false; error: string } | null;

/** 제목 상한. 카드 한 장이 한눈에 읽혀야 하므로 길이를 화면이 아니라 여기서 막는다 */
const TITLE_MAX = 200;
const BODY_MAX = 4000;
/** 기록 한 줄의 상한. 메모보다 짧게 둔다 — 길어지면 그건 기록이 아니라 새 할 일이다 */
const NOTE_MAX = 2000;

const statusSchema = z.enum(TASK_STATUSES);
const createSchema = z.object({
  title: z.string().trim().min(1, "할 일을 입력하세요").max(TITLE_MAX),
  body: z.string().trim().max(BODY_MAX).optional(),
  status: statusSchema.default("todo"),
  priority: z.enum(["high", "normal", "low"]).default("normal"),
  // 빈 문자열은 "안 걸었다" 로 읽는다 — 폼은 빈 칸을 안 보내는 게 아니라 빈 문자열을 보낸다
  gameId: z.union([z.literal(""), z.uuid()]).optional(),
  source: z.union([z.literal(""), z.enum(sourceEnum.enumValues)]).optional(),
});

function fail(e: unknown): TaskActionState {
  return { ok: false, error: e instanceof Error ? e.message : ADMIN_ACTION_MESSAGES.failed };
}

function revalidate() {
  revalidatePath(ROUTES.adminTasks);
}

export async function createTaskAction(_prev: TaskActionState, form: FormData): Promise<TaskActionState> {
  try {
    await requireAdmin();
    const p = createSchema.safeParse({
      title: form.get("title"),
      body: form.get("body") ?? undefined,
      status: form.get("status") ?? undefined,
      priority: form.get("priority") ?? undefined,
      gameId: form.get("gameId") ?? undefined,
      source: form.get("source") ?? undefined,
    });
    if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? TASK_MESSAGES.invalid };

    await createTask({
      title: p.data.title,
      body: p.data.body ?? null,
      status: p.data.status,
      priority: p.data.priority,
      gameId: p.data.gameId || null,
      source: p.data.source || null,
    });
    revalidate();
    return { ok: true, message: TASK_MESSAGES.created };
  } catch (e) {
    return fail(e);
  }
}

export async function moveTaskAction(id: string, to: string): Promise<TaskActionState> {
  try {
    await requireAdmin();
    const p = z.object({ id: z.uuid(), to: statusSchema }).safeParse({ id, to });
    if (!p.success) return { ok: false, error: TASK_MESSAGES.invalid };
    await moveTask(p.data.id, p.data.to);
    revalidate();
    return { ok: true, message: TASK_MESSAGES.moved };
  } catch (e) {
    return fail(e);
  }
}

export async function reorderTaskAction(id: string, dir: string): Promise<TaskActionState> {
  try {
    await requireAdmin();
    const p = z.object({ id: z.uuid(), dir: z.enum(["up", "down"]) }).safeParse({ id, dir });
    if (!p.success) return { ok: false, error: TASK_MESSAGES.invalid };
    await reorderTask(p.data.id, p.data.dir);
    revalidate();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteTaskAction(id: string): Promise<TaskActionState> {
  try {
    await requireAdmin();
    const p = z.uuid().safeParse(id);
    if (!p.success) return { ok: false, error: TASK_MESSAGES.invalid };
    await deleteTask(p.data);
    revalidate();
    return { ok: true, message: TASK_MESSAGES.removed };
  } catch (e) {
    return fail(e);
  }
}

/** 카드 고치기 — 제목과 메모, 급함만. 칸과 순서는 각자의 액션이 맡는다(자취를 남겨야 해서) */
export async function updateTaskAction(_prev: TaskActionState, form: FormData): Promise<TaskActionState> {
  try {
    await requireAdmin();
    const p = z
      .object({
        id: z.uuid(),
        title: z.string().trim().min(1, "할 일을 입력하세요").max(TITLE_MAX),
        body: z.string().trim().max(BODY_MAX).optional(),
        priority: z.enum(["high", "normal", "low"]).default("normal"),
        gameId: z.union([z.literal(""), z.uuid()]).optional(),
      })
      .safeParse({
        id: form.get("id"),
        title: form.get("title"),
        body: form.get("body") ?? undefined,
        priority: form.get("priority") ?? undefined,
        gameId: form.get("gameId") ?? undefined,
      });
    if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? TASK_MESSAGES.invalid };

    await updateTask(p.data.id, {
      title: p.data.title,
      body: p.data.body ?? null,
      priority: p.data.priority,
      // 폼이 이 칸을 안 보냈으면 건드리지 않는다. 빈 문자열은 "뗐다" 라서 null 로 적는다
      gameId: p.data.gameId === undefined ? undefined : p.data.gameId || null,
    });
    revalidate();
    return { ok: true, message: TASK_MESSAGES.saved };
  } catch (e) {
    return fail(e);
  }
}

export async function addNoteAction(_prev: TaskActionState, form: FormData): Promise<TaskActionState> {
  try {
    await requireAdmin();
    const p = z
      .object({ taskId: z.uuid(), body: z.string().trim().min(1, TASK_MESSAGES.notePlaceholder).max(NOTE_MAX) })
      .safeParse({ taskId: form.get("taskId"), body: form.get("body") });
    if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? TASK_MESSAGES.invalid };

    await addNote(p.data.taskId, p.data.body);
    revalidate();
    return { ok: true, message: TASK_MESSAGES.noteAdded };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteNoteAction(id: string): Promise<TaskActionState> {
  try {
    await requireAdmin();
    const p = z.uuid().safeParse(id);
    if (!p.success) return { ok: false, error: TASK_MESSAGES.invalid };
    await deleteNote(p.data);
    revalidate();
    return { ok: true, message: TASK_MESSAGES.noteRemoved };
  } catch (e) {
    return fail(e);
  }
}

/**
 * 붙일 게임 찾기. 매장 상품 폼과 같은 질의를 쓴다(searchShopGames) —
 * 관리자가 붙이려는 대상은 손님 목록에서 걸러진 행(임시, 일본판, DLC)일 때가 많고,
 * `services/games` 쪽은 전부 mainGamesOnly() 를 거쳐 그런 행을 영영 안 보여 준다.
 */
export async function searchTaskGamesAction(term: string): Promise<ShopGameOptionDto[]> {
  await requireAdmin();
  const q = term.trim();
  if (q.length < 2) return [];
  return searchShopGames(q);
}

export async function clearDoneAction(): Promise<TaskActionState> {
  try {
    await requireAdmin();
    const n = await clearDone();
    revalidate();
    return { ok: true, message: `${n}건을 치웠어요` };
  } catch (e) {
    return fail(e);
  }
}
