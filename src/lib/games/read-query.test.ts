// 주소 읽기 테스트 — 클라이언트가 먼저 그리는 값과 서버가 읽는 값이 같아야 한다(read-query 머리 주석).
import { describe, expect, it } from "vitest";
import { gamesHref } from "@/lib/games-query";
import { queryFromHref, readGamesQuery } from "./read-query";

describe("queryFromHref", () => {
  it("gamesHref 가 만든 주소를 되읽으면 같은 조건이다", () => {
    const q = readGamesQuery({ platform: "pc", genre: "어드벤처", ko: "1", nofree: "1", sort: "release" });
    expect(queryFromHref(gamesHref(q))).toEqual(q);
  });

  it("물음표가 없는 주소는 조건 없음이다", () => {
    expect(queryFromHref("/games")).toEqual(readGamesQuery({}));
  });

  it("모르는 플랫폼 값은 서버와 똑같이 버린다", () => {
    expect(queryFromHref("/games?platform=pc,nope").platform).toBe(readGamesQuery({ platform: "pc" }).platform);
  });
});
