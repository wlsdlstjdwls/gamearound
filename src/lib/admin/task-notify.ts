// 할 일 판 알림 글 만들기(2026-10-12). 무엇을 보낼지(사건)와 어떻게 적을지만 여기 둔다 — 보내기는 server/telegram.
// 순수 함수로 뗀 이유: 네 갈래 글 모양을 테스트로 묶어 두려고. 서버 전용 값(환경 변수, DB)은 받지 않는다.
//
// 글은 텔레그램 HTML(parse_mode HTML)이다. 제목을 굵게, 기록 본문은 인용 칸, 주소는 "카드 열기" 링크로 숨긴다 —
// 맨 주소를 그대로 두니 한 줄이 넘쳐 글 전체가 읽기 어려웠다. 사람이 친 글은 전부 이스케이프한다.
import { escapeHtml } from "@/lib/html-entities";
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

/** 항목 사이는 줄바꿈, 마디 사이는 빈 줄 하나. 텔레그램 HTML 은 <br> 을 모르고 글자 줄바꿈만 받는다 */
const LINE = "\n";
const SECTION = "\n\n";

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

/** 항목 한 줄. 이름은 굵게 해서 값과 눈으로 가른다 */
function field(label: string, value: string): string {
  return `<b>${escapeHtml(label)}</b>  ${escapeHtml(value)}`;
}

/**
 * 알림 한 통. 마디는 빈 줄로 가른다:
 * 머리(사건) / 제목(굵게) / 항목들 / 카드 열기 링크.
 */
export function formatTaskNotice(event: TaskNotifyEvent, task: TaskNotifySnapshot, actorName: string | null, link: string): string {
  const actor = actorName ?? M.unknownPerson;
  let head: string;
  let body: string[];
  switch (event.kind) {
    case "created":
      head = M.created;
      body = [
        field(M.category, TASK_CATEGORY_LABEL[task.category]),
        field(M.priority, TASK_PRIORITY_LABEL[task.priority]),
        field(M.assignee, assigneeText(task)),
        field(M.createdBy, actor),
      ];
      break;
    case "assigned":
      head = M.assigned;
      body = [field(M.assignee, assigneeText(task)), field(M.changedBy, actor)];
      break;
    case "moved":
      head = M.moved;
      body = [
        field(M.status, M.movedValue(TASK_STATUS_LABEL[event.from], TASK_STATUS_LABEL[event.to], TASK_STATUS_TO_PARTICLE[event.to])),
        field(M.changedBy, actor),
      ];
      break;
    case "note":
      head = M.note;
      body = [
        `<blockquote>${escapeHtml(event.body?.trim() ? preview(event.body) : M.noteFilesOnly)}</blockquote>`,
        field(M.noteBy, actor),
      ];
      break;
  }
  const title = `<b>${escapeHtml(task.title)}</b>`;
  const open = `<a href="${escapeHtml(link)}">${escapeHtml(M.openCard)}</a>`;
  return [head, title, body.join(LINE), open].join(SECTION);
}
