import { describe, expect, it } from "vitest";
import { isSyncHealthFilter, matchesHealthFilter, syncHealthOf, type SyncHealth } from "@/lib/admin/sync-health";

const NOW = Date.UTC(2026, 9, 29, 12);
const GRACE = 60;
const ago = (min: number) => new Date(NOW - min * 60000);

describe("syncHealthOf", () => {
  it("꺼진 소스와 돈 적 없는 소스는 쉰다", () => {
    expect(syncHealthOf({ startedAt: ago(5), finishedAt: ago(1), status: "failed" }, true, NOW, GRACE)).toBe("idle");
    expect(syncHealthOf(null, false, NOW, GRACE)).toBe("idle");
  });

  it("안 끝난 실행은 유예 안이면 도는 중, 넘기면 끊김", () => {
    expect(syncHealthOf({ startedAt: ago(30), finishedAt: null, status: "ok" }, false, NOW, GRACE)).toBe("running");
    expect(syncHealthOf({ startedAt: ago(61), finishedAt: null, status: "ok" }, false, NOW, GRACE)).toBe("stalled");
  });

  it("끝난 실행은 상태를 그대로, 모르는 값은 실패로", () => {
    expect(syncHealthOf({ startedAt: ago(5), finishedAt: ago(1), status: "partial" }, false, NOW, GRACE)).toBe("partial");
    expect(syncHealthOf({ startedAt: ago(5), finishedAt: ago(1), status: "ok" }, false, NOW, GRACE)).toBe("ok");
    expect(syncHealthOf({ startedAt: ago(5), finishedAt: ago(1), status: "weird" }, false, NOW, GRACE)).toBe("failed");
  });
});

describe("matchesHealthFilter", () => {
  it("전체는 다, 손볼 것은 끊김, 실패, 일부 실패만", () => {
    expect(matchesHealthFilter("idle", "all")).toBe(true);
    expect(["stalled", "failed", "partial"].every((h) => matchesHealthFilter(h as SyncHealth, "attention"))).toBe(true);
    expect(matchesHealthFilter("running", "attention")).toBe(false);
    expect(matchesHealthFilter("ok", "attention")).toBe(false);
  });

  it("나머지는 같은 상태만", () => {
    expect(matchesHealthFilter("ok", "ok")).toBe(true);
    expect(matchesHealthFilter("partial", "failed")).toBe(false);
  });

  it("주소 값 검사", () => {
    expect(isSyncHealthFilter("attention")).toBe(true);
    expect(isSyncHealthFilter("weird")).toBe(false);
    expect(isSyncHealthFilter(undefined)).toBe(false);
  });
});
