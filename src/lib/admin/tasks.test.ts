import { describe, expect, it } from "vitest";
import { TASK_STALE_DAYS, staleDays } from "@/lib/admin/tasks";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 1);

describe("staleDays", () => {
  it("처리 중이 기준일을 넘기면 날수를 준다", () => {
    expect(staleDays({ status: "doing", updatedAt: new Date(NOW - TASK_STALE_DAYS * DAY) }, NOW)).toBe(TASK_STALE_DAYS);
    expect(staleDays({ status: "doing", updatedAt: new Date(NOW - 12 * DAY) }, NOW)).toBe(12);
  });

  it("기준일 전이면 멈춤이 아니다", () => {
    expect(staleDays({ status: "doing", updatedAt: new Date(NOW - (TASK_STALE_DAYS * DAY - 1)) }, NOW)).toBeNull();
  });

  it("처리 중이 아닌 칸은 오래돼도 멈춤이 아니다", () => {
    for (const status of ["backlog", "todo", "done"] as const) {
      expect(staleDays({ status, updatedAt: new Date(NOW - 30 * DAY) }, NOW)).toBeNull();
    }
  });
});
