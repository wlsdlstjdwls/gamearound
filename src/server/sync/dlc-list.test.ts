// DLC 목록 요청 대상 선정 테스트 — 순수 함수만. DB, 네트워크는 건드리지 않는다.
import { describe, expect, it } from "vitest";
import { DLC_LIST_REFRESH_DAYS } from "./constants";
import { pickDlcListTargets, type DlcListRow } from "./dlc-list";

const NOW = new Date("2026-09-14T00:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

function row(over: Partial<DlcListRow> = {}): DlcListRow {
  return { id: "p1", gameId: "g1", storeExternalId: "1245620", dlcListedAt: null, hasAddOns: null, ...over };
}

describe("pickDlcListTargets", () => {
  it("한 번도 물어보지 않은 본편을 고른다", () => {
    const picks = pickDlcListTargets([{ gameId: "g1", slug: "elden-ring" }], [row()], NOW);
    expect(picks).toEqual([{ platformId: "p1", gameId: "g1", slug: "elden-ring", externalId: "1245620" }]);
  });

  it("최근에 물어본 본편은 건너뛴다 — 같은 질문을 매 실행 반복하지 않는다", () => {
    const recent = row({ dlcListedAt: daysAgo(DLC_LIST_REFRESH_DAYS - 1) });
    expect(pickDlcListTargets([{ gameId: "g1", slug: "elden-ring" }], [recent], NOW)).toEqual([]);
  });

  it("주기가 지난 본편은 다시 고른다", () => {
    const stale = row({ dlcListedAt: daysAgo(DLC_LIST_REFRESH_DAYS + 1) });
    expect(pickDlcListTargets([{ gameId: "g1", slug: "elden-ring" }], [stale], NOW)).toHaveLength(1);
  });

  it("한 번도 안 물어본 본편이 먼저다 — 카탈로그를 한 바퀴 도는 일이 먼저 끝나야 한다", () => {
    const rows = [
      row({ id: "p-old", gameId: "g-old", dlcListedAt: daysAgo(DLC_LIST_REFRESH_DAYS + 10) }),
      row({ id: "p-new", gameId: "g-new" }),
    ];
    const parents = [{ gameId: "g-old", slug: "old" }, { gameId: "g-new", slug: "new" }];
    expect(pickDlcListTargets(parents, rows, NOW, 1)).toEqual([
      { platformId: "p-new", gameId: "g-new", slug: "new", externalId: "1245620" },
    ]);
  });

  it("상한을 넘지 않는다", () => {
    const rows = Array.from({ length: 5 }, (_, i) => row({ id: `p${i}`, gameId: `g${i}` }));
    const parents = rows.map((r) => ({ gameId: r.gameId, slug: r.gameId }));
    expect(pickDlcListTargets(parents, rows, NOW, 3)).toHaveLength(3);
  });

  it("외부 ID 가 없는 행은 물어볼 데가 없다", () => {
    expect(pickDlcListTargets([{ gameId: "g1", slug: "elden-ring" }], [row({ storeExternalId: null })], NOW)).toEqual([]);
  });

  it("한 게임에 플랫폼 행이 여럿이면 한 번만 묻는다 (psstore 의 ps5, ps4)", () => {
    const rows = [row({ id: "p5" }), row({ id: "p4" })];
    expect(pickDlcListTargets([{ gameId: "g1", slug: "elden-ring" }], rows, NOW)).toHaveLength(1);
  });
});

describe("pickDlcListTargets — 추가 콘텐츠 유무를 아는 소스", () => {
  const parents = [
    { gameId: "g1", slug: "없음" },
    { gameId: "g2", slug: "있음" },
    { gameId: "g3", slug: "모름" },
  ];

  it("스토어가 '없음'이라고 한 본편은 아예 묻지 않는다", () => {
    const rows = [row({ id: "p1", gameId: "g1", hasAddOns: false })];
    expect(pickDlcListTargets(parents, rows, NOW)).toEqual([]);
  });

  it("'있음'이 '모름'보다 먼저다 — 한 실행의 몫을 빈손에 쓰지 않는다", () => {
    const rows = [
      row({ id: "p3", gameId: "g3", hasAddOns: null }),
      row({ id: "p2", gameId: "g2", hasAddOns: true }),
    ];
    expect(pickDlcListTargets(parents, rows, NOW).map((p) => p.slug)).toEqual(["있음", "모름"]);
  });

  it("몫이 하나뿐이면 '있음'이 가져간다", () => {
    const rows = [
      row({ id: "p3", gameId: "g3", hasAddOns: null }),
      row({ id: "p2", gameId: "g2", hasAddOns: true }),
    ];
    expect(pickDlcListTargets(parents, rows, NOW, 1).map((p) => p.slug)).toEqual(["있음"]);
  });
});
