// 목록 화면 robots 규칙 — 쿼리가 붙은 주소만 막고 맨 주소는 열어 둔다(constants 의 ROBOTS_DISALLOW 주석)
import { describe, expect, it } from "vitest";
import { ROUTES } from "@/lib/routes";
import { FILTERED_LIST_ROBOTS, ROBOTS_DISALLOW, hasQueryValues, withListRobots } from "./constants";

/** robots.txt 의 접두사 맞춤을 흉내 낸다(와일드카드는 쓰지 않으므로 접두사만 본다) */
const blocked = (path: string) => ROBOTS_DISALLOW.some((rule) => path.startsWith(rule));

describe("ROBOTS_DISALLOW 목록 쿼리", () => {
  it("쿼리가 붙은 목록은 막는다", () => {
    expect(blocked(`${ROUTES.game}?genre=RPG&page=3`)).toBe(true);
    expect(blocked(`${ROUTES.upcoming}?month=2026-12`)).toBe(true);
    expect(blocked(`${ROUTES.company}?country=JP`)).toBe(true);
    expect(blocked(`${ROUTES.news}?page=2`)).toBe(true);
  });

  it("맨 목록과 상세는 열어 둔다", () => {
    expect(blocked(ROUTES.game)).toBe(false);
    expect(blocked(`${ROUTES.game}/elden-ring`)).toBe(false);
    expect(blocked(ROUTES.upcoming)).toBe(false);
    expect(blocked(`${ROUTES.company}/nintendo`)).toBe(false);
  });
});

describe("withListRobots", () => {
  it("값 있는 쿼리가 있을 때만 noindex 를 얹는다", () => {
    expect(withListRobots({ title: "t" }, {})).toEqual({ title: "t" });
    expect(withListRobots({ title: "t" }, { page: "", genre: undefined })).toEqual({ title: "t" });
    expect(withListRobots({ title: "t" }, { page: "2" })).toEqual({ title: "t", robots: FILTERED_LIST_ROBOTS });
  });

  it("배열 값은 하나라도 차 있으면 쿼리로 본다", () => {
    expect(hasQueryValues({ platform: ["", "ps5"] })).toBe(true);
    expect(hasQueryValues({ platform: [""] })).toBe(false);
  });
});
