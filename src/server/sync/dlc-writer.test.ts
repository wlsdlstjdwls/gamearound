// DLC 그룹 추출 테스트 — 순수 함수만. DB 는 건드리지 않는다.
import { describe, expect, it } from "vitest";
import type { StoreSnapshot } from "@/server/adapters/types";
import { DLC_PER_GAME_MAX } from "./constants";
import { collectDlcGroups } from "./dlc-writer";

function snapshot(over: Partial<StoreSnapshot> = {}): StoreSnapshot {
  return {
    platform: "steam",
    storeExternalId: "1",
    storeUrl: "https://example.test/1",
    listPrice: 1000,
    currentPrice: 1000,
    discountPct: 0,
    ...over,
  };
}

describe("collectDlcGroups", () => {
  it("본편이 알려준 DLC 목록을 본편 단위로 묶는다", () => {
    const groups = collectDlcGroups([
      { gameId: "g1", slug: "elden-ring", snapshot: snapshot({ dlcExternalIds: ["2778580", "2778590"] }) },
    ]);
    expect(groups).toEqual([{ parentGameId: "g1", parentSlug: "elden-ring", externalIds: ["2778580", "2778590"] }]);
  });

  it("DLC 자신은 따라가지 않는다 — 따라가기 시작하면 끝이 없다", () => {
    const groups = collectDlcGroups([
      { gameId: "g2", slug: "shadow", snapshot: snapshot({ contentType: "dlc", dlcExternalIds: ["999"] }) },
    ]);
    expect(groups).toEqual([]);
  });

  it("DLC 가 없으면 그룹도 없다", () => {
    expect(collectDlcGroups([{ gameId: "g3", slug: "solo", snapshot: snapshot() }])).toEqual([]);
    expect(collectDlcGroups([{ gameId: "g3", slug: "solo", snapshot: snapshot({ dlcExternalIds: [] }) }])).toEqual([]);
  });

  it("한 게임의 DLC 수를 상한으로 자른다 — 한 타이틀이 배치를 다 먹지 않게", () => {
    const many = Array.from({ length: DLC_PER_GAME_MAX + 10 }, (_, i) => String(i));
    const [group] = collectDlcGroups([{ gameId: "g4", slug: "sims", snapshot: snapshot({ dlcExternalIds: many }) }]);
    expect(group.externalIds).toHaveLength(DLC_PER_GAME_MAX);
  });
});
