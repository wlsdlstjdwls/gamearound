// 아침 모아 보내기 메일의 목록 글 — 상한을 넘으면 남은 수를 적는다(DB 없음)
import { describe, expect, it } from "vitest";
import { MORNING_MAIL_MAX_LINES, morningListText } from "@/server/sync/morning-alerts";

describe("morningListText", () => {
  it("줄마다 한 알림", () => {
    expect(morningListText(["가", "나"])).toBe("- 가\n- 나");
  });

  it("상한을 넘으면 마지막 줄에 남은 수", () => {
    const bodies = Array.from({ length: MORNING_MAIL_MAX_LINES + 3 }, (_, i) => `알림 ${i}`);
    const lines = morningListText(bodies).split("\n");
    expect(lines).toHaveLength(MORNING_MAIL_MAX_LINES + 1);
    expect(lines.at(-1)).toContain("3건");
  });
});
