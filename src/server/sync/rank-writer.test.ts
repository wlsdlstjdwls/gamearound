// 순번 → 게임 매핑 테스트. DB 는 select 체인만 흉내 낸다(네트워크, 실DB 없음).
import { describe, expect, it } from "vitest";
import { resolveRankRows } from "./rank-writer";
import type { Db } from "@/server/db/client";
import type { SearchCandidate } from "@/server/adapters/types";

const ranked = (id: string, rank: number): SearchCandidate => ({
  externalId: id,
  title: `게임 ${id}`,
  url: `https://x/${id}`,
  rank,
});

/** gameSourceRefs 조회만 흉내 낸다 — 넘긴 행을 그대로 돌려주는 체인 */
function fakeDb(refs: Array<{ externalId: string; gameId: string }>): Db {
  return {
    select: () => ({ from: () => ({ where: async () => refs }) }),
  } as unknown as Db;
}

describe("resolveRankRows", () => {
  it("등록된 게임만 남긴다 — 아직 모르는 후보는 붙일 행이 없다", async () => {
    const db = fakeDb([{ externalId: "730", gameId: "g-cs" }]);
    const rows = await resolveRankRows(db, "steam", [ranked("730", 1), ranked("999999", 2)]);
    expect(rows).toEqual([{ gameId: "g-cs", rank: 1 }]);
  });

  it("한 게임에 SKU 가 여럿이면 더 높은 순위를 남긴다 — 본편과 디럭스판", async () => {
    const db = fakeDb([
      { externalId: "100", gameId: "g1" },
      { externalId: "101", gameId: "g1" },
    ]);
    const rows = await resolveRankRows(db, "steam", [ranked("101", 420), ranked("100", 12)]);
    expect(rows).toEqual([{ gameId: "g1", rank: 12 }]);
  });

  it("같은 externalId 가 두 번 오면 앞선 순위를 쓴다", async () => {
    const db = fakeDb([{ externalId: "5", gameId: "g5" }]);
    const rows = await resolveRankRows(db, "steam", [ranked("5", 900), ranked("5", 3)]);
    expect(rows).toEqual([{ gameId: "g5", rank: 3 }]);
  });

  it("순번 없는 후보만 오면 조회 자체를 하지 않는다", async () => {
    let queried = false;
    const db = {
      select: () => {
        queried = true;
        return { from: () => ({ where: async () => [] }) };
      },
    } as unknown as Db;
    const rows = await resolveRankRows(db, "steam", [{ externalId: "x", title: "x", url: "u" }]);
    expect(rows).toEqual([]);
    expect(queried).toBe(false);
  });
});
