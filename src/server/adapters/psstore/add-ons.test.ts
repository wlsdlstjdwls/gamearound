// 콘셉트 페이지 HTML → DLC 상품 id. 픽스처는 실제 응답에서 애드온 구간만 잘라 온 것이다(네트워크 없음).
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parsePsstoreAddOnIds } from "./add-ons";

const fixture = (name: string): string =>
  readFileSync(path.join(__dirname, "..", "__fixtures__", name), "utf8");

const one = fixture("psstore-concept-addons.html");
const many = fixture("psstore-concept-addons-many.html");

describe("parsePsstoreAddOnIds", () => {
  it("애드온이 하나인 게임에서 그 상품 id 를 뽑는다", () => {
    expect(parsePsstoreAddOnIds(one)).toEqual(["HP1003-PPSA02532_00-DE1KEYDELUXEPACK"]);
  });

  it("가상화폐 팩은 DLC 가 아니라 결제 수단이라 뺀다", () => {
    const ids = parsePsstoreAddOnIds(many);
    expect(ids).toContain("HP0700-PPSA10593_00-TK8S3CHARASTPASS"); // 시즌 패스는 남는다
    expect(ids).not.toContain("HP0700-PPSA10593_00-TK800TKCOIN10006"); // TEKKEN COINS 는 빠진다
    expect(ids.some((id) => id.includes("TKCOIN"))).toBe(false);
  });

  it("노출 순서를 지키고 중복은 한 번만 담는다", () => {
    const ids = parsePsstoreAddOnIds(many);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    // 페이지가 준 첫 상품(가상화폐가 아닌 것)이 맨 앞이다
    expect(ids[0]).toBe("HP0700-PPSA10593_00-TK8S3CHARASTPASS");
  });

  it("추가 콘텐츠가 없는 페이지는 빈 목록이다 — 오류가 아니다", () => {
    expect(parsePsstoreAddOnIds("<html><body>추가 콘텐츠 없음</body></html>")).toEqual([]);
  });

  it("표지는 있는데 가리키는 script 가 없으면 빈 목록", () => {
    expect(parsePsstoreAddOnIds('<div data-mfe-name="addOns" data-initial="env:없음"></div>')).toEqual([]);
  });

  it("JSON 이 깨졌으면 조용히 넘기지 않고 알린다 — 페이지 구조 변경 신호다", () => {
    const broken = '<script id="env:x" type="application/json">{"cache":</script><div data-mfe-name="addOns" data-initial="env:x"></div>';
    expect(() => parsePsstoreAddOnIds(broken)).toThrowError(/추가 콘텐츠 JSON 파싱 실패/);
  });
});
