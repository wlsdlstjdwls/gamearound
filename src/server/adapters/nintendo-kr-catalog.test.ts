import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseKrCatalog } from "./nintendo";

const fixture = (name: string) =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)), "utf8"));

describe("parseKrCatalog", () => {
  it("살 수 있는 다운로드 본편(7001)만 남긴다", () => {
    const page = parseKrCatalog(fixture("nintendo-kr-catalog.json"));
    expect(page.rawCount).toBe(5);
    expect(page.candidates).toEqual([
      {
        externalId: "70010000011852",
        title: "The World Ends with You -Final Remix-",
        url: "https://store.nintendo.co.kr/70010000011852",
      },
    ]);
  });

  it("빈 쪽은 목록의 끝이다", () => {
    expect(parseKrCatalog({ items: [] })).toEqual({ candidates: [], rawCount: 0 });
    expect(parseKrCatalog(null)).toEqual({ candidates: [], rawCount: 0 });
  });
});
