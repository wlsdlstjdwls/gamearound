import { describe, expect, it } from "vitest";
import { HOF_MIN_LIKES, isYm, kstYm, pickMyStanding, prevYm, scoreChangePct, ymLabel } from "@/lib/indie/fame";

describe("fame 달 도우미", () => {
  it("한국 달 경계로 센다", () => {
    expect(kstYm(new Date("2026-10-31T15:30:00Z"))).toBe("2026-11"); // KST 11-01 00:30
    expect(kstYm(new Date("2026-10-31T14:30:00Z"))).toBe("2026-10");
  });
  it("앞 달, 표기, 검사", () => {
    expect(prevYm("2026-01")).toBe("2025-12");
    expect(prevYm("2026-10")).toBe("2026-09");
    expect(ymLabel("2026-03")).toBe("2026년 3월");
    expect(isYm("2026-13")).toBe(false);
    expect(isYm("2026-09")).toBe(true);
  });
});

describe("scoreChangePct", () => {
  it("오른 만큼 정수 %", () => expect(scoreChangePct(127, 100)).toBe(27));
  it("내리면 음수", () => expect(scoreChangePct(90, 100)).toBe(-10));
  it("지난달 점수가 없으면 null(새로 진입)", () => {
    expect(scoreChangePct(50, 0)).toBeNull();
    expect(scoreChangePct(50, undefined)).toBeNull();
  });
});

describe("pickMyStanding", () => {
  const ranking = Array.from({ length: 10 }, (_, i) => ({ id: `r${i + 1}`, score: 100 - i * 5 }));
  it("내 게임이 없으면 null", () => {
    expect(pickMyStanding(ranking, [])).toBeNull();
  });
  it("순위 안이면 가장 높은 게임과 한 계단 위까지 모자란 점수", () => {
    const s = pickMyStanding(ranking, [
      { id: "r7", title: "가", slug: "a", score: 70, likes: 9 },
      { id: "r4", title: "나", slug: "b", score: 85, likes: 9 },
    ]);
    expect(s).toMatchObject({ slug: "b", rank: 4, score: 85, gapUp: 6 });
  });
  it("1위면 위가 없다", () => {
    expect(pickMyStanding(ranking, [{ id: "r1", title: "가", slug: "a", score: 100, likes: 9 }])?.gapUp).toBeNull();
  });
  it("순위 밖이면 찜 문턱과 10위까지 점수", () => {
    const s = pickMyStanding(ranking, [{ id: "x", title: "가", slug: "a", score: 20, likes: 2 }]);
    expect(s).toMatchObject({ rank: null, needLikes: HOF_MIN_LIKES - 2, gapUp: 36 });
  });
  it("10위가 비어 있으면 점수 차이를 말하지 않는다", () => {
    expect(pickMyStanding(ranking.slice(0, 3), [{ id: "x", title: "가", slug: "a", score: 1, likes: 9 }])).toMatchObject({ gapUp: null, needLikes: 0 });
  });
});
