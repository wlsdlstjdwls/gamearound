import { describe, expect, it } from "vitest";
import { DEFAULT_TASK_FILTER, isDefaultTaskFilter, matchesTaskFilter, parseTaskFilter, serializeTaskFilter } from "@/lib/admin/task-filter";

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
    const f = parseTaskFilter({ as: "nobody", cat: "idea,urgent,bug", urgent: "yes" });
    expect(f.assignee).toBe("all");
    expect(f.categories).toEqual(["bug", "idea"]);
    expect(f.urgent).toBe(false);
  });

  it("주소와 조건이 왕복한다", () => {
    const f = { mine: false, others: true, assignee: "me" as const, categories: ["idea" as const, "etc" as const], urgent: true };
    const q = serializeTaskFilter(f);
    expect(parseTaskFilter(Object.fromEntries(q))).toEqual(f);
  });

  it("기본값은 주소에 아무것도 싣지 않는다", () => {
    expect(serializeTaskFilter(DEFAULT_TASK_FILTER).toString()).toBe("");
    expect(isDefaultTaskFilter(DEFAULT_TASK_FILTER)).toBe(true);
  });
});

describe("matchesTaskFilter", () => {
  it("기본값은 다 보인다", () => {
    expect(matchesTaskFilter(task(), DEFAULT_TASK_FILTER, ME)).toBe(true);
    expect(matchesTaskFilter(task({ author: null }), DEFAULT_TASK_FILTER, ME)).toBe(true);
  });

  it("올린 사람 토글은 따로 끈다", () => {
    const hideMine = { ...DEFAULT_TASK_FILTER, mine: false };
    expect(matchesTaskFilter(task(), hideMine, ME)).toBe(false);
    expect(matchesTaskFilter(task({ author: { id: OTHER, name: "남" } }), hideMine, ME)).toBe(true);
    // 올린 사람을 모르는 카드는 남이 올린 쪽이다
    expect(matchesTaskFilter(task({ author: null }), { ...DEFAULT_TASK_FILTER, others: false }, ME)).toBe(false);
  });

  it("담당 기준", () => {
    const mineOnly = { ...DEFAULT_TASK_FILTER, assignee: "me" as const };
    expect(matchesTaskFilter(task({ assignee: { id: ME, name: "나" } }), mineOnly, ME)).toBe(true);
    expect(matchesTaskFilter(task({ assignee: { id: OTHER, name: "남" } }), mineOnly, ME)).toBe(false);
    expect(matchesTaskFilter(task(), { ...DEFAULT_TASK_FILTER, assignee: "none" }, ME)).toBe(true);
  });

  it("갈래와 급함은 AND 로 걸린다", () => {
    const f = { ...DEFAULT_TASK_FILTER, categories: ["bug" as const], urgent: true };
    expect(matchesTaskFilter(task({ category: "bug", priority: "high" }), f, ME)).toBe(true);
    expect(matchesTaskFilter(task({ category: "bug" }), f, ME)).toBe(false);
    expect(matchesTaskFilter(task({ priority: "high" }), f, ME)).toBe(false);
  });
});
