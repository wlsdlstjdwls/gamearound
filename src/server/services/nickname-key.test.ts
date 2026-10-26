import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/client", () => ({ getDb: () => ({}) }));

describe("nicknameKey", () => {
  it("대소문자와 띄어쓰기를 무시한다", async () => {
    const { nicknameKey } = await import("@/server/services/users");
    expect(nicknameKey(" Seed Tester ")).toBe(nicknameKey("seedtester"));
    expect(nicknameKey("시드 테스터")).toBe("시드테스터");
  });
});
