// 패치 종류 읽기 — 실제로 수집된 제목을 그대로 넣어 본다(2026-09-15 DB 표본).
import { describe, expect, it } from "vitest";
import { patchKindLabels, patchKindsFromTitle } from "./patch-kind";

describe("patchKindsFromTitle", () => {
  it("둘 다 걸리면 구체적인 것이 앞에 온다", () => {
    expect(patchKindsFromTitle("v1.0.4: Balance Adjustments & Bug Fixes")).toEqual(["balance", "bugfix"]);
  });

  it("핫픽스는 버그 수정보다 앞이다 — 급한 패치라는 사실이 더 큰 정보다", () => {
    expect(patchKindsFromTitle("Hotfix v0.5.1: Fixed Pals disappearing from the Dimensional Pal Storage")).toEqual([
      "hotfix",
      "bugfix",
    ]);
  });

  it("대소문자를 섞어 써도 같은 종류로 읽는다", () => {
    expect(patchKindsFromTitle("v1.0.2: Bug fixes")).toEqual(["bugfix"]);
    expect(patchKindsFromTitle("v0.6.9: Bug Fixes")).toEqual(["bugfix"]);
  });

  it("서버, 연결 문제는 성능 쪽으로 읽는다", () => {
    expect(patchKindsFromTitle("v0.6.9.82911: Multiplayer connectivity improvements")).toEqual(["stability", "improvement"]);
  });

  it("읽을 신호가 없으면 아무 말도 하지 않는다 — 틀린 딱지는 없는 딱지보다 나쁘다", () => {
    expect(patchKindsFromTitle("Patch 5.1.1 (June 18, 2026)")).toEqual([]);
    expect(patchKindsFromTitle("1.4a (2023-12-28)")).toEqual([]);
  });
});

describe("patchKindLabels", () => {
  it("한글 딱지를 최대 두 개까지 준다", () => {
    expect(patchKindLabels("Update v0.4.12: Xenolord Raid Balance + Bug Fixes")).toEqual(["밸런스", "버그 수정"]);
  });

  it("종류를 못 읽으면 빈 배열이다", () => {
    expect(patchKindLabels("Patch 08/21/2017 (22 August 2017)")).toEqual([]);
  });
});
