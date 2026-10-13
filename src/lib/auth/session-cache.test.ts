import { describe, expect, it } from "vitest";
import { SESSION_CACHE_FRESH_SEC } from "@/lib/auth/constants";
import { reviveDates, sessionCacheState, sessionCacheTtlSec } from "./session-cache";

const NOW = Date.UTC(2026, 9, 13, 12, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

describe("sessionCacheState", () => {
  it("쓴 지 얼마 안 됐으면 DB 를 안 묻는다", () => {
    expect(sessionCacheState({ cachedAt: NOW - 1000, expiresAt: NOW + DAY }, NOW)).toBe("fresh");
  });

  it("신선한 창이 지나면 DB 를 다시 묻되, 안 열리면 쓸 수 있다", () => {
    expect(sessionCacheState({ cachedAt: NOW - SESSION_CACHE_FRESH_SEC * 1000, expiresAt: NOW + DAY }, NOW)).toBe("stale");
  });

  it("세션이 끝났으면 DB 가 죽어도 쓰지 않는다", () => {
    expect(sessionCacheState({ cachedAt: NOW - 1000, expiresAt: NOW }, NOW)).toBe("expired");
  });
});

describe("sessionCacheTtlSec", () => {
  it("세션이 끝나는 시각까지만 남긴다", () => {
    expect(sessionCacheTtlSec(NOW + 90_500, NOW)).toBe(91);
    expect(sessionCacheTtlSec(NOW - 5, NOW)).toBe(1);
  });
});

describe("reviveDates", () => {
  it("At 으로 끝나는 문자열 칸만 Date 로 되살린다", () => {
    const iso = new Date(NOW).toISOString();
    const out = reviveDates({ createdAt: iso, email: "a@b.c", emailVerifiedAt: null });
    expect(out.createdAt).toBeInstanceOf(Date);
    expect((out.createdAt as unknown as Date).getTime()).toBe(NOW);
    expect(out.email).toBe("a@b.c");
    expect(out.emailVerifiedAt).toBeNull();
  });
});
