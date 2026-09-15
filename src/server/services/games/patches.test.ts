// 패치 속도 계산, 플랫폼 묶기 테스트 — 순수 함수만. DB 는 건드리지 않는다.
import { describe, expect, it } from "vitest";
import { averageIntervalDays, groupPatchesByPlatform, latestPatches } from "./patches";
import type { Platform, Region } from "@/server/db/schema";

const at = (iso: string): Date => new Date(iso);

const row = (over: Partial<Parameters<typeof groupPatchesByPlatform>[0][number]> & { id: string; publishedAt: Date }) => ({
  platform: "steam" as Platform,
  region: "KR" as Region,
  version: null,
  title: "Update",
  titleKo: null,
  summaryKo: null,
  url: null,
  ...over,
});

describe("averageIntervalDays", () => {
  it("기록 사이 평균 간격을 일 단위로", () => {
    const notes = [{ publishedAt: "2026-09-11T00:00:00Z" }, { publishedAt: "2026-09-01T00:00:00Z" }];
    expect(averageIntervalDays(notes)).toBe(10);
  });

  it("건수가 늘면 같은 기간이라도 간격이 줄어든다", () => {
    const notes = [
      { publishedAt: "2026-09-11T00:00:00Z" },
      { publishedAt: "2026-09-06T00:00:00Z" },
      { publishedAt: "2026-09-01T00:00:00Z" },
    ];
    expect(averageIntervalDays(notes)).toBe(5);
  });

  it("기록이 1건이면 간격이 없다 — 0 이 아니라 null", () => {
    expect(averageIntervalDays([{ publishedAt: "2026-09-01T00:00:00Z" }])).toBeNull();
    expect(averageIntervalDays([])).toBeNull();
  });

  it("같은 시각 기록만 있으면 null — 0일마다 고친다고 적지 않는다", () => {
    const same = "2026-09-01T00:00:00Z";
    expect(averageIntervalDays([{ publishedAt: same }, { publishedAt: same }])).toBeNull();
  });
});

describe("groupPatchesByPlatform", () => {
  it("플랫폼별로 나누고 속도를 계산한다", () => {
    const groups = groupPatchesByPlatform([
      row({ id: "1", publishedAt: at("2026-09-11T00:00:00Z") }),
      row({ id: "2", platform: "gog", publishedAt: at("2026-09-10T00:00:00Z") }),
      row({ id: "3", publishedAt: at("2026-09-01T00:00:00Z") }),
    ]);
    expect(groups.map((g) => g.platform)).toEqual(["steam", "gog"]);
    expect(groups[0]).toMatchObject({ count: 2, averageIntervalDays: 10, latestAt: "2026-09-11T00:00:00.000Z" });
    expect(groups[1]).toMatchObject({ count: 1, averageIntervalDays: null });
  });

  it("같은 기기라도 나라가 다르면 다른 묶음이다", () => {
    const groups = groupPatchesByPlatform([
      row({ id: "1", platform: "switch", region: "JP", publishedAt: at("2026-09-11T00:00:00Z") }),
      row({ id: "2", platform: "switch", region: "KR", publishedAt: at("2026-09-10T00:00:00Z") }),
    ]);
    expect(groups).toHaveLength(2);
    // 기준 지역(한국)이 먼저다
    expect(groups.map((g) => g.region)).toEqual(["KR", "JP"]);
  });

  it("기록이 없으면 빈 배열", () => {
    expect(groupPatchesByPlatform([])).toEqual([]);
  });

  // 한글은 우리가 채우는 값이라 늘 비어 있을 수 있다. 화면이 폴백하려면 DTO 까지 내려와야 한다
  it("한글 제목과 요약을 그대로 실어 보낸다 — 없으면 null", () => {
    const [group] = groupPatchesByPlatform([
      row({ id: "1", publishedAt: at("2026-09-11T00:00:00Z"), titleKo: "업데이트 1.0.3", summaryKo: "저장 오류를 고쳤어요." }),
      row({ id: "2", publishedAt: at("2026-09-10T00:00:00Z") }),
    ]);
    expect(group.notes[0].titleKo).toBe("업데이트 1.0.3");
    expect(group.notes[0].summaryKo).toBe("저장 오류를 고쳤어요.");
    expect(group.notes[1].titleKo).toBeNull();
    expect(group.notes[1].summaryKo).toBeNull();
  });
});

describe("latestPatches", () => {
  it("플랫폼을 섞어 최신순으로 자른다", () => {
    const groups = groupPatchesByPlatform([
      row({ id: "1", publishedAt: at("2026-09-11T00:00:00Z") }),
      row({ id: "2", platform: "gog", publishedAt: at("2026-09-12T00:00:00Z") }),
      row({ id: "3", publishedAt: at("2026-09-01T00:00:00Z") }),
    ]);
    expect(latestPatches(groups, 2).map((n) => n.id)).toEqual(["2", "1"]);
    expect(latestPatches(groups, 2)[0].platform).toBe("gog");
  });
});
