// 안 준 ref 세기, 되돌리기 테스트. DB 는 update 체인만 흉내 낸다(네트워크, 실DB 없음).
import { describe, expect, it } from "vitest";
import { applyMissingRefs, bumpMissingRefs, clearMissingRefs, missingRefExcluded } from "./missing-refs";
import { MISSING_RETRY_DAYS, MISSING_STREAK_MAX } from "./constants";
import type { Db } from "@/server/db/client";

/** update(...).set(...).where(...) 를 받아 마지막 인자만 기록하는 가짜 */
function fakeDb(rowCount = 1) {
  const calls: Array<{ set: unknown }> = [];
  const db = {
    update: () => ({
      set: (v: unknown) => {
        calls.push({ set: v });
        return { where: async () => ({ rowCount }) };
      },
    }),
  } as unknown as Db;
  return { db, calls };
}

const NOW = new Date("2026-09-21T00:00:00Z");

describe("bumpMissingRefs", () => {
  it("빈 목록이면 질의하지 않는다", async () => {
    const { db, calls } = fakeDb();
    expect(await bumpMissingRefs(db, "steam", [], NOW)).toBe(0);
    expect(calls).toHaveLength(0);
  });

  it("연속 실패 수를 올리고 시각을 남긴다", async () => {
    const { db, calls } = fakeDb(2);
    expect(await bumpMissingRefs(db, "steam", ["502280", "251670"], NOW)).toBe(2);
    expect((calls[0].set as { missingAt: Date }).missingAt).toBe(NOW);
  });
});

describe("clearMissingRefs", () => {
  it("빈 목록이면 질의하지 않는다", async () => {
    const { db, calls } = fakeDb();
    expect(await clearMissingRefs(db, "steam", [])).toBe(0);
    expect(calls).toHaveLength(0);
  });

  it("되살아난 ref 는 0 으로 되돌리고 시각을 지운다", async () => {
    const { db, calls } = fakeDb(1);
    await clearMissingRefs(db, "steam", ["730"]);
    expect(calls[0].set).toEqual({ missingStreak: 0, missingAt: null });
  });
});

describe("applyMissingRefs", () => {
  it("준 것과 안 준 것을 한 회차에 같이 반영한다", async () => {
    const { db, calls } = fakeDb(1);
    const r = await applyMissingRefs(db, "steam", ["730"], ["502280"], NOW);
    expect(r).toEqual({ bumped: 1, cleared: 1 });
    expect(calls).toHaveLength(2);
  });

  it("안 준 것이 없으면 되돌리기만 한다", async () => {
    const { db, calls } = fakeDb(1);
    await applyMissingRefs(db, "steam", ["730"], [], NOW);
    expect(calls).toHaveLength(1);
  });
});

describe("missingRefExcluded", () => {
  /**
   * 조건 자체는 SQL 이라 단위 테스트로 뜻을 확인할 수 없다(실제 동작은 DB 로 실측했다).
   * 여기서는 값이 조용히 무너지는 경우만 막는다 — 한계가 0 이면 전부 빠지고,
   * 주기가 0 이면 제외가 하루도 못 간다. 둘 다 눈에 안 띄게 수집을 망가뜨린다.
   */
  it("한계와 재시도 주기가 살아 있다", () => {
    expect(MISSING_STREAK_MAX).toBeGreaterThan(1);
    expect(MISSING_RETRY_DAYS).toBeGreaterThan(0);
  });

  it("조건을 만들어 낸다", () => {
    expect(missingRefExcluded()).toBeTruthy();
  });
});
