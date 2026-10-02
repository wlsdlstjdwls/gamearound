// 할 일 첨부를 올리는 길(브라우저 쪽) — 고른 파일 거르기, Blob 으로 올리기, 서버에 적기.
// 본문 첨부(팝업), 추가 폼, 기록 적는 칸 셋이 같이 쓴다. 화면 조각(task-attachments.tsx)과 가른 이유는
// 추가 폼과 기록 칸이 "글을 먼저 저장하고 받은 id 에 파일을 잇는" 순서를 제 액션 안에서 직접 짜야 해서다.
//
// 여러 파일은 한 개씩 차례로 올린다. 한꺼번에 보내면 수 상한 셈이 전부 "아직 비었다" 로 읽힌다(매장 사진과 같은 이유).
import { upload } from "@vercel/blob/client";
import { TASK_ATTACHMENT_MESSAGES as M } from "@/lib/admin/messages";
import { TASK_ATTACHMENT_UPLOAD_PATH } from "@/lib/routes";
import { ATTACHMENT_MAX_BYTES, attachmentPathPrefix, attachmentType } from "@/lib/admin/task-attachments";
import { registerAttachmentAction } from "@/app/(admin)/admin/tasks/actions";

const MAX_MB = ATTACHMENT_MAX_BYTES / (1024 * 1024);

/** 고른 파일을 받을 것과 못 받을 것(사유)으로 가른다. 서버도 같은 상수로 다시 막는다 — 이건 기다리기 전에 알려 주는 몫이다 */
export function checkFiles(files: Iterable<File>): { ok: File[]; errors: string[] } {
  const ok: File[] = [];
  const errors: string[] = [];
  for (const f of files) {
    if (!attachmentType(f.name)) errors.push(M.badType(f.name));
    else if (f.size > ATTACHMENT_MAX_BYTES) errors.push(M.tooBig(f.name, MAX_MB));
    else ok.push(f);
  }
  return { ok, errors };
}

/**
 * 파일들을 할 일(noteId 가 있으면 그 기록)에 붙인다. 첫 실패에서 멈추고 사유를 돌려준다 — 다 되면 null.
 * 저장 경로는 확장자만 쓴다. 한글, 공백이 든 원래 이름은 경로에서 깨지기 쉬워 표(name)에만 둔다.
 */
export async function uploadTaskFiles(
  taskId: string,
  files: File[],
  noteId: string | null,
  onProgress?: (done: number, total: number) => void,
): Promise<string | null> {
  for (let i = 0; i < files.length; i++) {
    onProgress?.(i, files.length);
    const file = files[i]!;
    const type = attachmentType(file.name);
    if (!type) return M.badType(file.name);
    try {
      const blob = await upload(`${attachmentPathPrefix(taskId)}file.${type.ext}`, file, {
        access: "public",
        handleUploadUrl: TASK_ATTACHMENT_UPLOAD_PATH,
        clientPayload: JSON.stringify({ taskId }),
        contentType: type.contentType,
      });
      const r = await registerAttachmentAction({ taskId, noteId, url: blob.url, pathname: blob.pathname, name: file.name });
      if (!r?.ok) return r?.error ?? M.failed;
    } catch (e) {
      return e instanceof Error && e.message ? e.message : M.failed;
    }
  }
  return null;
}
