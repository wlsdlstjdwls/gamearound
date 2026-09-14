import { afterEach, describe, expect, it, vi } from "vitest";
import { CRAWL_PROXY_URL_ENV, createHttpClient, crawlProxyUrl, headerPairs, isRetryableStatus, notFoundAs } from "./http";
import { curlArgs, splitCurlOutput } from "./curl";
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

describe("headerPairs", () => {
  it("선언 순서와 대소문자를 그대로 지킨다 — 이 순서 자체가 지문이 되는 소스가 있다", () => {
    const pairs = headerPairs({ "User-Agent": "UA", Accept: "*/*", Origin: "https://x", Referer: "https://x/y" }, "application/json", undefined);
    expect(pairs).toEqual([
      ["User-Agent", "UA"],
      ["Accept", "*/*"],
      ["Origin", "https://x"],
      ["Referer", "https://x/y"],
    ]);
  });

  it("같은 이름은 뒤 값으로 덮되 자리는 그대로 둔다", () => {
    const pairs = headerPairs({ "User-Agent": "UA", Accept: "*/*" }, "application/json", { accept: "text/html" });
    expect(pairs).toEqual([
      ["User-Agent", "UA"],
      ["accept", "text/html"],
    ]);
  });

  it("빠진 UA, Accept 는 뒤에 채운다", () => {
    expect(headerPairs({ Origin: "https://x" }, "application/json", undefined)).toEqual([
      ["Origin", "https://x"],
      ["User-Agent", CRAWLER_USER_AGENT],
      ["Accept", "application/json"],
    ]);
  });
});

describe("curl 인자, 출력", () => {
  it("본문은 인자가 아니라 stdin 으로 넘긴다(@-)", () => {
    const args = curlArgs("https://x/graphql", { method: "POST", headers: [["Origin", "https://x"]], body: "{}", timeoutMs: 15_000 });
    expect(args).toContain("--data-binary");
    expect(args).toContain("@-");
    expect(args.join(" ")).toContain("--header Origin: https://x");
    expect(args).toContain("--request");
    expect(args[args.length - 1]).toBe("https://x/graphql");
    expect(args).not.toContain("{}");
  });

  it("GET 은 --request 를 붙이지 않는다", () => {
    expect(curlArgs("https://x", { timeoutMs: 1_000 })).not.toContain("--request");
  });

  it("프록시를 주면 --proxy 로 넘긴다", () => {
    const args = curlArgs("https://x", { timeoutMs: 1_000, proxy: "http://u:p@proxy.test:8080" });
    expect(args).toContain("--proxy");
    expect(args[args.indexOf("--proxy") + 1]).toBe("http://u:p@proxy.test:8080");
  });

  it("프록시가 없으면 --proxy 가 붙지 않는다", () => {
    expect(curlArgs("https://x", { timeoutMs: 1_000 })).not.toContain("--proxy");
  });

  it("출력 끝의 상태 표시를 본문과 가른다", () => {
    expect(splitCurlOutput('{"a":1}\n__curl_status__:200')).toEqual({ status: 200, body: '{"a":1}' });
  });

  it("상태 표시가 없으면 0 으로 본다 (curl 이 응답을 못 받음)", () => {
    expect(splitCurlOutput("")).toEqual({ status: 0, body: "" });
  });
});

describe("viaProxy", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("프록시 환경변수가 비어 있으면 평소대로 fetch 로 나간다", async () => {
    vi.stubEnv(CRAWL_PROXY_URL_ENV, "");
    const fetchMock = stubFetch(json({ ok: true }));
    const http = createHttpClient({ source: "nintendo", label: "Nintendo", viaProxy: true });
    await http.json("https://example.test/a");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("viaProxy 가 아닌 소스는 프록시가 있어도 직접 나간다", async () => {
    vi.stubEnv(CRAWL_PROXY_URL_ENV, "http://proxy.test:8080");
    const fetchMock = stubFetch(json({ ok: true }));
    const http = createHttpClient({ source: "steam", label: "Steam" });
    await http.json("https://example.test/a");
    expect(fetchMock).toHaveBeenCalledTimes(1); // DB, Redis 트래픽까지 유료 프록시로 보내지 않는다
  });

  it("crawlProxyUrl 은 공백만 있는 값을 비어 있는 것으로 본다", () => {
    vi.stubEnv(CRAWL_PROXY_URL_ENV, "   ");
    expect(crawlProxyUrl()).toBeUndefined();
    vi.stubEnv(CRAWL_PROXY_URL_ENV, "http://proxy.test:8080");
    expect(crawlProxyUrl()).toBe("http://proxy.test:8080");
  });
});
