import { describe, expect, it } from "vitest";
import { NEW_NOTE_EPOCH, TASK_STALE_DAYS, staleDays, unreadNoteCount } from "@/lib/admin/tasks";

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

const ME = "me";
const T0 = NEW_NOTE_EPOCH + 60_000;

describe("unreadNoteCount", () => {
  const notes = [
    { kind: "note" as const, authorId: "you", createdAt: new Date(T0) },
    { kind: "note" as const, authorId: ME, createdAt: new Date(T0 + 1000) },
    { kind: "move" as const, authorId: "you", createdAt: new Date(T0 + 2000) },
    { kind: "note" as const, authorId: "you", createdAt: new Date(T0 + 3000) },
  ];

  it("연 적 없으면 기준일 뒤 남의 글만 센다(내 글, 칸 이동은 빼고)", () => {
    expect(unreadNoteCount(notes, ME, undefined)).toBe(2);
  });

  it("연 뒤에 달린 것만 센다", () => {
    expect(unreadNoteCount(notes, ME, T0 + 500)).toBe(1);
    expect(unreadNoteCount(notes, ME, T0 + 3000)).toBe(0);
  });

  it("기준일 전의 기록은 연 적 없어도 새 기록이 아니다", () => {
    expect(unreadNoteCount([{ kind: "note", authorId: "you", createdAt: new Date(NEW_NOTE_EPOCH - 1) }], ME, undefined)).toBe(0);
  });
});
