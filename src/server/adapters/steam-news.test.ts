// Steam 패치 공지 파서 테스트 — fixture 기반(ISteamNews 실응답, 엘든 링 1245620), 네트워크 없음
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { AdapterError } from "./types";
import { parseSteamPatchNotes } from "./steam";

const raw: unknown = JSON.parse(
  readFileSync(fileURLToPath(new URL("./__fixtures__/steam-news.json", import.meta.url)), "utf8"),
);

describe("parseSteamPatchNotes", () => {
  it("공지를 패치 기록으로 바꾼다", () => {
    const notes = parseSteamPatchNotes(raw, "1245620");
    expect(notes.length).toBeGreaterThan(0);
    const first = notes[0];
    expect(first.externalId).toBe("1818752592134836");
    expect(first.title).toBe("Release Note for 2025/12/16");
    // 제목이 날짜뿐이면 버전은 없다 — 날짜를 버전으로 적지 않는다
    expect(first.version).toBeNull();
    expect(first.publishedAt).toBe(new Date(1765868757 * 1000).toISOString());
  });

  it("글 주소는 akamaihd 리다이렉트가 아니라 스토어 주소로 만든다", () => {
    const notes = parseSteamPatchNotes(raw, "1245620");
    expect(notes[0].url).toBe("https://store.steampowered.com/news/app/1245620/view/1818752592134836");
  });

  it("제목에 버전이 있으면 읽어낸다", () => {
    const notes = parseSteamPatchNotes(raw, "1245620");
    expect(notes.find((n) => n.title.includes("1.16.1"))?.version).toBe("1.16.1");
  });

  it("patchnotes 태그가 없는 공지는 버린다 — 태그 필터가 빠진 채 호출될 수 있다", () => {
    const mixed = {
      appnews: {
        appid: 1,
        newsitems: [
          { gid: "1", title: "여름 세일 안내", date: 1700000000, tags: ["mod_reviewed"] },
          { gid: "2", title: "Patch 1.2", date: 1700000001, tags: ["patchnotes"] },
        ],
      },
    };
    const notes = parseSteamPatchNotes(mixed, "1");
    expect(notes.map((n) => n.externalId)).toEqual(["2"]);
  });

  it("기록이 없으면 빈 배열", () => {
    expect(parseSteamPatchNotes({ appnews: { appid: 1, newsitems: [] } }, "1")).toEqual([]);
  });

  it("응답 형식이 깨지면 조용히 넘기지 않고 실패시킨다", () => {
    expect(() => parseSteamPatchNotes({ appnews: { newsitems: [{ gid: "1" }] } }, "1")).toThrow(AdapterError);
  });
});
