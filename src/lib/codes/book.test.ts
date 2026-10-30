import { describe, expect, it } from "vitest";
import { buildCodeBook, codeMap, codeName, codeOptions } from "./book";

describe("buildCodeBook", () => {
  it("DB 가 비면 기본값으로 선다", () => {
    const book = buildCodeBook([]);
    expect(codeName(book, "TASK_PRIORITY", "high")).toBe("높음");
    expect(codeOptions(book, "TASK_PRIORITY").map((o) => o.value)).toEqual(["high", "normal", "low"]);
  });
  it("이름, 정렬, 사용여부를 덮는다", () => {
    const book = buildCodeBook([
      { groupCode: "TASK_PRIORITY", groupActive: true, code: "low", name: "나중에", sortOrder: 1, active: true },
      { groupCode: "TASK_PRIORITY", groupActive: true, code: "normal", name: "보통", sortOrder: 20, active: false },
    ]);
    expect(codeName(book, "TASK_PRIORITY", "low")).toBe("나중에");
    expect(codeOptions(book, "TASK_PRIORITY")).toEqual([
      { value: "low", label: "나중에" },
      { value: "high", label: "높음" },
    ]);
    // 미사용이어도 이름표는 남는다(이미 그 값을 가진 줄)
    expect(codeMap(book, "TASK_PRIORITY").normal).toBe("보통");
  });
  it("잠긴 그룹은 기본값에 없는 코드를 버리고, 등록 안 된 그룹은 DB 줄이 전부다", () => {
    const book = buildCodeBook([
      { groupCode: "TASK_PRIORITY", groupActive: true, code: "urgent", name: "긴급", sortOrder: 0, active: true },
      { groupCode: "NOTIFY_CHANNEL", groupActive: true, code: "admin", name: "관리자 채널", sortOrder: 10, active: true },
    ]);
    expect(codeName(book, "TASK_PRIORITY", "urgent")).toBe("urgent");
    expect(codeOptions(book, "NOTIFY_CHANNEL")).toEqual([{ value: "admin", label: "관리자 채널" }]);
  });
  it("그룹이 미사용이면 덮은 값을 버린다", () => {
    const book = buildCodeBook([{ groupCode: "TASK_PRIORITY", groupActive: false, code: "low", name: "나중에", sortOrder: 1, active: true }]);
    expect(codeName(book, "TASK_PRIORITY", "low")).toBe("낮음");
  });
});
