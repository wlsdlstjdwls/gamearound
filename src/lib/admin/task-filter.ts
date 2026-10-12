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
import { TASK_ASSIGNEE_ALL, TASK_CATEGORIES, isAssignedTo, type AdminTask, type TaskCategory } from "@/lib/admin/tasks";

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
  /**
   * 담당자로 거르기(2026-10-12, 사용자: "필터에 담당자도 조회 가능하게"). null 이면 거르지 않는다.
   * 사용자 id 하나, "모두" 지정(TASK_ASSIGNEE_ALL), 담당 없음(TASK_ASSIGNEE_NONE) 중 하나다.
   * "내 담당" 보기와 겹쳐 보이지만 그건 나만 묻고, 이건 남의 몫을 본다 — 회의 때 "저 사람 일 뭐 남았지" 를 묻는 자리다.
   */
  assignee: string | null;
}

/** 담당자 거르기의 "담당 없음". 사용자 id(uuid)와 겹치지 않는 낱말이다 */
export const TASK_ASSIGNEE_NONE = "none";

export const DEFAULT_TASK_FILTER: TaskFilter = { view: "all", category: null, urgent: false, assignee: null };

/** 주소 쿼리 이름. 짧게 둔다 — 북마크해서 다시 쓰는 주소다 */
export const TASK_FILTER_PARAM = { view: "view", category: "cat", urgent: "urgent", assignee: "who" } as const;

/** 주소의 담당자 값으로 받는 꼴. 그 밖의 값은 버린다 — 지워진 계정 id 는 꼴이 맞아 남지만 0건으로 서고 "거르기 풀기" 로 풀린다 */
const ASSIGNEE_PARAM = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|all|none)$/i;

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
    assignee: ASSIGNEE_PARAM.exec(first(params[TASK_FILTER_PARAM.assignee]) ?? "")?.[0].toLowerCase() ?? null,
  };
}

/** 조건을 주소 쿼리로. 기본값과 같은 칸은 싣지 않는다 */
export function serializeTaskFilter(f: TaskFilter): URLSearchParams {
  const q = new URLSearchParams();
  if (f.view !== "all") q.set(TASK_FILTER_PARAM.view, f.view);
  if (f.category) q.set(TASK_FILTER_PARAM.category, f.category);
  if (f.urgent) q.set(TASK_FILTER_PARAM.urgent, ON);
  if (f.assignee) q.set(TASK_FILTER_PARAM.assignee, f.assignee);
  return q;
}

export function isDefaultTaskFilter(f: TaskFilter): boolean {
  return serializeTaskFilter(f).size === 0;
}

type TaskFilterTarget = Pick<AdminTask, "author" | "assignee" | "assignedAll" | "category" | "priority">;

/**
 * 담당자 거르기 한 칸. 사람을 고르면 그 사람 담당에 **"모두" 담당도 든다** — "모두" 는 그 사람에게도 걸린 일이라
 * 빼면 그 사람의 남은 몫이 적게 보인다("내 담당" 보기와 같은 규칙, isAssignedTo).
 */
function matchesAssignee(task: TaskFilterTarget, assignee: string): boolean {
  if (assignee === TASK_ASSIGNEE_NONE) return !task.assignee && !task.assignedAll;
  if (assignee === TASK_ASSIGNEE_ALL) return task.assignedAll;
  return isAssignedTo(task, assignee);
}

/** 카드 한 장이 조건에 맞는가. 칸끼리는 전부 AND 다 */
export function matchesTaskFilter(task: TaskFilterTarget, f: TaskFilter, meId: string): boolean {
  // "모두" 담당은 누구의 "내 담당" 에도 든다
  if (f.view === "assigned" && !isAssignedTo(task, meId)) return false;
  if (f.view === "mine" && task.author?.id !== meId) return false;
  if (f.category && task.category !== f.category) return false;
  if (f.urgent && task.priority !== "high") return false;
  if (f.assignee && !matchesAssignee(task, f.assignee)) return false;
  return true;
}

/** 거르기 칩 옆 건수. 칸마다 다른 칸을 기본값으로 두고 센다 — "내 담당 3" 은 지금 걸린 분류와 상관없이 내 몫 전체다 */
export interface TaskFilterCounts {
  views: Record<TaskView, number>;
  categories: Record<TaskCategory, number>;
  urgent: number;
  /** 담당자 드롭다운 항목별 건수. 열쇠는 거르기 값(사용자 id, "all", "none")이다 */
  assignees: Record<string, number>;
}

export function countTaskFilters(tasks: TaskFilterTarget[], meId: string, assigneeIds: readonly string[] = []): TaskFilterCounts {
  const count = (f: TaskFilter) => tasks.filter((t) => matchesTaskFilter(t, f, meId)).length;
  return {
    views: Object.fromEntries(TASK_VIEWS.map((view) => [view, count({ ...DEFAULT_TASK_FILTER, view })])) as Record<TaskView, number>,
    categories: Object.fromEntries(TASK_CATEGORIES.map((category) => [category, count({ ...DEFAULT_TASK_FILTER, category })])) as Record<
      TaskCategory,
      number
    >,
    urgent: count({ ...DEFAULT_TASK_FILTER, urgent: true }),
    assignees: Object.fromEntries(
      [TASK_ASSIGNEE_ALL, TASK_ASSIGNEE_NONE, ...assigneeIds].map((assignee) => [assignee, count({ ...DEFAULT_TASK_FILTER, assignee })]),
    ),
  };
}

