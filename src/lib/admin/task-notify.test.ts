import { describe, expect, it } from "vitest";
import { TASK_NOTIFY_NOTE_PREVIEW, formatTaskNotice, type TaskNotifySnapshot } from "@/lib/admin/task-notify";

const TASK: TaskNotifySnapshot = { title: "가격 표 깨짐", category: "bug", priority: "high", assigneeName: "성진", assignedAll: false };
const LINK = "https://example.com/admin/tasks?task=abc";

describe("formatTaskNotice", () => {
  it("새 카드는 머리, 굵은 제목, 항목, 링크를 빈 줄로 가른다", () => {
    expect(formatTaskNotice({ kind: "created" }, TASK, "관리자", LINK)).toBe(
      [
        "🆕 새 할 일",
        "<b>가격 표 깨짐</b>",
        ["<b>분류</b>  버그", "<b>우선순위</b>  높음", "<b>담당자</b>  성진", "<b>올린 사람</b>  관리자"].join("\n"),
        `<a href="${LINK}">카드 열기</a>`,
      ].join("\n\n"),
    );
  });

  it("사람이 친 글은 이스케이프한다(텔레그램이 태그로 읽으면 400)", () => {
    const text = formatTaskNotice({ kind: "note", body: "<b>깨짐</b> & 확인" }, { ...TASK, title: "a<b" }, "관리자", LINK);
    expect(text).toContain("<b>a&lt;b</b>");
    expect(text).toContain("<blockquote>&lt;b&gt;깨짐&lt;/b&gt; &amp; 확인</blockquote>");
  });

  it("담당자 지정은 모두, 없음을 낱말로 적는다", () => {
    expect(formatTaskNotice({ kind: "assigned" }, { ...TASK, assignedAll: true }, "관리자", LINK)).toContain("<b>담당자</b>  모두");
    expect(formatTaskNotice({ kind: "assigned" }, { ...TASK, assigneeName: null }, "관리자", LINK)).toContain("<b>담당자</b>  없음");
  });

  it("상태 변경은 화살표 없이 조사로 잇는다", () => {
    const text = formatTaskNotice({ kind: "moved", from: "todo", to: "doing" }, TASK, "관리자", LINK);
    expect(text).toContain("<b>상태</b>  할 일에서 처리 중으로");
    expect(text).not.toMatch(/[←→]/);
  });

  it("기록은 길면 잘라 싣고, 글 없이 파일만이면 그렇게 말한다", () => {
    const long = "가".repeat(TASK_NOTIFY_NOTE_PREVIEW + 50);
    expect(formatTaskNotice({ kind: "note", body: long }, TASK, "관리자", LINK)).toContain(`<blockquote>${"가".repeat(TASK_NOTIFY_NOTE_PREVIEW)}...</blockquote>`);
    expect(formatTaskNotice({ kind: "note", body: "  " }, TASK, "관리자", LINK)).toContain("<blockquote>파일을 남겼어요</blockquote>");
  });

  it("한 사람을 모르면 알 수 없음", () => {
    expect(formatTaskNotice({ kind: "created" }, TASK, null, LINK)).toContain("<b>올린 사람</b>  알 수 없음");
  });
});
