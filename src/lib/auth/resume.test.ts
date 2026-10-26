import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { forgetDraft, rememberAction, rememberDraft, RESUME_TTL_MS, takeAction, takeDraft } from "@/lib/auth/resume";

// 테스트는 node 환경이라 sessionStorage 가 없다 — 탭 저장소 흉내를 붙인다
function stubStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  return store;
}

beforeEach(() => {
  stubStorage();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("takeAction", () => {
  it("같은 동작만 한 번 꺼낸다", () => {
    rememberAction("comment:a");
    expect(takeAction("comment:b")).toBe(false);
    expect(takeAction("comment:a")).toBe(true);
    expect(takeAction("comment:a")).toBe(false);
  });
});

describe("takeDraft", () => {
  it("맡긴 글을 한 번만 돌려준다", () => {
    rememberDraft("comment:a", "쓰던 댓글");
    expect(takeDraft("comment:a")).toBe("쓰던 댓글");
    expect(takeDraft("comment:a")).toBeNull();
  });

  it("다른 글의 칸은 남의 글을 집지 않는다", () => {
    rememberDraft("comment:a", "가");
    rememberDraft("comment:b", "나");
    expect(takeDraft("comment:b")).toBe("나");
    expect(takeDraft("comment:a")).toBe("가");
  });

  it("오래된 글은 버린다", () => {
    rememberDraft("comment:a", "옛 글");
    expect(takeDraft("comment:a", Date.now() + RESUME_TTL_MS + 1)).toBeNull();
  });

  it("지운 글은 돌아오지 않는다", () => {
    rememberDraft("comment:a", "보냄");
    forgetDraft("comment:a");
    expect(takeDraft("comment:a")).toBeNull();
  });

  it("저장소가 막혀도 던지지 않는다", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    });
    expect(() => rememberDraft("comment:a", "x")).not.toThrow();
    expect(takeDraft("comment:a")).toBeNull();
    expect(() => forgetDraft("comment:a")).not.toThrow();
  });
});
