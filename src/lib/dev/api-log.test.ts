import { describe, expect, it } from "vitest";
import { BODY_PREVIEW_MAX, classifyRequest, errorType, previewBody, readHeader, shortUrl } from "@/lib/dev/api-log";

const ORIGIN = "http://localhost:4000";
const u = (path: string) => new URL(path, ORIGIN);

describe("classifyRequest", () => {
  it("Next-Action 헤더가 있으면 서버 액션", () => {
    expect(classifyRequest(u("/games"), { "Next-Action": "abc" }, ORIGIN)).toBe("action");
    expect(classifyRequest(u("/games"), new Headers({ "next-action": "abc" }), ORIGIN)).toBe("action");
  });
  it("/api 경로는 api", () => {
    expect(classifyRequest(u("/api/auth/me"), undefined, ORIGIN)).toBe("api");
  });
  it("RSC 이동, 정적 자산은 건너뛴다", () => {
    expect(classifyRequest(u("/games?_rsc=1"), undefined, ORIGIN)).toBeNull();
    expect(classifyRequest(u("/games"), [["RSC", "1"]], ORIGIN)).toBeNull();
    expect(classifyRequest(u("/_next/static/a.js"), undefined, ORIGIN)).toBeNull();
  });
  it("다른 출처는 other", () => {
    expect(classifyRequest(new URL("https://example.com/x"), undefined, ORIGIN)).toBe("other");
  });
});

describe("표시 헬퍼", () => {
  it("readHeader 는 대소문자를 가리지 않는다", () => {
    expect(readHeader({ "Content-Type": "a" }, "content-type")).toBe("a");
    expect(readHeader(undefined, "x")).toBeNull();
  });
  it("shortUrl 은 같은 출처면 경로만", () => {
    expect(shortUrl(u("/api/x?q=1"), ORIGIN)).toBe("/api/x?q=1");
    expect(shortUrl(new URL("https://example.com/x"), ORIGIN)).toBe("https://example.com/x");
  });
  it("errorType", () => {
    expect(errorType(new TypeError("Failed to fetch"))).toBe("network");
    expect(errorType(new DOMException("x", "AbortError"))).toBe("abort");
    expect(errorType(new Error("x"))).toBe("error");
  });
  it("previewBody 는 JSON 을 풀고 긴 글은 자른다", () => {
    expect(previewBody('{"a":1}')).toEqual({ a: 1 });
    const long = "x".repeat(BODY_PREVIEW_MAX + 10);
    expect(String(previewBody(long)).startsWith("x".repeat(BODY_PREVIEW_MAX))).toBe(true);
    expect(String(previewBody(long)).endsWith(`...(${long.length}자)`)).toBe(true);
  });
});
