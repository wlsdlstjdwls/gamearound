import { describe, expect, it } from "vitest";
import { isPlayKind, primaryPlayLink } from "@/lib/indie/promo";

describe("primaryPlayLink", () => {
  it("체험판이 스토어보다 앞이다", () => {
    const links = [
      { kind: "site", url: "https://a" },
      { kind: "store:pc", url: "https://b" },
      { kind: "demo", url: "https://c" },
    ];
    expect(primaryPlayLink(links, ["pc"])).toEqual({ index: 2, kind: "demo" });
  });
  it("스토어끼리는 웹, PC 순", () => {
    const links = [
      { kind: "store:switch", url: "https://a" },
      { kind: "store:pc", url: "https://b" },
      { kind: "store:web", url: "https://c" },
    ];
    expect(primaryPlayLink(links, ["switch", "pc", "web"])?.index).toBe(2);
    expect(primaryPlayLink(links, ["switch", "pc"])?.index).toBe(1);
  });
  it("고른 플랫폼에 없는 스토어 링크는 안 본다", () => {
    expect(primaryPlayLink([{ kind: "store:pc", url: "https://a" }], ["switch"])).toBeNull();
  });
  it("플레이할 링크가 없으면 null", () => {
    expect(primaryPlayLink([{ kind: "site", url: "https://a" }, { kind: "funding", url: "https://b" }], ["pc"])).toBeNull();
  });
});

describe("isPlayKind", () => {
  it("체험판, 스토어는 플레이, 사이트와 펀딩은 아니다", () => {
    expect(isPlayKind("demo")).toBe(true);
    expect(isPlayKind("store")).toBe(true);
    expect(isPlayKind("store:xbox")).toBe(true);
    expect(isPlayKind("store:nope")).toBe(false);
    expect(isPlayKind("site")).toBe(false);
    expect(isPlayKind("funding")).toBe(false);
  });
});
