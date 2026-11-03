// 번역 어댑터 — fetch 스텁으로 요청 꼴, 순서, 실패 처리를 본다(네트워크 없음)
import { afterEach, describe, expect, it, vi } from "vitest";
import { deeplUrl, translateToKorean } from "@/server/adapters/translate";
import { DEEPL_API_KEY_ENV, DEEPL_FREE_URL, DEEPL_MAX_TEXTS, DEEPL_PRO_URL } from "@/server/adapters/translate/constants";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("translateToKorean", () => {
  it("키가 없으면 요청하지 않고 전부 null", async () => {
    vi.stubEnv(DEEPL_API_KEY_ENV, "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await translateToKorean(["Hello"])).toEqual([null]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("무료 키는 무료 주소, 순서대로 돌려준다", async () => {
    vi.stubEnv(DEEPL_API_KEY_ENV, "abc:fx");
    const fetchMock = vi.fn().mockResolvedValue(json({ translations: [{ text: "안녕" }, { text: "세계" }] }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await translateToKorean(["Hello", "World"])).toEqual(["안녕", "세계"]);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(DEEPL_FREE_URL);
    expect(JSON.parse(String(init.body))).toEqual({ text: ["Hello", "World"], target_lang: "KO" });
    expect(new Headers(init.headers).get("Authorization")).toBe("DeepL-Auth-Key abc:fx");
  });

  it("50건씩 나눠 보낸다", async () => {
    vi.stubEnv(DEEPL_API_KEY_ENV, "abc:fx");
    const fetchMock = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
      const { text } = JSON.parse(String(init.body)) as { text: string[] };
      return json({ translations: text.map((t) => ({ text: `ko:${t}` })) });
    });
    vi.stubGlobal("fetch", fetchMock);
    const texts = Array.from({ length: DEEPL_MAX_TEXTS + 3 }, (_, i) => `t${i}`);
    const out = await translateToKorean(texts);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(out[0]).toBe("ko:t0");
    expect(out[DEEPL_MAX_TEXTS + 2]).toBe(`ko:t${DEEPL_MAX_TEXTS + 2}`);
  });

  it("한도 초과(456)면 던지지 않고 null, 다음 묶음도 보내지 않는다", async () => {
    vi.stubEnv(DEEPL_API_KEY_ENV, "abc:fx");
    const fetchMock = vi.fn().mockResolvedValue(json({ message: "Quota exceeded" }, 456));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const out = await translateToKorean(Array.from({ length: DEEPL_MAX_TEXTS + 1 }, () => "x"));
    expect(out.every((t) => t === null)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("deeplUrl", () => {
  it("유료 키는 유료 주소", () => {
    expect(deeplUrl("abc")).toBe(DEEPL_PRO_URL);
  });
});
