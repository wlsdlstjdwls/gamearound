// 패치 제목 → 버전 파서. 예시는 전부 실제 관측한 제목이다(2026-09-15 Steam 공지).
import { describe, expect, it } from "vitest";
import { patchVersionFromTitle } from "./patch-version";

describe("patchVersionFromTitle", () => {
  it("제목 안의 버전을 읽는다", () => {
    expect(patchVersionFromTitle("ELDEN RING - Patch Notes Version 1.16.1")).toBe("1.16.1");
    expect(patchVersionFromTitle("Patch Notes Version 1.15")).toBe("1.15");
    expect(patchVersionFromTitle("Patch 2.31 Sep 11th 2025")).toBe("2.31");
    expect(patchVersionFromTitle("4.02 PATCH MARCH 13TH, 2023")).toBe("4.02");
  });

  it("v 접두사를 떼고 읽는다", () => {
    expect(patchVersionFromTitle("Out-Of-EA Update - Release - v4.1.1.3622274 - August 3rd 2023")).toBe("4.1.1.3622274");
  });

  it("버전이 없으면 null", () => {
    expect(patchVersionFromTitle("Counter-Strike 2 Update")).toBeNull();
    expect(patchVersionFromTitle("Baldur's Gate 3 is out now on PC!")).toBeNull();
  });

  it("점이 없는 한 자리 숫자는 버전으로 보지 않는다 — 회차, 시즌 번호와 구별이 안 된다", () => {
    expect(patchVersionFromTitle("Patch #1 Now Live! - Aug 25th 2023")).toBeNull();
    expect(patchVersionFromTitle("Hotfix #26 Now Live!")).toBeNull();
  });

  it("날짜를 버전으로 오독하지 않는다", () => {
    expect(patchVersionFromTitle("Release Note for 2025/12/16")).toBeNull();
    expect(patchVersionFromTitle("Update 2025.12.16")).toBeNull();
  });
});
