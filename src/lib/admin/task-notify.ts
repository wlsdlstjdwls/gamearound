// 할 일 판 알림 글 만들기(2026-10-12). 무엇을 보낼지(사건)와 어떻게 적을지만 여기 둔다 — 보내기는 server/telegram.
// 순수 함수로 뗀 이유: 네 갈래 글 모양을 테스트로 묶어 두려고. 서버 전용 값(환경 변수, DB)은 받지 않는다.
import type { TaskCategory, TaskPriority, TaskStatus } from "@/lib/admin/tasks";
import {
  TASK_CATEGORY_LABEL,
  TASK_MESSAGES,
  TASK_NOTIFY_MESSAGES as M,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  TASK_STATUS_TO_PARTICLE,
} from "@/lib/admin/messages/tasks";

/** 기록 알림에 싣는 본문 길이. 채널은 미리보기 자리다 — 다 읽으려면 카드를 연다 */
export const TASK_NOTIFY_NOTE_PREVIEW = 300;

/** 알릴 사건. 사용자가 고른 넷(2026-10-12): 새 카드, 담당자 지정, 상태 변경, 기록 추가 */
export type TaskNotifyEvent =
  | { kind: "created" }
  | { kind: "assigned" }
  | { kind: "moved"; from: TaskStatus; to: TaskStatus }
  | { kind: "note"; body: string | null };

/** 글에 필요한 카드 모습. 서비스가 사건 직후의 값을 읽어 채운다 */
export interface TaskNotifySnapshot {
  title: string;
  category: TaskCategory;
  priority: TaskPriority;
  assigneeName: string | null;
  assignedAll: boolean;
}

function assigneeText(t: TaskNotifySnapshot): string {
  if (t.assignedAll) return TASK_MESSAGES.assigneeAll;
  return t.assigneeName ?? TASK_MESSAGES.assigneeNone;
}

function preview(body: string): string {
  const s = body.trim();
  return s.length > TASK_NOTIFY_NOTE_PREVIEW ? `${s.slice(0, TASK_NOTIFY_NOTE_PREVIEW)}...` : s;
}

/** 알림 한 통. 첫 줄은 꼬리표와 제목, 끝줄은 카드 주소다 */
export function formatTaskNotice(event: TaskNotifyEvent, task: TaskNotifySnapshot, actorName: string | null, link: string): string {
  const actor = M.actor(actorName ?? M.unknownPerson);
  const lines: string[] = [];
  switch (event.kind) {
    case "created":
      lines.push(`${M.created} ${task.title}`, M.meta(TASK_CATEGORY_LABEL[task.category], TASK_PRIORITY_LABEL[task.priority]), M.assignee(assigneeText(task)), actor);
      break;
    case "assigned":
      lines.push(`${M.assigned} ${task.title}`, M.assignee(assigneeText(task)), actor);
      break;
    case "moved":
      lines.push(
        `${M.moved} ${task.title}`,
        M.movedLine(TASK_STATUS_LABEL[event.from], TASK_STATUS_LABEL[event.to], TASK_STATUS_TO_PARTICLE[event.to]),
        actor,
      );
      break;
    case "note":
      lines.push(`${M.note} ${task.title}`, event.body?.trim() ? preview(event.body) : M.noteFilesOnly, actor);
      break;
  }
  lines.push(link);
  return lines.join("\n");
}
