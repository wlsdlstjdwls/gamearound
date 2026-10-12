import { describe, expect, it } from "vitest";
import { TASK_NOTIFY_NOTE_PREVIEW, formatTaskNotice, type TaskNotifySnapshot } from "@/lib/admin/task-notify";

const TASK: TaskNotifySnapshot = { title: "가격 표 깨짐", category: "bug", priority: "high", assigneeName: "성진", assignedAll: false };
const LINK = "https://example.com/admin/tasks?task=abc";

describe("formatTaskNotice", () => {
  it("새 카드는 분류, 우선순위, 담당자, 한 사람, 링크를 싣는다", () => {
    expect(formatTaskNotice({ kind: "created" }, TASK, "관리자", LINK).split("\n")).toEqual([
      "[새 할 일] 가격 표 깨짐",
      "버그 | 우선순위 높음",
      "담당자: 성진",
      "한 사람: 관리자",
      LINK,
    ]);
  });

  it("담당자 지정은 모두, 없음을 낱말로 적는다", () => {
    expect(formatTaskNotice({ kind: "assigned" }, { ...TASK, assignedAll: true }, "관리자", LINK)).toContain("담당자: 모두");
    expect(formatTaskNotice({ kind: "assigned" }, { ...TASK, assigneeName: null }, "관리자", LINK)).toContain("담당자: 없음");
  });

  it("상태 변경은 화살표 없이 조사로 잇는다", () => {
    const text = formatTaskNotice({ kind: "moved", from: "todo", to: "doing" }, TASK, "관리자", LINK);
    expect(text).toContain("할 일에서 처리 중으로 옮겼어요");
    expect(text).not.toMatch(/[←→]/);
  });

  it("기록은 길면 잘라 싣고, 글 없이 파일만이면 그렇게 말한다", () => {
    const long = "가".repeat(TASK_NOTIFY_NOTE_PREVIEW + 50);
    const line = formatTaskNotice({ kind: "note", body: long }, TASK, "관리자", LINK).split("\n")[1]!;
    expect(line).toBe(`${"가".repeat(TASK_NOTIFY_NOTE_PREVIEW)}...`);
    expect(formatTaskNotice({ kind: "note", body: "  " }, TASK, "관리자", LINK)).toContain("파일을 남겼어요");
  });

  it("한 사람을 모르면 알 수 없음", () => {
    expect(formatTaskNotice({ kind: "created" }, TASK, null, LINK)).toContain("한 사람: 알 수 없음");
  });
});
