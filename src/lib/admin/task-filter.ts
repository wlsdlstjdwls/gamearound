// 할 일 판 거르기(2026-10-01). 주소와 거르기 조건을 오가는 규칙, 카드 한 장이 조건에 맞는지의 판단.
//
// 왜 서버에서 안 거르나: 판은 카드가 수십 장이고 getBoard 가 이미 전부 읽는다. 칩을 누를 때마다 서버에 다시
// 물으면 Neon 왕복(220ms)만 붙고 판이 깜빡인다. 거르는 일은 화면이, 상태 보관은 주소가 한다 —
// 새로고침해도, 주소를 북마크해도 같은 판이 선다.
//
// **마지막 조건은 쿠키에도 남긴다**(같은 날 4차, 사용자: "한번 고르면 다시 접속해도 유지"). 메뉴의 맨 주소로 들어와도
// 지난 조건이 서야 해서, 주소에 조건이 없으면 페이지가 쿠키를 읽는다. 쿠키는 **브라우저가 칩을 누를 때만** 쓴다 —
// list-scroll-jump-cookie 회차의 사고는 proxy 가 요청마다 Set-Cookie 를 얹어서였고, 이건 그 길을 안 탄다.
// localStorage 가 아닌 이유: 서버가 못 읽어 걸러지지 않은 판이 먼저 그려졌다가 바뀐다.
//
// **칸이 셋뿐인 이유**(같은 날 2차, 사용자: "사용하기에는 복잡해서 불편하진 않으려나"): 1차는 올린 사람 켬끔 둘,
// 담당 셋, 분류 다섯, 급함 — 칩 열둘이었다. 올린 사람과 담당은 둘 다 "내 일인가 남의 일인가" 를 묻는데
// 그걸 두 줄로 물어 사람이 머리로 조합해야 했다. 지금은 보기 하나(전체 보기, 내 담당, 내 등록 중 하나), 분류 하나, 급함 하나다.
// 담당 없음 보기는 뺐다 — 판을 쓰는 사람이 둘이라 찾을 일이 드물다.
//
// 주소에는 **기본값과 다른 것만** 싣는다. 아무것도 안 건 판은 맨 주소(/admin/tasks)라야 메뉴 링크와 같은 화면이다.
import { TASK_CATEGORIES, type AdminTask, type TaskCategory } from "@/lib/admin/tasks";

/** 보기. 칩 순서가 곧 이 순서다. all 은 거르지 않는다 */
// "남이 올린" 은 같은 날 뺐다(사용자: "내 등록, 전체 보기 이런 느낌의 토글") — 남이 올린 것만 따로 볼 일은 드물고,
// 전체 보기가 그 몫을 한다. 옛 주소나 쿠키의 view=others 는 모르는 값이라 전체로 돌아간다.
export const TASK_VIEWS = ["all", "assigned", "mine"] as const;
export type TaskView = (typeof TASK_VIEWS)[number];

export interface TaskFilter {
  /** assigned = 내 담당, mine = 내 등록(내가 올린 것) */
  view: TaskView;
  /** null 이면 분류로 거르지 않는다 */
  category: TaskCategory | null;
  /** 급함 높음만 */
  urgent: boolean;
}

export const DEFAULT_TASK_FILTER: TaskFilter = { view: "all", category: null, urgent: false };

/** 주소 쿼리 이름. 짧게 둔다 — 북마크해서 다시 쓰는 주소다 */
export const TASK_FILTER_PARAM = { view: "view", category: "cat", urgent: "urgent" } as const;

/** 마지막 조건을 담는 쿠키. 값은 주소 쿼리와 같은 꼴이다(serializeTaskFilter) */
export const TASK_FILTER_COOKIE = "admin_tasks_filter";
/** 쿠키 수명 1년 — "다시 접속해도" 의 다시는 며칠 뒤일 수 있다. 관리자 둘이 쓰는 판이라 길게 둬도 잃을 게 없다 */
export const TASK_FILTER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** 주소에 거르기 조건이 하나라도 실렸는가. 실렸으면 쿠키보다 주소가 이긴다(북마크한 주소는 그 조건이어야 한다) */
export function hasTaskFilterParams(params: ParamSource): boolean {
  return Object.values(TASK_FILTER_PARAM).some((k) => params[k] !== undefined);
}

/** 쿠키 값을 조건으로. 깨진 값은 기본값이 된다(parseTaskFilter 와 같은 규칙) */
export function parseTaskFilterCookie(value: string | undefined): TaskFilter {
  return parseTaskFilter(Object.fromEntries(new URLSearchParams(value ?? "")));
}

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
