import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isBonusTitle, parseBonusArticle, parseNewsList } from "./parse";

const fixture = (name: string) => readFileSync(path.join(__dirname, "..", "__fixtures__", `nintendo-kr-news-${name}.html`), "utf8");

describe("parseNewsList", () => {
  it("한 쪽 24건을 제목, 날짜, slug 로 읽는다", () => {
    const items = parseNewsList(fixture("list"));
    expect(items.length).toBe(24);
    expect(items[0]).toMatchObject({ slug: expect.any(String), title: expect.any(String) });
    expect(items.every((i) => /^\d{4}-\d{2}-\d{2}T/.test(i.publishedAt))).toBe(true);
  });
});

describe("isBonusTitle", () => {
  it("예약 특전 글만 고른다", () => {
    expect(isBonusTitle("『스타폭스』 패키지 버전 예약 및 조기 구입 특전 안내")).toBe(true);
    expect(isBonusTitle("Nintendo Switch 2 소프트웨어 『Minecraft』 패키지 버전 예약 판매 일정 안내")).toBe(false);
    expect(isBonusTitle("Nintendo Switch 2와 소프트웨어를 함께 구매하고 「마리오 피규어」를 받아보세요!")).toBe(false);
  });
});

describe("parseBonusArticle", () => {
  it("젤다: 소제목과 증정 문단 짝을 특전으로, 다운로드판은 마감일까지", () => {
    const a = parseBonusArticle(fixture("zelda"));
    expect(a.nsuids).toContain("70010000130794");
    const names = a.bonuses.map((b) => b.name);
    expect(names).toEqual(expect.arrayContaining(["에코백", "아크릴 스탠드", "무릎담요", "데스크패드, 키캡키링"]));
    // 홍보 문장뿐인 Nintendo Store 한정 특전은 뽑지 않는다(판매처 문단이 없다)
    expect(names.some((n) => n.includes("Nintendo Store 한정"))).toBe(false);
    const bag = a.bonuses.find((b) => b.name === "에코백")!;
    expect(bag.retailers).toContain("오프라인 대원샵");
    expect(bag.retailers).not.toMatch(/구입 시 증정/);
    expect(bag.imageUrl).toMatch(/^https:\/\/images\.ctfassets\.net\//);
    const desk = a.bonuses.find((b) => b.name === "데스크패드, 키캡키링")!;
    expect(desk.notes).toContain("데스크패드와 키캡키링 중 1개 선택");
    const dl = a.bonuses.find((b) => b.edition === "download")!;
    expect(dl).toMatchObject({ name: "다운로드 버전 조기 구입 특전", endsOn: "2026-11-08", retailers: "닌텐도 e숍" });
    // 주변기기 판매처 안내(오프라인, 온라인 소제목)는 증정 문단이 없어 특전이 아니다
    expect(names).not.toContain("오프라인");
  });

  it("가운뎃점 나열은 쉼표로 바꾼다", () => {
    const all = parseBonusArticle(fixture("zelda")).bonuses.map((b) => b.retailers ?? "").join(" ");
    expect(all).not.toMatch(/[·・]/);
  });

  it("스타폭스: 특전 이름을 h1 로 쓴 글도 읽는다", () => {
    const a = parseBonusArticle(fixture("starfox"));
    expect(a.bonuses.map((b) => b.name)).toEqual(["아크릴 키링", "장패드"]);
    expect(a.nsuids).toEqual(expect.arrayContaining(["70010000096819", "70010000096823"]));
  });

  it("스플래툰 레이더스: 특전 넷", () => {
    const a = parseBonusArticle(fixture("splatoon"));
    expect(a.bonuses.map((b) => b.name)).toEqual(["메탈 키링", "장패드", "머그컵", "키캡 키링"]);
    expect(a.bonuses.find((b) => b.name === "머그컵")?.retailers).toBe("토이저러스몰");
  });

  it("특전이 없는 예약 안내 글은 빈 결과", () => {
    expect(parseBonusArticle(fixture("minecraft")).bonuses).toEqual([]);
  });
});
