// 콘셉트 페이지에서 기본 상품 소개 꺼내기 — 2026-11-19 진짜 페이지(진격의 거인 3)에서 캐시 블록의 필요한 칸만 남긴 견본
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parsePsstoreDescription, psstoreDescriptionText } from "./preorder-page";

const fixture = (name: string): string => readFileSync(fileURLToPath(new URL(`../__fixtures__/${name}`, import.meta.url)), "utf8");
const block = (cache: unknown) => `<script id="env:x" type="application/json">${JSON.stringify({ cache })}</script>`;

describe("parsePsstoreDescription", () => {
  it("블록이 나뉘어 와도 기본 상품의 LONG 을 읽고, 콘셉트 이름을 제목으로 쓴다", () => {
    const page = parsePsstoreDescription(fixture("psstore-preorder-page.html"));
    expect(page?.title).toBe("진격의거인３");
    expect(page?.description?.startsWith("[예약 특전]\n・주인공 의상")).toBe(true);
  });

  it("콘셉트 자신의 LONG(게임 소개)은 읽지 않는다", () => {
    const page = parsePsstoreDescription(fixture("psstore-preorder-page.html"));
    expect(page?.description).not.toMatch(/^모든 적을 구축하라/);
  });

  it("기본 상품이 없거나 그 상품에 소개 칸이 없으면 null(모름), 칸은 있는데 LONG 이 없으면 소개만 비운다(특전 없음)", () => {
    expect(parsePsstoreDescription("<html></html>")).toBeNull();
    expect(parsePsstoreDescription(block({ "Concept:1": { name: "게임" } }))).toBeNull();
    const ref = { name: "게임", defaultProduct: { __ref: "Product:P" } };
    expect(parsePsstoreDescription(block({ "Concept:1": ref, "Product:P": { name: "게임 (한국어)" } }))).toBeNull();
    expect(parsePsstoreDescription(block({ "Concept:1": ref, "Product:P": { descriptions: [{ type: "SHORT", value: "짧은 소개" }] } }))).toEqual({
      title: "게임",
      description: null,
    });
  });
});

describe("psstoreDescriptionText", () => {
  it("<br> 은 줄바꿈, 나머지 태그는 걷고, 문자 참조를 푼다", () => {
    expect(psstoreDescriptionText("[예약 특전]<br/>・A &amp; B<br><b>굵게</b>&#9733;")).toBe("[예약 특전]\n・A & B\n굵게★");
  });
});
