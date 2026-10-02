// 할 일 첨부 — 등록, 지우기, 할 일과 기록을 지울 때 파일 같이 치우기. 읽기는 board.ts 가 판과 한 번에 한다.
//
// 파일은 Vercel Blob(공개 저장소)에 있다. 업로드는 브라우저가 Blob 으로 곧장 보낸다
// (api/admin/tasks/attachments/upload 가 토큰만 내준다). 그래서 등록할 때 **파일이 정말 우리 저장소의
// 이 할 일 경로에 있는지** head 로 한 번 본다 — 브라우저가 보낸 주소를 그대로 믿으면 아무 주소나 첨부로 적힌다.
//
// 공개 저장소인 이유: 이 프로젝트의 Blob 저장소가 하나(공개)고, 주소 끝에 무작위 꼬리가 붙어 추측할 수 없다.
// 주소를 아는 사람은 관리자뿐이다(판은 관리자만 연다). 비밀번호, 키 같은 것은 첨부하지 않는다.
import "server-only";
import { head } from "@vercel/blob";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { adminTaskAttachments, adminTaskNotes, adminTasks } from "@/server/db/schema";
import { createdBy } from "@/server/db/audit";
import { deleteBlobs } from "@/server/services/blob-files";
import { requireAdmin } from "@/server/services/users";
import { TASK_ATTACHMENT_MESSAGES as M } from "@/lib/admin/messages";
import {
  ATTACHMENT_CONTENT_TYPES,
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MAX_PER_TASK,
  isOwnAttachmentPath,
  type AttachmentRegisterInput,
} from "@/lib/admin/task-attachments";

export async function taskExists(taskId: string): Promise<boolean> {
  const rows = await getDb().select({ id: adminTasks.id }).from(adminTasks).where(eq(adminTasks.id, taskId)).limit(1);
  return rows.length > 0;
}

export async function countAttachments(taskId: string): Promise<number> {
  const rows = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(adminTaskAttachments)
    .where(eq(adminTaskAttachments.taskId, taskId));
  return rows[0]?.n ?? 0;
}

/**
 * 올린 파일을 적는다. 수 상한은 토큰 발급 때도 보지만 여기서 다시 본다 —
 * 여러 파일의 토큰을 먼저 받아 두고 한꺼번에 올리면 발급 때의 셈은 전부 "아직 비었다" 다.
 */
export async function registerAttachment(input: AttachmentRegisterInput): Promise<void> {
  const admin = await requireAdmin();
  if (!isOwnAttachmentPath(input.pathname, input.taskId)) throw new Error(M.forbidden);
  if (!(await taskExists(input.taskId))) throw new Error(M.forbidden);
  if (input.noteId) {
    // 남의 할 일의 기록에 붙이는 길을 막는다
    const note = await getDb()
      .select({ id: adminTaskNotes.id })
      .from(adminTaskNotes)
      .where(and(eq(adminTaskNotes.id, input.noteId), eq(adminTaskNotes.taskId, input.taskId)))
      .limit(1);
    if (note.length === 0) throw new Error(M.forbidden);
  }

  // 우리 저장소 토큰으로 묻는다 — 남의 주소면 여기서 떨어진다
  const blob = await head(input.pathname).catch(() => null);
  if (!blob || blob.url !== input.url || !ATTACHMENT_CONTENT_TYPES.includes(blob.contentType) || blob.size > ATTACHMENT_MAX_BYTES) {
    if (blob) await deleteBlobs([blob.url]);
    throw new Error(M.failed);
  }
  if ((await countAttachments(input.taskId)) >= ATTACHMENT_MAX_PER_TASK) {
    // 상한을 넘긴 파일은 적지 않고 저장소에서도 치운다
    await deleteBlobs([blob.url]);
    throw new Error(M.full(ATTACHMENT_MAX_PER_TASK));
  }

  await getDb()
    .insert(adminTaskAttachments)
    .values({
      taskId: input.taskId,
      noteId: input.noteId,
      url: blob.url,
      pathname: blob.pathname,
      name: input.name,
      contentType: blob.contentType,
      byteSize: blob.size,
      ...createdBy("admin", admin.id),
    });
}

/** 파일 하나 지우기. 행을 지운 뒤 저장소 파일도 지운다 */
export async function removeAttachment(id: string): Promise<void> {
  await requireAdmin();
  const rows = await getDb()
    .delete(adminTaskAttachments)
    .where(eq(adminTaskAttachments.id, id))
    .returning({ url: adminTaskAttachments.url });
  await deleteBlobs(rows.map((r) => r.url));
}

/**
 * 할 일이나 기록을 지우기 **전에** 부른다 — cascade 가 행은 지우지만 파일은 못 지운다.
 * 주소를 먼저 모아야 하는 이유: 행이 지워진 뒤에는 어느 파일이었는지 물을 곳이 없다.
 */
export async function attachmentUrls(by: { taskId: string } | { noteId: string }): Promise<string[]> {
  const rows = await getDb()
    .select({ url: adminTaskAttachments.url })
    .from(adminTaskAttachments)
    .where("taskId" in by ? eq(adminTaskAttachments.taskId, by.taskId) : eq(adminTaskAttachments.noteId, by.noteId));
  return rows.map((r) => r.url);
}
