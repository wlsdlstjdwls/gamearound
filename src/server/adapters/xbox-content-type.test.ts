import { describe, expect, it } from "vitest";
import { xboxContentType } from "./xbox-content-type";

const base = { productKind: "Game", isDemo: false, categories: ["Action & adventure"], title: "Some Game" };

describe("xboxContentType", () => {
  it("본편", () => expect(xboxContentType(base)).toBe("game"));
  it("Durable 은 추가 콘텐츠", () => expect(xboxContentType({ ...base, productKind: "Durable" })).toBe("dlc"));
  it("재화는 ProductKind 가 Game 이어도 추가 콘텐츠", () => expect(xboxContentType({ ...base, title: "Car Voucher 4" })).not.toBe("game"));
  it("스토어가 체험판이라고 하면 체험판(실측: ScreamRide Demo)", () => {
    expect(xboxContentType({ ...base, isDemo: true, title: "ScreamRide Demo" })).toBe("demo");
  });
  it("곁들이 앱은 IsDemo 가 true 여도 소프트웨어(실측: Kinect Sports Rivals Hub)", () => {
    expect(xboxContentType({ ...base, isDemo: true, categories: ["Family & kids", "Sports", "Companion"] })).toBe("software");
  });
  it("Application 은 소프트웨어", () => expect(xboxContentType({ ...base, productKind: "Application" })).toBe("software"));
  it("제목 끝 Trial 만으로는 가르지 않는다(Taboo Trial 은 정식 게임이다)", () => {
    expect(xboxContentType({ ...base, title: "Taboo Trial" })).toBe("game");
  });
  it("카테고리가 null 이어도 읽는다(실측: DiO Dungeon 2)", () => {
    expect(xboxContentType({ ...base, categories: null, isDemo: null })).toBe("game");
  });
});
