// 할 일 판 거르기(2026-10-01). 주소와 거르기 조건을 오가는 규칙, 카드 한 장이 조건에 맞는지의 판단.
//
// 왜 서버에서 안 거르나: 판은 카드가 수십 장이고 getBoard 가 이미 전부 읽는다. 칩을 누를 때마다 서버에 다시
// 물으면 Neon 왕복(220ms)만 붙고 판이 깜빡인다. 거르는 일은 화면이, 상태 보관은 주소가 한다 —
// 새로고침해도, 주소를 북마크해도 같은 판이 선다. 쿠키에 두지 않는 이유는 list-scroll-jump-cookie 회차에 있다.
//
// **칸이 셋뿐인 이유**(같은 날 2차, 사용자: "사용하기에는 복잡해서 불편하진 않으려나"): 1차는 올린 사람 켬끔 둘,
// 담당 셋, 분류 다섯, 급함 — 칩 열둘이었다. 올린 사람과 담당은 둘 다 "내 일인가 남의 일인가" 를 묻는데
// 그걸 두 줄로 물어 사람이 머리로 조합해야 했다. 지금은 보기 하나(하나만 고른다), 분류 하나, 급함 하나다.
// 담당 없음 보기는 뺐다 — 판을 쓰는 사람이 둘이라 찾을 일이 드물다.
//
// 주소에는 **기본값과 다른 것만** 싣는다. 아무것도 안 건 판은 맨 주소(/admin/tasks)라야 메뉴 링크와 같은 화면이다.
import { TASK_CATEGORIES, type AdminTask, type TaskCategory } from "@/lib/admin/tasks";

/** 보기. 칩 순서가 곧 이 순서다. all 은 거르지 않는다 */
export const TASK_VIEWS = ["all", "assigned", "mine", "others"] as const;
export type TaskView = (typeof TASK_VIEWS)[number];

export interface TaskFilter {
  /** assigned = 내 담당, mine = 내가 올린, others = 남이 올린(올린 사람을 모르는 카드도 여기 든다) */
  view: TaskView;
  /** null 이면 분류로 거르지 않는다 */
  category: TaskCategory | null;
  /** 급함 높음만 */
  urgent: boolean;
}

export const DEFAULT_TASK_FILTER: TaskFilter = { view: "all", category: null, urgent: false };

/** 주소 쿼리 이름. 짧게 둔다 — 북마크해서 다시 쓰는 주소다 */
export const TASK_FILTER_PARAM = { view: "view", category: "cat", urgent: "urgent" } as const;

/** 급함만 켬의 표기 */
const ON = "1";

type ParamSource = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);
const oneOf = <T extends string>(list: readonly T[], v: string | undefined): T | undefined => list.find((x) => x === v);

/** 주소 쿼리를 조건으로. 모르는 값은 버리고 기본값으로 돌아간다 — 손으로 고친 주소가 판을 깨면 안 된다 */
export function parseTaskFilter(params: ParamSource): TaskFilter {
  return {
    view: oneOf(TASK_VIEWS, first(params[TASK_FILTER_PARAM.view])) ?? "all",
    category: oneOf(TASK_CATEGORIES, first(params[TASK_FILTER_PARAM.category])) ?? null,
    urgent: first(params[TASK_FILTER_PARAM.urgent]) === ON,
  };
}

/** 조건을 주소 쿼리로. 기본값과 같은 칸은 싣지 않는다 */
export function serializeTaskFilter(f: TaskFilter): URLSearchParams {
  const q = new URLSearchParams();
  if (f.view !== "all") q.set(TASK_FILTER_PARAM.view, f.view);
  if (f.category) q.set(TASK_FILTER_PARAM.category, f.category);
  if (f.urgent) q.set(TASK_FILTER_PARAM.urgent, ON);
  return q;
}

export function isDefaultTaskFilter(f: TaskFilter): boolean {
  return serializeTaskFilter(f).size === 0;
}

/** 카드 한 장이 조건에 맞는가. 칸끼리는 전부 AND 다 */
export function matchesTaskFilter(task: Pick<AdminTask, "author" | "assignee" | "category" | "priority">, f: TaskFilter, meId: string): boolean {
  if (f.view === "assigned" && task.assignee?.id !== meId) return false;
  if (f.view === "mine" && task.author?.id !== meId) return false;
  if (f.view === "others" && task.author?.id === meId) return false;
  if (f.category && task.category !== f.category) return false;
  if (f.urgent && task.priority !== "high") return false;
  return true;
}

/** 거르기 칩 옆 건수. 칸마다 다른 칸을 기본값으로 두고 센다 — "내 담당 3" 은 지금 걸린 분류와 상관없이 내 몫 전체다 */
export interface TaskFilterCounts {
  views: Record<TaskView, number>;
  categories: Record<TaskCategory, number>;
  urgent: number;
}

export function countTaskFilters(tasks: Pick<AdminTask, "author" | "assignee" | "category" | "priority">[], meId: string): TaskFilterCounts {
  const count = (f: TaskFilter) => tasks.filter((t) => matchesTaskFilter(t, f, meId)).length;
  return {
    views: Object.fromEntries(TASK_VIEWS.map((view) => [view, count({ ...DEFAULT_TASK_FILTER, view })])) as Record<TaskView, number>,
    categories: Object.fromEntries(TASK_CATEGORIES.map((category) => [category, count({ ...DEFAULT_TASK_FILTER, category })])) as Record<
      TaskCategory,
      number
    >,
    urgent: count({ ...DEFAULT_TASK_FILTER, urgent: true }),
  };
}
