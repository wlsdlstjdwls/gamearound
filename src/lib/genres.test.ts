import { describe, expect, it } from "vitest";
import { normalizeGenre } from "./genres";

describe("normalizeGenre", () => {
  it("일본어 장르를 우리 어휘로 옮긴다", () => {
    expect(normalizeGenre("アクション")).toBe("액션");
    expect(normalizeGenre("ロールプレイング")).toBe("RPG"); // "롤플레잉" 이 아니다 — 스팀에서 온 이름이 기준
    expect(normalizeGenre("その他")).toBe("기타");
  });

  it("모르는 이름은 그대로 둔다 — 버리면 새 장르가 영영 안 생긴다", () => {
    expect(normalizeGenre("메트로배니아")).toBe("메트로배니아");
    expect(normalizeGenre("  액션 ")).toBe("액션");
  });
});
