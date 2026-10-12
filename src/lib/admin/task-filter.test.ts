import { describe, expect, it } from "vitest";
import {
  DEFAULT_TASK_FILTER,
  TASK_ASSIGNEE_NONE,
  countTaskFilters,
  hasTaskFilterParams,
  isDefaultTaskFilter,
  matchesTaskFilter,
  parseTaskFilter,
  parseTaskFilterCookie,
  serializeTaskFilter,
} from "@/lib/admin/task-filter";
import { TASK_ASSIGNEE_ALL } from "@/lib/admin/tasks";

const ME = "me-id";
const OTHER = "other-id";
const OTHER_UUID = "2975d27e-b033-452d-b799-e9b1647c5c2e";

const task = (over: Partial<Parameters<typeof matchesTaskFilter>[0]> = {}) => ({
  author: { id: ME, name: "나" },
  assignee: null,
  assignedAll: false,
  category: "task" as const,
  priority: "normal" as const,
  ...over,
});

describe("parseTaskFilter", () => {
  it("빈 주소는 기본값이다", () => {
    expect(parseTaskFilter({})).toEqual(DEFAULT_TASK_FILTER);
  });

  it("모르는 값은 버린다", () => {
    expect(parseTaskFilter({ view: "nobody", cat: "urgent", urgent: "yes", who: "'; drop" })).toEqual(DEFAULT_TASK_FILTER);
  });

  it("주소와 조건이 왕복한다", () => {
    const f = { view: "assigned" as const, category: "idea" as const, urgent: true, assignee: OTHER_UUID };
    expect(parseTaskFilter(Object.fromEntries(serializeTaskFilter(f)))).toEqual(f);
  });

  it("기본값은 주소에 아무것도 싣지 않는다", () => {
    expect(serializeTaskFilter(DEFAULT_TASK_FILTER).toString()).toBe("");
    expect(isDefaultTaskFilter(DEFAULT_TASK_FILTER)).toBe(true);
  });
});

describe("쿠키", () => {
  it("쿠키 값과 조건이 왕복한다", () => {
    const f = { view: "mine" as const, category: "bug" as const, urgent: false, assignee: TASK_ASSIGNEE_NONE };
    expect(parseTaskFilterCookie(serializeTaskFilter(f).toString())).toEqual(f);
  });

  it("없거나 깨진 쿠키는 기본값이다", () => {
    expect(parseTaskFilterCookie(undefined)).toEqual(DEFAULT_TASK_FILTER);
    expect(parseTaskFilterCookie("%%%")).toEqual(DEFAULT_TASK_FILTER);
  });

  it("주소에 조건이 있는지만 본다", () => {
    expect(hasTaskFilterParams({})).toBe(false);
    expect(hasTaskFilterParams({ other: "1" })).toBe(false);
    expect(hasTaskFilterParams({ view: "all" })).toBe(true);
  });
});

describe("matchesTaskFilter", () => {
  const by = (view: "all" | "assigned" | "mine") => ({ ...DEFAULT_TASK_FILTER, view });

  it("기본값은 다 보인다", () => {
    expect(matchesTaskFilter(task(), DEFAULT_TASK_FILTER, ME)).toBe(true);
    expect(matchesTaskFilter(task({ author: null }), DEFAULT_TASK_FILTER, ME)).toBe(true);
  });

  it("내 등록은 내가 올린 것만 보인다", () => {
    expect(matchesTaskFilter(task(), by("mine"), ME)).toBe(true);
    expect(matchesTaskFilter(task({ author: { id: OTHER, name: "남" } }), by("mine"), ME)).toBe(false);
    expect(matchesTaskFilter(task({ author: null }), by("mine"), ME)).toBe(false);
  });

  it("뺀 보기(others)는 옛 주소에서 와도 전체로 돌아간다", () => {
    expect(parseTaskFilter({ view: "others" }).view).toBe("all");
  });

  it("내 담당은 올린 사람과 상관없다", () => {
    expect(matchesTaskFilter(task({ author: { id: OTHER, name: "남" }, assignee: { id: ME, name: "나" } }), by("assigned"), ME)).toBe(true);
    // "모두" 담당은 누구에게나 내 담당이다
    expect(matchesTaskFilter(task({ author: { id: OTHER, name: "남" }, assignedAll: true }), by("assigned"), ME)).toBe(true);
    expect(matchesTaskFilter(task(), by("assigned"), ME)).toBe(false);
  });

  it("담당자로 거른다 — 사람을 고르면 \"모두\" 담당도 든다", () => {
    const who = (assignee: string) => ({ ...DEFAULT_TASK_FILTER, assignee });
    const others = task({ assignee: { id: OTHER, name: "남" } });
    const everyone = task({ assignedAll: true });
    const nobody = task();
    expect([others, everyone, nobody].map((t) => matchesTaskFilter(t, who(OTHER), ME))).toEqual([true, true, false]);
    expect([others, everyone, nobody].map((t) => matchesTaskFilter(t, who(TASK_ASSIGNEE_ALL), ME))).toEqual([false, true, false]);
    expect([others, everyone, nobody].map((t) => matchesTaskFilter(t, who(TASK_ASSIGNEE_NONE), ME))).toEqual([false, false, true]);
  });

  it("분류와 급함은 AND 로 걸린다", () => {
    const f = { ...DEFAULT_TASK_FILTER, category: "bug" as const, urgent: true };
    expect(matchesTaskFilter(task({ category: "bug", priority: "high" }), f, ME)).toBe(true);
    expect(matchesTaskFilter(task({ category: "bug" }), f, ME)).toBe(false);
    expect(matchesTaskFilter(task({ priority: "high" }), f, ME)).toBe(false);
  });
});

describe("countTaskFilters", () => {
  it("칸마다 따로 센다", () => {
    const tasks = [
      task({ assignee: { id: ME, name: "나" }, category: "bug", priority: "high" }),
      task({ author: { id: OTHER, name: "남" }, category: "bug" }),
      task({ author: { id: OTHER, name: "남" }, category: "idea" }),
    ];
    const c = countTaskFilters(tasks, ME);
    expect(c.views).toEqual({ all: 3, assigned: 1, mine: 1 });
    expect(c.categories).toEqual({ task: 0, bug: 2, idea: 1, data: 0, etc: 0 });
    expect(c.urgent).toBe(1);
    expect(countTaskFilters(tasks, ME, [ME, OTHER]).assignees).toEqual({ all: 0, none: 2, [ME]: 1, [OTHER]: 0 });
  });
});
