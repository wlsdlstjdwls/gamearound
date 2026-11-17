// 고아 줄 규칙 — 2026-11-17 정리한 사례(연결이 끊긴 채 화면에 남은 엉뚱한 상품 줄)를 픽스처로 남긴다
import { describe, expect, it } from "vitest";
import { findOrphanStoreRows, type OrphanStoreRow } from "./rules-orphan";

const row = (over: Partial<OrphanStoreRow> = {}): OrphanStoreRow => ({
  id: "row-1",
  gameId: "g-1",
  titleEn: "Minecraft Launcher",
  platform: "ps4",
  externalId: "10000176",
  refState: "none",
  refExternalId: "",
  ...over,
});

describe("findOrphanStoreRows", () => {
  it("줄 하나에 판정 하나, 줄 삭제를 사람에게 묻는다", () => {
    const [f] = findOrphanStoreRows([row()]);
    expect(f.rule).toBe("orphan_store_row");
    expect(f.verdict).toBe("candidate");
    expect(f.subjectKey).toBe("row-1");
    expect(f.fix).toEqual({ kind: "drop_platform_row", platformRowId: "row-1", gameId: "g-1", externalId: "10000176" });
  });

  it("연결 상태에 따라 근거를 다르게 적는다", () => {
    expect(findOrphanStoreRows([row({ refState: null })])[0].reason).toContain("연결이 없어요");
    expect(findOrphanStoreRows([row({ refState: "pending" })])[0].reason).toContain("검수 대기");
    expect(findOrphanStoreRows([row({ refState: "auto", refExternalId: "10001111" })])[0].reason).toContain("다른 상품(10001111)");
  });

  it("고아 줄이 없으면 판정도 없다", () => {
    expect(findOrphanStoreRows([])).toEqual([]);
  });
});
