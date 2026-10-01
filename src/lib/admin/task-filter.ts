// 할 일 판 거르기(2026-10-01). 주소와 거르기 조건을 오가는 규칙, 카드 한 장이 조건에 맞는지의 판단.
//
// 왜 서버에서 안 거르나: 판은 카드가 수십 장이고 getBoard 가 이미 전부 읽는다. 칩을 누를 때마다 서버에 다시
// 물으면 Neon 왕복(220ms)만 붙고 판이 깜빡인다. 거르는 일은 화면이, 상태 보관은 주소가 한다 —
// 새로고침해도, 주소를 북마크해도 같은 판이 선다. 쿠키에 두지 않는 이유는 list-scroll-jump-cookie 회차에 있다.
//
// 주소에는 **기본값과 다른 것만** 싣는다. 아무것도 안 건 판은 맨 주소(/admin/tasks)라야 메뉴 링크와 같은 화면이다.
import { TASK_CATEGORIES, type AdminTask, type TaskCategory } from "@/lib/admin/tasks";

/** 담당 기준. all 은 거르지 않는다 */
export const TASK_ASSIGNEE_SCOPES = ["all", "me", "none"] as const;
export type TaskAssigneeScope = (typeof TASK_ASSIGNEE_SCOPES)[number];

export interface TaskFilter {
  /** 내가 올린 카드를 보인다 */
  mine: boolean;
  /** 남이 올린 카드를 보인다. 올린 사람을 모르는 카드(계정이 지워졌다)도 여기 든다 */
  others: boolean;
  assignee: TaskAssigneeScope;
  /** 비어 있으면 갈래로 거르지 않는다 — "하나도 안 고름" 을 "다 숨김" 으로 읽으면 판이 텅 빈다 */
  categories: TaskCategory[];
  /** 급함 높음만 */
  urgent: boolean;
}

export const DEFAULT_TASK_FILTER: TaskFilter = { mine: true, others: true, assignee: "all", categories: [], urgent: false };

/** 주소 쿼리 이름. 짧게 둔다 — 북마크해서 다시 쓰는 주소다 */
export const TASK_FILTER_PARAM = {
  mine: "mine",
  others: "others",
  assignee: "as",
  categories: "cat",
  urgent: "urgent",
} as const;

/** 켬끔 값의 꺼짐 표기. 기본이 켬인 칸(mine, others)만 주소에 이 값으로 선다 */
const OFF = "0";
const ON = "1";
/** 갈래 여럿을 한 칸에 잇는 글자 */
const LIST_SEP = ",";

type ParamSource = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

/** 주소 쿼리를 조건으로. 모르는 값은 버리고 기본값으로 돌아간다 — 손으로 고친 주소가 판을 깨면 안 된다 */
export function parseTaskFilter(params: ParamSource): TaskFilter {
  const assignee = first(params[TASK_FILTER_PARAM.assignee]);
  const cats = (first(params[TASK_FILTER_PARAM.categories]) ?? "")
    .split(LIST_SEP)
    .filter((c): c is TaskCategory => (TASK_CATEGORIES as readonly string[]).includes(c));
  return {
    mine: first(params[TASK_FILTER_PARAM.mine]) !== OFF,
    others: first(params[TASK_FILTER_PARAM.others]) !== OFF,
    assignee: (TASK_ASSIGNEE_SCOPES as readonly string[]).includes(assignee ?? "") ? (assignee as TaskAssigneeScope) : "all",
    // 순서를 상수 순서로 맞춘다 — 같은 조건이 주소 두 개로 갈리지 않게
    categories: TASK_CATEGORIES.filter((c) => cats.includes(c)),
    urgent: first(params[TASK_FILTER_PARAM.urgent]) === ON,
  };
}

/** 조건을 주소 쿼리로. 기본값과 같은 칸은 싣지 않는다 */
export function serializeTaskFilter(f: TaskFilter): URLSearchParams {
  const q = new URLSearchParams();
  if (!f.mine) q.set(TASK_FILTER_PARAM.mine, OFF);
  if (!f.others) q.set(TASK_FILTER_PARAM.others, OFF);
  if (f.assignee !== "all") q.set(TASK_FILTER_PARAM.assignee, f.assignee);
  if (f.categories.length > 0) q.set(TASK_FILTER_PARAM.categories, f.categories.join(LIST_SEP));
  if (f.urgent) q.set(TASK_FILTER_PARAM.urgent, ON);
  return q;
}

export function isDefaultTaskFilter(f: TaskFilter): boolean {
  return serializeTaskFilter(f).size === 0;
}

/** 카드 한 장이 조건에 맞는가. 칸끼리는 전부 AND 다 */
export function matchesTaskFilter(task: Pick<AdminTask, "author" | "assignee" | "category" | "priority">, f: TaskFilter, meId: string): boolean {
  const byMe = task.author?.id === meId;
  if (byMe ? !f.mine : !f.others) return false;
  if (f.assignee === "me" && task.assignee?.id !== meId) return false;
  if (f.assignee === "none" && task.assignee) return false;
  if (f.categories.length > 0 && !f.categories.includes(task.category)) return false;
  if (f.urgent && task.priority !== "high") return false;
  return true;
}
