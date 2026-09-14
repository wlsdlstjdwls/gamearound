// 발견 수집기 테스트 — 네트워크, DB 없음. 페이지는 가짜 async iterable, 아는 것은 Set 으로 준다.
import { describe, expect, it } from "vitest";
import { collectFreshCandidates, seedQuota } from "./discover";
import type { SearchCandidate } from "@/server/adapters/types";

const candidate = (id: string): SearchCandidate => ({ externalId: id, title: `게임 ${id}`, url: `https://x/${id}` });

/** id 를 size 개씩 끊어 페이지로 흘려보낸다. 읽은 페이지 수를 밖에서 셀 수 있게 기록한다 */
function pagesOf(ids: string[], size: number, read: string[][] = []): AsyncIterable<SearchCandidate[]> {
  return {
    async *[Symbol.asyncIterator]() {
      for (let i = 0; i < ids.length; i += size) {
        const page = ids.slice(i, i + size);
        read.push(page);
        yield page.map(candidate);
      }
    },
  };
}

const unknownOfSet = (known: Set<string>) => async (ids: string[]) => ids.filter((id) => !known.has(id));

describe("collectFreshCandidates", () => {
  it("아는 것만 있는 앞 페이지를 건너뛰고 뒤에서 신규를 찾는다", async () => {
    const known = new Set(["1", "2", "3", "4"]);
    const r = await collectFreshCandidates(pagesOf(["1", "2", "3", "4", "5", "6"], 2), {
      want: 2,
      pageBudget: 10,
      unknownOf: unknownOfSet(known),
    });
    expect(r.fresh.map((c) => c.externalId)).toEqual(["5", "6"]);
    expect(r.pages).toBe(3);
    expect(r.stoppedBy).toBe("want");
  });

  it("want 를 채우면 다음 페이지를 읽지 않는다", async () => {
    const read: string[][] = [];
    const r = await collectFreshCandidates(pagesOf(["1", "2", "3", "4"], 2, read), {
      want: 1,
      pageBudget: 10,
      unknownOf: unknownOfSet(new Set()),
    });
    expect(r.fresh.map((c) => c.externalId)).toEqual(["1"]);
    expect(read).toHaveLength(1); // 두 번째 페이지는 요청조차 하지 않는다
  });

  it("페이지 예산을 넘기면 budget 으로 멈춘다", async () => {
    const read: string[][] = [];
    const r = await collectFreshCandidates(pagesOf(["1", "2", "3", "4", "5", "6"], 2, read), {
      want: 100,
      pageBudget: 2,
      unknownOf: unknownOfSet(new Set(["1", "2", "3", "4", "5", "6"])),
    });
    expect(r.fresh).toEqual([]);
    expect(read).toHaveLength(2);
    expect(r.stoppedBy).toBe("budget");
  });

  it("카탈로그가 끝나면 모은 만큼 돌려준다", async () => {
    const r = await collectFreshCandidates(pagesOf(["1", "2"], 1), {
      want: 100,
      pageBudget: 100,
      unknownOf: unknownOfSet(new Set(["1"])),
    });
    expect(r.fresh.map((c) => c.externalId)).toEqual(["2"]);
    expect(r.stoppedBy).toBe("catalog-end");
    expect(r.scanned).toBe(2);
  });

  it("페이지, 슬라이스에 걸쳐 중복으로 나온 후보는 한 번만 센다", async () => {
    const asked: string[][] = [];
    const r = await collectFreshCandidates(pagesOf(["1", "2", "2", "1", "3"], 2), {
      want: 100,
      pageBudget: 100,
      unknownOf: async (ids) => {
        asked.push(ids);
        return ids;
      },
    });
    expect(r.fresh.map((c) => c.externalId)).toEqual(["1", "2", "3"]);
    expect(r.scanned).toBe(3);
    expect(asked).toEqual([["1", "2"], ["3"]]); // 이미 본 id 는 DB 에 묻지 않는다
  });

  it("want 가 0이면 페이지를 아예 읽지 않는다", async () => {
    const read: string[][] = [];
    const r = await collectFreshCandidates(pagesOf(["1"], 1, read), {
      want: 0,
      pageBudget: 10,
      unknownOf: unknownOfSet(new Set()),
    });
    expect(read).toHaveLength(0);
    expect(r.fresh).toEqual([]);
  });
});

describe("seedQuota", () => {
  it("소스별 값이 없으면 배치의 절반까지만 시드에 준다", () => {
    expect(seedQuota("steam", 1500, 750, undefined)).toBe(750);
    expect(seedQuota("steam", 1500, 900, undefined)).toBe(750); // 몫이 seedTop 을 깎는다
    expect(seedQuota("steam", 1500, 300, undefined)).toBe(300); // seedTop 이 더 좁으면 그쪽이 이긴다
  });

  it("psstore 는 카탈로그의 대부분을 아직 몰라 몫을 더 받는다", () => {
    expect(seedQuota("psstore", 200, 150, undefined)).toBe(150); // 200 × 0.75
    expect(seedQuota("psstore", 200, 999, undefined)).toBe(150);
  });

  it("호출부가 준 몫이 소스별 값보다 우선한다 (크론 discover 모드의 1)", () => {
    expect(seedQuota("psstore", 200, 200, 1)).toBe(200);
    expect(seedQuota("psstore", 200, 200, 0.25)).toBe(50);
  });

  it("seedTop 이 없으면 발견을 돌지 않는다", () => {
    expect(seedQuota("psstore", 200, undefined, undefined)).toBe(0);
  });
});
