import { describe, expect, it } from "vitest";
import { decideStatus, titleNeedle } from "./preorder-bonuses";

const bonus = { edition: "package" as const, name: "에코백", retailers: "토이저러스몰", notes: [], imageUrl: null, endsOn: null };

describe("decideStatus", () => {
  it("특전이 있고 게임을 이었으면 바로 공개", () => {
    expect(decideStatus({ nsuids: ["70010000130794"], bonuses: [bonus] }, true)).toEqual({ status: "published", reason: null });
  });

  it("게임을 못 이었으면 검토 대기 — 번호를 사유에 남긴다", () => {
    const r = decideStatus({ nsuids: ["70010000130794"], bonuses: [bonus] }, false);
    expect(r.status).toBe("review");
    expect(r.reason).toContain("70010000130794");
  });

  it("특전을 못 뽑았으면 게임을 이었어도 공개하지 않는다 — 빈 마디가 선다", () => {
    expect(decideStatus({ nsuids: [], bonuses: [] }, true).status).toBe("review");
  });
});

describe("titleNeedle", () => {
  it("DB 의 정규화와 같다 — 글자와 숫자만, 소문자", () => {
    expect(titleNeedle("시드 마이어의 문명 VII")).toBe("시드마이어의문명vii");
    expect(titleNeedle("Minecraft Dungeons II")).toBe("minecraftdungeonsii");
  });
});
