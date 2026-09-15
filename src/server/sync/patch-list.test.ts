// 패치 기록 대상 선정, 행 변환 테스트 — 순수 함수만. DB 와 네트워크는 건드리지 않는다.
import { describe, expect, it } from "vitest";
import { pickPatchListTargets, toPatchRows, type PatchListRow } from "./patch-list";
import { PATCH_LIST_REFRESH_DAYS, PATCH_PER_GAME_MAX } from "./constants";

const NOW = new Date("2026-09-15T00:00:00Z");
const daysAgo = (n: number): Date => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

const row = (over: Partial<PatchListRow> & { id: string; gameId: string }): PatchListRow => ({
  storeExternalId: "1",
  patchListedAt: null,
  ...over,
});

describe("pickPatchListTargets", () => {
  const candidates = [
    { gameId: "g1", slug: "a" },
    { gameId: "g2", slug: "b" },
    { gameId: "g3", slug: "c" },
  ];

  it("한 번도 안 물어본 게임이 먼저다", () => {
    const rows = [
      row({ id: "p1", gameId: "g1", patchListedAt: daysAgo(PATCH_LIST_REFRESH_DAYS + 1) }),
      row({ id: "p2", gameId: "g2", patchListedAt: null }),
    ];
    expect(pickPatchListTargets(candidates, rows, NOW, 1).map((p) => p.gameId)).toEqual(["g2"]);
  });

  it("최근에 물어본 게임은 빠진다", () => {
    const rows = [row({ id: "p1", gameId: "g1", patchListedAt: daysAgo(1) })];
    expect(pickPatchListTargets(candidates, rows, NOW)).toEqual([]);
  });

  it("질의 키(스토어 외부 ID)가 없으면 물어볼 데가 없다", () => {
    const rows = [row({ id: "p1", gameId: "g1", storeExternalId: null })];
    expect(pickPatchListTargets(candidates, rows, NOW)).toEqual([]);
  });

  it("이번 배치에 없는 게임은 제외한다", () => {
    const rows = [row({ id: "p9", gameId: "없는게임" })];
    expect(pickPatchListTargets(candidates, rows, NOW)).toEqual([]);
  });

  it("한 게임에 플랫폼 행이 여럿이면 먼저 온 행 하나만 쓴다", () => {
    const rows = [row({ id: "p1", gameId: "g1" }), row({ id: "p2", gameId: "g1" })];
    expect(pickPatchListTargets(candidates, rows, NOW).map((p) => p.platformId)).toEqual(["p1"]);
  });

  it("상한을 넘지 않는다", () => {
    const rows = candidates.map((c, i) => row({ id: `p${i}`, gameId: c.gameId }));
    expect(pickPatchListTargets(candidates, rows, NOW, 2)).toHaveLength(2);
  });
});

describe("toPatchRows", () => {
  it("어댑터 결과를 그대로 행으로 옮긴다", () => {
    const [r] = toPatchRows("steam", "gp1", [
      { externalId: "gid1", title: "Patch 1.2", version: "1.2", url: "https://example.test/1", publishedAt: "2026-09-01T00:00:00.000Z" },
    ]);
    expect(r).toMatchObject({ gamePlatformId: "gp1", source: "steam", externalId: "gid1", version: "1.2", title: "Patch 1.2" });
    expect(r.publishedAt).toEqual(new Date("2026-09-01T00:00:00.000Z"));
  });

  it("버전, 주소를 안 주는 소스는 null 로 남는다 — undefined 를 그대로 넣지 않는다", () => {
    const [r] = toPatchRows("gog", "gp1", [{ externalId: "2026-09-01", title: "Update", publishedAt: "2026-09-01T00:00:00.000Z" }]);
    expect(r.version).toBeNull();
    expect(r.url).toBeNull();
  });

  it("한 게임에서 담을 수 있는 수를 넘기지 않는다", () => {
    const many = Array.from({ length: PATCH_PER_GAME_MAX + 10 }, (_, i) => ({
      externalId: String(i),
      title: `Patch ${i}`,
      publishedAt: "2026-09-01T00:00:00.000Z",
    }));
    expect(toPatchRows("steam", "gp1", many)).toHaveLength(PATCH_PER_GAME_MAX);
  });
});
