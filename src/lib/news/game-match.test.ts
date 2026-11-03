// 뉴스 제목 게임 매칭 — 2026-11-03 실측에서 나온 오매칭을 그대로 막는지 본다
import { describe, expect, it } from "vitest";
import { matchNewsToGame, type NewsMatchTarget } from "@/lib/news/game-match";

const g = (id: string, needles: string[], known = true): NewsMatchTarget => ({ id, slug: id, needles: needles.map((n) => n.toLowerCase()), known });

const index = [
  g("elden-ring", ["Elden Ring"]),
  g("nightreign", ["Elden Ring Nightreign"]),
  g("go", ["Go"]),
  g("raft", ["Raft"]),
  g("rock", ["Rock"], false),
  g("velo", ["Velo"], false),
  g("third-wave", ["Third Wave"], false),
  g("the-company", ["The Company"], false),
  g("phantom-blade-zero", ["Phantom Blade Zero"], false),
  g("survival", ["Survival"], false),
  g("minecraft", ["Minecraft"]),
  g("doom", ["DOOM"]),
  g("blue-archive", ["Blue Archive", "블루 아카이브"]),
  g("pangtopia", ["팽토피아"], false),
];

const pick = (title: string) => matchNewsToGame(title, index)?.id ?? null;

describe("matchNewsToGame", () => {
  it("여러 개가 맞으면 가장 긴 제목", () => {
    expect(pick("Elden Ring Nightreign patch 1.02 is out")).toBe("nightreign");
    expect(pick("ELDEN RING sale")).toBe("elden-ring");
  });

  it("너무 짧은 제목은 붙이지 않는다", () => {
    expect(pick("Let's go outside")).toBeNull();
  });

  it("낱말 안에 든 글자는 붙이지 않는다(Warcraft 의 raft, Developer 의 velo)", () => {
    expect(pick("World of Warcraft Forever nerfs popular classes")).toBeNull();
    expect(pick("Star Wars Zero Company developer sees workers return")).toBeNull();
    expect(pick("Rockstar traveled across Florida for GTA 6")).toBeNull();
    expect(pick("Konami planning 'second and third waves' of Silent Hill")).toBeNull();
  });

  it("한 낱말 제목은 알려진 게임만", () => {
    expect(pick("New open-world co-op survival game confirmed")).toBeNull();
    expect(pick("Mini Review: Minecraft (Switch 2)")).toBe("minecraft");
    expect(pick("Two creators of the original Doom are arguing")).toBe("doom");
  });

  it("두 낱말 이하(관사 빼고) 제목도 알려진 게임만", () => {
    expect(pick("Third Wave gets a release date")).toBeNull();
    expect(pick("Microsoft offers buyouts to around 600 people at the company")).toBeNull();
  });

  it("세 낱말 이상 제목은 알려지지 않아도 낱말 단위면 붙인다", () => {
    expect(pick("Phantom Blade Zero review")).toBe("phantom-blade-zero");
  });

  it("한글 제목 뒤 조사는 붙어도 된다", () => {
    expect(pick("블루 아카이브가 일본 서버를 넘긴다")).toBe("blue-archive");
  });

  it("한글 기사에서 따옴표 안 한 낱말은 알려지지 않아도 붙인다", () => {
    expect(pick("육각 타일에서 펼쳐지는 전략 퍼즐 '팽토피아' 정식 출시")).toBe("pangtopia");
    expect(pick("‘팽토피아’, 정식 출시")).toBe("pangtopia");
    expect(pick("'팽토피아'가 정식 출시")).toBe("pangtopia");
    expect(pick("팽토피아 정식 출시")).toBeNull();
    // 영문 제목의 따옴표는 발언 인용이라 표지로 보지 않는다
    expect(pick("Players invited to a 'Survival' test")).toBeNull();
  });
});
