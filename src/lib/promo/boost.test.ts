import { describe, expect, it } from "vitest";
import { boostEnd, boostProgress, boostState, rotateForWindow, ROTATE_WINDOW_MS } from "@/lib/promo/boost";

const at = (iso: string) => new Date(iso);

describe("boostState", () => {
  const b = { startsAt: at("2026-10-27T00:00:00Z"), endsAt: at("2026-11-03T00:00:00Z"), revokedAt: null };
  it("시작 전은 대기, 기간 안은 노출, 끝 시각부터는 끝", () => {
    expect(boostState(b, at("2026-10-26T23:59:59Z"))).toBe("queued");
    expect(boostState(b, at("2026-10-27T00:00:00Z"))).toBe("active");
    expect(boostState(b, at("2026-11-03T00:00:00Z"))).toBe("ended");
  });
  it("회수가 무엇보다 앞선다", () => {
    expect(boostState({ ...b, revokedAt: at("2026-10-28T00:00:00Z") }, at("2026-10-29T00:00:00Z"))).toBe("revoked");
  });
});

describe("rotateForWindow", () => {
  const items = ["a", "b", "c", "d", "e"];
  it("칸보다 적으면 그대로", () => {
    expect(rotateForWindow(["a", "b"], 3, at("2026-10-27T00:00:00Z"))).toEqual(["a", "b"]);
  });
  it("같은 구간에서는 늘 같은 순서", () => {
    const t = at("2026-10-27T05:10:00Z");
    expect(rotateForWindow(items, 3, t)).toEqual(rotateForWindow(items, 3, new Date(t.getTime() + 60_000)));
  });
  it("구간이 바뀌면 한 칸씩 밀리고 원을 돈다", () => {
    const base = new Date(Math.floor(at("2026-10-27T05:00:00Z").getTime() / ROTATE_WINDOW_MS / items.length) * items.length * ROTATE_WINDOW_MS);
    expect(rotateForWindow(items, 3, base)).toEqual(["a", "b", "c"]);
    expect(rotateForWindow(items, 3, new Date(base.getTime() + ROTATE_WINDOW_MS))).toEqual(["b", "c", "d"]);
    expect(rotateForWindow(items, 3, new Date(base.getTime() + 4 * ROTATE_WINDOW_MS))).toEqual(["e", "a", "b"]);
  });
});

describe("boostEnd", () => {
  it("시작부터 일수만큼", () => {
    expect(boostEnd(at("2026-10-27T03:00:00Z"), 7).toISOString()).toBe("2026-11-03T03:00:00.000Z");
  });
});

describe("boostProgress", () => {
  const b = { startsAt: new Date("2026-10-01T00:00:00Z"), endsAt: new Date("2026-10-08T00:00:00Z") };
  it("가운데면 반쯤, 남은 날은 올림", () => {
    expect(boostProgress(b, new Date("2026-10-04T12:00:00Z"))).toEqual({ progress: 0.5, daysLeft: 4 });
  });
  it("시작 전 0, 끝난 뒤 1 과 0일", () => {
    expect(boostProgress(b, new Date("2026-09-30T00:00:00Z")).progress).toBe(0);
    expect(boostProgress(b, new Date("2026-10-09T00:00:00Z"))).toEqual({ progress: 1, daysLeft: 0 });
  });
});
