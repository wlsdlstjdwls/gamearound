import { describe, expect, it } from "vitest";
import { DEFAULT_TASK_FILTER, countTaskFilters, isDefaultTaskFilter, matchesTaskFilter, parseTaskFilter, serializeTaskFilter } from "@/lib/admin/task-filter";

const ME = "me-id";
const OTHER = "other-id";

const task = (over: Partial<Parameters<typeof matchesTaskFilter>[0]> = {}) => ({
  author: { id: ME, name: "나" },
  assignee: null,
  category: "task" as const,
  priority: "normal" as const,
  ...over,
});

describe("parseTaskFilter", () => {
  it("빈 주소는 기본값이다", () => {
    expect(parseTaskFilter({})).toEqual(DEFAULT_TASK_FILTER);
  });

  it("모르는 값은 버린다", () => {
    expect(parseTaskFilter({ view: "nobody", cat: "urgent", urgent: "yes" })).toEqual(DEFAULT_TASK_FILTER);
  });

  it("주소와 조건이 왕복한다", () => {
    const f = { view: "assigned" as const, category: "idea" as const, urgent: true };
    expect(parseTaskFilter(Object.fromEntries(serializeTaskFilter(f)))).toEqual(f);
  });

  it("기본값은 주소에 아무것도 싣지 않는다", () => {
    expect(serializeTaskFilter(DEFAULT_TASK_FILTER).toString()).toBe("");
    expect(isDefaultTaskFilter(DEFAULT_TASK_FILTER)).toBe(true);
  });
});

describe("matchesTaskFilter", () => {
  const by = (view: "all" | "assigned" | "mine" | "others") => ({ ...DEFAULT_TASK_FILTER, view });

  it("기본값은 다 보인다", () => {
    expect(matchesTaskFilter(task(), DEFAULT_TASK_FILTER, ME)).toBe(true);
    expect(matchesTaskFilter(task({ author: null }), DEFAULT_TASK_FILTER, ME)).toBe(true);
  });

  it("내가 올린, 남이 올린은 서로 반대편이다", () => {
    const theirs = task({ author: { id: OTHER, name: "남" } });
    expect(matchesTaskFilter(task(), by("mine"), ME)).toBe(true);
    expect(matchesTaskFilter(theirs, by("mine"), ME)).toBe(false);
    expect(matchesTaskFilter(theirs, by("others"), ME)).toBe(true);
    expect(matchesTaskFilter(task(), by("others"), ME)).toBe(false);
    // 올린 사람을 모르는 카드는 남이 올린 쪽이다
    expect(matchesTaskFilter(task({ author: null }), by("others"), ME)).toBe(true);
  });

  it("내 담당은 올린 사람과 상관없다", () => {
    expect(matchesTaskFilter(task({ author: { id: OTHER, name: "남" }, assignee: { id: ME, name: "나" } }), by("assigned"), ME)).toBe(true);
    expect(matchesTaskFilter(task(), by("assigned"), ME)).toBe(false);
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
    expect(c.views).toEqual({ all: 3, assigned: 1, mine: 1, others: 2 });
    expect(c.categories).toEqual({ task: 0, bug: 2, idea: 1, data: 0, etc: 0 });
    expect(c.urgent).toBe(1);
  });
});
