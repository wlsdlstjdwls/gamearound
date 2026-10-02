"use server";
// 할 일 판 Server Action. 각 액션은 requireAdmin() 으로 role 을 재검증한다(§6) — 서비스도 한 번 더 본다.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ROUTES } from "@/lib/routes";
import { ADMIN_ACTION_MESSAGES, TASK_MESSAGES } from "@/lib/admin/messages";
import { sourceEnum } from "@/server/db/schema";
import { TASK_CATEGORIES, TASK_STATUSES } from "@/lib/admin/tasks";
import {
  addNote,
  archiveDone,
  createTask,
  deleteNote,
  deleteTask,
  moveTask,
  registerAttachment,
  removeAttachment,
  reorderTask,
  restoreTask,
  updateTask,
} from "@/server/services/admin-tasks";
import { attachmentRegisterSchema, type AttachmentRegisterInput } from "@/lib/admin/task-attachments";
import { searchShopGames } from "@/server/services/shop-games";
import type { ShopGameOptionDto } from "@/lib/shops/game-option";
import { requireAdmin } from "@/server/services/users";

/** `id` 는 방금 만든 할 일, 기록의 id 다 — 화면이 거기에 파일을 이어 붙인다(첨부, 2026-10-02) */
export type TaskActionState = { ok: true; message?: string; id?: string } | { ok: false; error: string } | null;

/** 제목 상한. 카드 한 장이 한눈에 읽혀야 하므로 길이를 화면이 아니라 여기서 막는다 */
const TITLE_MAX = 200;
const BODY_MAX = 4000;
/** 기록 한 줄의 상한. 메모보다 짧게 둔다 — 길어지면 그건 기록이 아니라 새 할 일이다 */
const NOTE_MAX = 2000;

const statusSchema = z.enum(TASK_STATUSES);
const categorySchema = z.enum(TASK_CATEGORIES);
const createSchema = z.object({
  title: z.string().trim().min(1, "할 일을 입력하세요").max(TITLE_MAX),
  body: z.string().trim().max(BODY_MAX).optional(),
  status: statusSchema.default("todo"),
  priority: z.enum(["high", "normal", "low"]).default("normal"),
  category: categorySchema.default("task"),
  // 빈 문자열은 "안 걸었다" 로 읽는다 — 폼은 빈 칸을 안 보내는 게 아니라 빈 문자열을 보낸다
  gameId: z.union([z.literal(""), z.uuid()]).optional(),
  source: z.union([z.literal(""), z.enum(sourceEnum.enumValues)]).optional(),
  assigneeId: z.union([z.literal(""), z.uuid()]).optional(),
});

function fail(e: unknown): TaskActionState {
  return { ok: false, error: e instanceof Error ? e.message : ADMIN_ACTION_MESSAGES.failed };
}

function revalidate() {
  // 지난 일 화면도 같이 — 걷기, 되돌리기, 기록이 두 화면에 함께 걸린다
  revalidatePath(ROUTES.adminTasks);
  revalidatePath(ROUTES.adminTasksArchive);
}

