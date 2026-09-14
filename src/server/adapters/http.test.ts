import { afterEach, describe, expect, it, vi } from "vitest";
import { createHttpClient, isRetryableStatus, notFoundAs } from "./http";
import { AdapterError, CRAWLER_USER_AGENT } from "./types";

/** fetch 를 고정 응답으로 바꾼다. 마지막 호출 인자를 확인할 수 있게 mock 을 돌려준다. */
function stubFetch(res: Response | (() => Promise<Response>)) {
  const impl = typeof res === "function" ? res : async () => res;
  const fn = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(impl);
  vi.stubGlobal("fetch", fn);
  return fn;
}

/** mock 이 기록한 n번째 호출의 헤더 */
const headersOf = (fn: ReturnType<typeof stubFetch>, n: number): Headers => fn.mock.calls[n][1].headers as Headers;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

afterEach(() => vi.unstubAllGlobals());

describe("isRetryableStatus", () => {
  it("429, 5xx 만 재시도 대상", () => {
    expect(isRetryableStatus(429)).toBe(true);
    expect(isRetryableStatus(503)).toBe(true);
    expect(isRetryableStatus(404)).toBe(false);
    expect(isRetryableStatus(400)).toBe(false);
  });
});

describe("createHttpClient", () => {
  it("크롤러 UA 와 Accept 를 기본으로 붙인다", async () => {
    const fetchMock = stubFetch(json({ ok: true }));
    const http = createHttpClient({ source: "steam", label: "Steam" });
    await http.json("https://example.test/a");

    const headers = headersOf(fetchMock, 0);
    expect(headers.get("User-Agent")).toBe(CRAWLER_USER_AGENT);
    expect(headers.get("Accept")).toBe("application/json");
  });

  it("요청별 헤더가 공통 헤더를 덮어쓴다", async () => {
    const fetchMock = stubFetch(json({}));
    const http = createHttpClient({ source: "hltb", label: "HLTB", headers: { "User-Agent": "base-ua", Origin: "o" } });
    await http.json("https://example.test/a", { headers: { "User-Agent": "call-ua" } });

    const headers = headersOf(fetchMock, 0);
    expect(headers.get("User-Agent")).toBe("call-ua");
    expect(headers.get("Origin")).toBe("o");
  });

  it("헤더 함수는 요청마다 다시 평가된다 (MS-CV 같은 요청별 값)", async () => {
    const fetchMock = stubFetch(async () => json({}));
    let n = 0;
    const http = createHttpClient({ source: "xbox", label: "Xbox", headers: () => ({ "MS-CV": String(n++) }) });
    await http.json("https://example.test/a");
    await http.json("https://example.test/b");

    expect(headersOf(fetchMock, 0).get("MS-CV")).toBe("0");
    expect(headersOf(fetchMock, 1).get("MS-CV")).toBe("1");
  });

  it("헤더 함수가 던진 AdapterError 는 '요청 실패'로 덮이지 않는다", async () => {
    stubFetch(json({}));
    const http = createHttpClient({
      source: "opencritic",
      label: "OpenCritic",
      headers: () => {
        throw new AdapterError("키 없음", "opencritic", false);
      },
    });
    await expect(http.json("https://example.test/a")).rejects.toThrowError("키 없음");
  });

  it("429 는 재시도 가능, 4xx 는 불가", async () => {
    const http = createHttpClient({ source: "steam", label: "Steam" });

    stubFetch(json({}, 429));
    await expect(http.json("https://example.test/a")).rejects.toMatchObject({ retryable: true });

    stubFetch(json({}, 400));
    await expect(http.json("https://example.test/a")).rejects.toMatchObject({ retryable: false });
  });

  it("onStatus 가 소스별 의미를 덮어쓴다", async () => {
    stubFetch(json({}, 404));
    const http = createHttpClient({
      source: "xbox",
      label: "Xbox",
      onStatus: notFoundAs("xbox", (ctx) => `Xbox 게임 없음 (${ctx})`),
    });
    await expect(http.json("https://example.test/p", { context: "ID123" })).rejects.toThrowError("Xbox 게임 없음 (ID123)");
  });

  it("네트워크 오류는 재시도 가능한 AdapterError 로 감싼다", async () => {
    stubFetch(async () => {
      throw new Error("ECONNRESET");
    });
    const http = createHttpClient({ source: "steam", label: "Steam" });
    await expect(http.json("https://example.test/a")).rejects.toMatchObject({ retryable: true, source: "steam" });
  });

  it("JSON 파싱 실패는 재시도 가능 (중간 프록시가 끼어든 경우)", async () => {
    stubFetch(new Response("<html>blocked</html>", { status: 200 }));
    const http = createHttpClient({ source: "steam", label: "Steam" });
    await expect(http.json("https://example.test/a")).rejects.toMatchObject({ retryable: true });
  });

  it("context 를 주면 에러 메시지에 URL 대신 그 값이 들어간다", async () => {
    stubFetch(json({}, 500));
    const http = createHttpClient({ source: "rss", label: "RSS" });
    await expect(http.text("https://example.test/feed.xml", { context: "루리웹" })).rejects.toThrowError("RSS HTTP 500 (루리웹)");
  });

  it("raw 는 상태 검사를 하지 않는다 (호출부가 403 을 직접 처리)", async () => {
    stubFetch(json({}, 403));
    const http = createHttpClient({ source: "hltb", label: "HLTB" });
    const res = await http.raw("https://example.test/search", { method: "POST" });
    expect(res.status).toBe(403);
  });
});
