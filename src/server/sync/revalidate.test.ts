// revalidate 호출 규칙 — fetch 는 스텁, 네트워크 없음
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { REVALIDATE_TAGS_PER_REQUEST } from "@/lib/cache";
import { revalidateGameTags } from "./revalidate";

function stubFetch(status = 200) {
  const fn = vi.fn(async () => new Response(JSON.stringify({ revalidated: true }), { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

const bodyTags = (fn: ReturnType<typeof stubFetch>, call: number): string[] =>
  JSON.parse((fn.mock.calls[call][1] as RequestInit).body as string).tags;

beforeEach(() => {
  process.env.NEXT_PUBLIC_APP_URL = "https://example.test";
  process.env.CRAWL_SECRET = "secret";
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.NEXT_PUBLIC_APP_URL;
  delete process.env.CRAWL_SECRET;
});

describe("revalidateGameTags", () => {
  it("게임, 회사 슬러그를 태그로 바꿔 한 번에 보낸다", async () => {
    const fetchMock = stubFetch();
    await revalidateGameTags(["elden-ring"], ["fromsoftware"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(bodyTags(fetchMock, 0)).toEqual(["game:elden-ring", "company:fromsoftware"]);
  });

  it("상한을 넘는 태그는 나눠 보낸다 — 한 번에 보내면 라우트가 400 을 준다", async () => {
    const fetchMock = stubFetch();
    const slugs = Array.from({ length: REVALIDATE_TAGS_PER_REQUEST + 3 }, (_, i) => `game-${i}`);
    await revalidateGameTags(slugs);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(bodyTags(fetchMock, 0)).toHaveLength(REVALIDATE_TAGS_PER_REQUEST);
    expect(bodyTags(fetchMock, 1)).toEqual(["game:game-500", "game:game-501", "game:game-502"]);
  });

  it("실패한 묶음의 범위를 메시지에 남긴다", async () => {
    stubFetch(400);
    await expect(revalidateGameTags(["a"])).rejects.toThrow("revalidate HTTP 400 (1~1/1)");
  });

  it("보낼 것이 없으면 요청하지 않는다", async () => {
    const fetchMock = stubFetch();
    await revalidateGameTags([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("주소나 비밀키가 없으면 조용히 생략한다 — 크롤 결과까지 버리지 않는다", async () => {
    const fetchMock = stubFetch();
    delete process.env.CRAWL_SECRET;
    await revalidateGameTags(["a"]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
