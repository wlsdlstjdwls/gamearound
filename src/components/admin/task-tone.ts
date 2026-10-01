// 할 일 판의 색 규칙 한곳(2026-10-01). 카드(띠, 배지)와 거르기 줄(점), 칸 머리(점)가 같은 색으로 말해야
// "이 빨강이 저 빨강" 으로 읽힌다 — 두 곳 이상에서 쓰여 여기로 뺐다(AGENTS §3).
//
// 색은 globals.css 토큰만 쓴다. 뜻은 이렇게 갈랐다:
// - 빨강(danger)은 **급함 높음 몫**이다. 분류에는 안 쓴다 — 버그가 다 빨가면 급한 일이 묻힌다.
// - 칸 머리 점은 관리자 메뉴 배지와 같은 짝이다(할 일 호박, 처리 중 보라, admin-nav).
import type { TaskCategory, TaskPriority, TaskStatus } from "@/lib/admin/tasks";

/** 분류 배지(면 + 글자). 기본 분류(할 일)는 아무 표시도 하지 않는다 — 전부 표시하면 어느 것도 눈에 안 띈다 */
export const CATEGORY_BADGE: Record<TaskCategory, string> = {
  task: "",
  bug: "bg-warn-soft text-warn",
  idea: "bg-acc-soft text-acc",
  data: "bg-ok-soft text-ok",
  etc: "bg-surface-3 text-mut",
};

/** 분류 점과 카드 띠의 칠. 할 일은 띠를 안 긋는다(배지와 같은 이유) */
export const CATEGORY_FILL: Record<TaskCategory, string> = {
  task: "",
  bug: "bg-warn",
  idea: "bg-acc",
  data: "bg-ok",
  etc: "bg-line-strong",
};

/** 급함 배지. 보통은 표시하지 않는다 */
export const PRIORITY_BADGE: Record<TaskPriority, string> = {
  high: "bg-danger-soft text-danger",
  normal: "",
  low: "bg-surface-3 text-dim",
};

/** 급함 높음의 칠. 카드 띠에서는 분류보다 앞선다 — 급한 일이 판에서 먼저 보여야 한다 */
export const URGENT_FILL = "bg-danger";

/** 칸 머리 점 */
export const STATUS_FILL: Record<TaskStatus, string> = {
  backlog: "bg-line-strong",
  todo: "bg-warn",
  doing: "bg-acc",
  done: "bg-ok",
};

/** 카드 왼쪽 띠의 칠. 급함이 분류를 이긴다. 그을 것이 없으면 빈 문자열 */
export function cardStripe(task: { priority: TaskPriority; category: TaskCategory }): string {
  return task.priority === "high" ? URGENT_FILL : CATEGORY_FILL[task.category];
}
