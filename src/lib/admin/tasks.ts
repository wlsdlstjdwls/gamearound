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
  updatedAt: Date;
}

export type Board = Record<TaskStatus, AdminTask[]>;
