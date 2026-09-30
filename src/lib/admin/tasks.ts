// 할 일 판의 낱말과 모양. **서버 전용이 아니다** — 판 UI(클라이언트)와 서비스(서버)가 같이 쓴다.
//
// 왜 서비스에서 갈랐나: 칸 목록(TASK_STATUSES)은 타입이 아니라 값이라 import 가 지워지지 않는다.
// 서비스에 두면 클라이언트 묶음이 그 파일을 통째로 끌고 오고, 거기 붙은 server-only 와 next/headers 가
// 빌드를 세운다. 값은 여기, 질의는 서비스에 둔다.
import type { SourceName } from "@/server/db/schema";

/** 판의 칸 순서. 화면이 이 순서 그대로 왼쪽부터 세운다 */
export const TASK_STATUSES = ["backlog", "todo", "doing", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["high", "normal", "low"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

/** 기록 갈래. `note` 는 사람이 적은 글, `move` 는 판이 남긴 칸 이동 자취 */
export const TASK_NOTE_KINDS = ["note", "move"] as const;
export type TaskNoteKind = (typeof TASK_NOTE_KINDS)[number];

/** 할 일에 달린 기록 한 줄. 카드를 펼치면 시각순으로 보인다 */
export interface TaskNote {
  id: string;
  kind: TaskNoteKind;
  /** 사람이 적은 글. 칸 이동 자취는 비어 있다 */
  body: string | null;
  /** 칸 이동 자취의 앞뒤 칸. 화면이 여기에 이름을 붙인다 */
  from: TaskStatus | null;
  to: TaskStatus | null;
  /** 적은 사람 */
  authorName: string | null;
  createdAt: Date;
}

/** 담당자 한 사람. 이름은 표시 이름, 없으면 이메일이다 */
export interface TaskAssignee {
  id: string;
  name: string;
}

export interface AdminTask {
  id: string;
  title: string;
  body: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  sortOrder: number;
  dueAt: Date | null;
  doneAt: Date | null;
  /** 붙인 대상. 화면은 이 값으로 바로 가는 링크를 만든다 */
  game: { id: string; slug: string; title: string } | null;
  shop: { id: string; name: string } | null;
  source: SourceName | null;
  /** 이 일을 쥔 사람. 비어 있으면 아무도 안 쥔 일이다 */
  assignee: TaskAssignee | null;
  updatedAt: Date;
  /**
   * 이 할 일에 쌓인 기록. 판 질의가 한 번에 다 읽어 온다 —
   * 카드를 펼칠 때마다 물으면 카드 수만큼 왕복이 늘고, Neon 왕복 하나가 220ms 다.
   */
  notes: TaskNote[];
}

export type Board = Record<TaskStatus, AdminTask[]>;