export async function createTaskAction(_prev: TaskActionState, form: FormData): Promise<TaskActionState> {
  try {
    await requireAdmin();
    const p = createSchema.safeParse({
      title: form.get("title"),
      body: form.get("body") ?? undefined,
      status: form.get("status") ?? undefined,
      priority: form.get("priority") ?? undefined,
      category: form.get("category") ?? undefined,
      gameId: form.get("gameId") ?? undefined,
      source: form.get("source") ?? undefined,
      assigneeId: form.get("assigneeId") ?? undefined,
    });
    if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? TASK_MESSAGES.invalid };

    const id = await createTask({
      title: p.data.title,
      body: p.data.body ?? null,
      status: p.data.status,
      priority: p.data.priority,
      category: p.data.category,
      gameId: p.data.gameId || null,
      source: p.data.source || null,
      assigneeId: p.data.assigneeId || null,
    });
    revalidate();
    return { ok: true, message: TASK_MESSAGES.created, id };
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

/** 카드 고치기 — 제목과 메모, 급함, 갈래, 게임, 담당자. 칸과 순서는 각자의 액션이 맡는다(자취를 남겨야 해서) */
export async function updateTaskAction(_prev: TaskActionState, form: FormData): Promise<TaskActionState> {
  try {
    await requireAdmin();
    const p = z
      .object({
        id: z.uuid(),
        title: z.string().trim().min(1, "할 일을 입력하세요").max(TITLE_MAX),
        body: z.string().trim().max(BODY_MAX).optional(),
        priority: z.enum(["high", "normal", "low"]).default("normal"),
        // 안 보냈으면 건드리지 않는다 — 기본값을 주면 갈래 칸이 없는 폼이 전부 "할 일" 로 되돌린다
        category: categorySchema.optional(),
        gameId: z.union([z.literal(""), z.uuid()]).optional(),
        assigneeId: z.union([z.literal(""), z.uuid()]).optional(),
      })
      .safeParse({
        id: form.get("id"),
        title: form.get("title"),
        body: form.get("body") ?? undefined,
        priority: form.get("priority") ?? undefined,
        category: form.get("category") ?? undefined,
        gameId: form.get("gameId") ?? undefined,
        assigneeId: form.get("assigneeId") ?? undefined,
      });
    if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? TASK_MESSAGES.invalid };

    await updateTask(p.data.id, {
      title: p.data.title,
      body: p.data.body ?? null,
      priority: p.data.priority,
      category: p.data.category,
      // 폼이 이 칸을 안 보냈으면 건드리지 않는다. 빈 문자열은 "뗐다" 라서 null 로 적는다
      gameId: p.data.gameId === undefined ? undefined : p.data.gameId || null,
      // 담당자도 같은 규칙이다 — 안 보냈으면 그대로, 빈 문자열이면 뗀다
      assigneeId: p.data.assigneeId === undefined ? undefined : p.data.assigneeId || null,
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
      .object({ taskId: z.uuid(), body: z.string().trim().max(NOTE_MAX), hasFiles: z.literal("1").optional() })
      .safeParse({ taskId: form.get("taskId"), body: form.get("body") ?? "", hasFiles: form.get("hasFiles") ?? undefined });
    if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? TASK_MESSAGES.invalid };
    // 글이 비어도 파일을 붙이러 온 기록이면 받는다 — 갈무리 한 장이 곧 기록인 때가 있다
    if (!p.data.body && !p.data.hasFiles) return { ok: false, error: TASK_MESSAGES.notePlaceholder };

    const id = await addNote(p.data.taskId, p.data.body);
    revalidate();
    return { ok: true, message: TASK_MESSAGES.noteAdded, id };
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

/** 끝난 일 치우기 — 판에서 걷는다(지우지 않는다). 걷은 일은 지난 일 화면에 남는다 */
export async function archiveDoneAction(): Promise<TaskActionState> {
  try {
    await requireAdmin();
    const n = await archiveDone();
    revalidate();
    return { ok: true, message: TASK_MESSAGES.archived(n) };
  } catch (e) {
    return fail(e);
  }
}

/** 걷은 일을 판(완료 칸)으로 되돌린다 */
export async function restoreTaskAction(id: string): Promise<TaskActionState> {
  try {
    await requireAdmin();
    const p = z.uuid().safeParse(id);
    if (!p.success) return { ok: false, error: TASK_MESSAGES.invalid };
    await restoreTask(p.data);
    revalidate();
    return { ok: true, message: TASK_MESSAGES.restored };
  } catch (e) {
    return fail(e);
  }
}

/** 브라우저가 Blob 으로 올린 파일을 할 일(또는 기록)에 적는다. 파일이 정말 거기 있는지는 서비스가 저장소에 묻는다 */
export async function registerAttachmentAction(input: AttachmentRegisterInput): Promise<TaskActionState> {
  try {
    await requireAdmin();
    const p = attachmentRegisterSchema.safeParse(input);
    if (!p.success) return { ok: false, error: TASK_MESSAGES.invalid };
    await registerAttachment(p.data);
    revalidate();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function removeAttachmentAction(id: string): Promise<TaskActionState> {
  try {
    await requireAdmin();
    const p = z.uuid().safeParse(id);
    if (!p.success) return { ok: false, error: TASK_MESSAGES.invalid };
    await removeAttachment(p.data);
    revalidate();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
