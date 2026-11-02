import { describe, expect, it } from "vitest";
import { matchIndex, pushRecent, searchMenu, type MenuEntry } from "@/lib/admin/menu-search";

const ENTRIES: MenuEntry[] = [
  { href: "/admin/pricing", label: "상품등록", group: "상품관리", keywords: ["요금", "멤버십 상품"] },
  { href: "/admin/discounts", label: "프로모션등록", group: "상품관리", keywords: ["할인"] },
  { href: "/admin/payments", label: "결제/환불관리", group: "주문관리", keywords: ["환불", "주문"] },
  { href: "/admin/matches", label: "스토어매칭승인관리", group: "데이터관리" },
  { href: "/admin/products", label: "매장상품매핑관리", group: "매장관리" },
];
const hrefs = (q: string) => searchMenu(ENTRIES, q).map((e) => e.href);

describe("matchIndex", () => {
  it("온글자, 초성, 섞어 쓰기 모두 맞춘다", () => {
    expect(matchIndex("상품등록", "상품")).toBe(0);
    expect(matchIndex("상품등록", "ㅅㅍㄷㄹ")).toBe(0);
    expect(matchIndex("상품등록", "상ㅍ")).toBe(0);
    expect(matchIndex("스토어매칭승인관리", "ㅁㅊ")).toBe(3);
  });
  it("띄어쓰기, 빗금, 대소문자는 무시한다", () => {
    expect(matchIndex("결제/환불관리", "결제 환불")).toBe(0);
    expect(matchIndex("Steam 연결", "steam")).toBe(0);
  });
  it("안 맞으면 -1", () => {
    expect(matchIndex("상품등록", "ㅎㅂ")).toBe(-1);
  });
});

describe("searchMenu", () => {
  it("빈 질의는 빈 목록", () => {
    expect(hrefs("  ")).toEqual([]);
  });
  it("이름 앞머리가 가운데보다 먼저다", () => {
    // "상품" 은 상품등록 앞머리, 매장상품매핑관리 가운데, 프로모션등록은 묶음 이름(상품관리)에만 걸린다
    expect(hrefs("상품")).toEqual(["/admin/pricing", "/admin/products", "/admin/discounts"]);
  });
  it("별칭으로 찾는다", () => {
    expect(hrefs("환불")).toEqual(["/admin/payments"]);
    expect(hrefs("할인")).toEqual(["/admin/discounts"]);
  });
  it("묶음 이름으로 찾으면 그 묶음 칸이 다 나온다(이름에 걸린 칸 뒤에)", () => {
    expect(hrefs("주문관리")).toEqual(["/admin/payments"]);
    expect(hrefs("상품관리")).toEqual(["/admin/pricing", "/admin/discounts"]);
  });
  it("초성으로 찾는다", () => {
    expect(hrefs("ㅁㅊㅅㅇ")).toEqual(["/admin/matches"]);
  });
});

describe("pushRecent", () => {
  it("앞에 올리고 겹치면 하나만, 넘치면 버린다", () => {
    expect(pushRecent(["/a", "/b", "/c"], "/b", 3)).toEqual(["/b", "/a", "/c"]);
    expect(pushRecent(["/a", "/b", "/c"], "/d", 3)).toEqual(["/d", "/a", "/b"]);
  });
});
