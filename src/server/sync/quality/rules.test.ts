import { describe, expect, it } from "vitest";
import {
  findParentChains,
  findParentMoreSpecific,
  findReleaseDateGaps,
  pickReleaseDate,
  findSharedStoreIds,
  isWordPrefix,
  titleWords,
  type QualityGame,
  type QualityPlatformRow,
} from "./rules";

const g = (id: string, titleEn: string, contentType: QualityGame["contentType"] = "game", parentGameId: string | null = null): QualityGame => ({
  id,
  titleEn,
  contentType,
  parentGameId,
});
const NONE = new Set<string>();

describe("titleWords, isWordPrefix", () => {
  it("구두점과 상표 기호를 공백으로 접는다", () => {
    expect(titleWords("Call of Duty®: Black Ops 7 - Command Force")).toBe("call of duty black ops 7 command force");
  });
  it("낱말 경계를 지킨다", () => {
    expect(isWordPrefix("call of duty modern warfare ii", "call of duty modern warfare iii x")).toBe(false);
    expect(isWordPrefix("call of duty modern warfare ii", "call of duty modern warfare ii x")).toBe(true);
  });
});

describe("findParentMoreSpecific", () => {
  // 2026-10-28 콜 오브 듀티 사례: 런처(값 없음) 밑에 작품별 추가 콘텐츠가 몰렸다
  const games = [
    g("hub", "Call of Duty"),
    g("bo7", "Call of Duty: Black Ops 7"),
    g("mw2", "Call of Duty: Modern Warfare II"),
    g("mw3", "Call of Duty: Modern Warfare III"),
    g("p1", "Call of Duty: Black Ops 7 - Command Force: Starter pack", "dlc", "hub"),
    g("p2", "Call of Duty: Modern Warfare III - Tracer Pack: Ghost Punk", "dlc", "hub"),
    g("p3", "Call of Duty Endowment (C.O.D.E.) - Protector Pack", "dlc", "hub"),
    g("p4", "1,100 Black Ops 7 or Call of Duty: Warzone Points", "dlc", "hub"),
  ];
  const priced = new Set(["bo7", "mw2", "mw3"]);

  it("값 없는 런처 밑 행을 더 구체적인 본편으로 자동으로 옮긴다", () => {
    const out = findParentMoreSpecific(games, NONE, priced);
    expect(out.map((f) => [f.subjectKey, f.verdict, f.fix])).toEqual([
      ["p1", "auto", { kind: "set_parent", gameId: "p1", from: "hub", to: "bo7" }],
      ["p2", "auto", { kind: "set_parent", gameId: "p2", from: "hub", to: "mw3" }],
    ]);
  });

  it("잠긴 부모는 건드리지 않는다", () => {
    expect(findParentMoreSpecific(games, new Set(["p1", "p2"]), priced)).toEqual([]);
  });

  // 2026-10-28 실측: Xbox 묶음 상품이 본편으로 앉아 있었다. 파는 본편 밑의 확장팩을 그리로 옮기면 틀린다
  it("파는 본편 밑에 있으면 사람에게 묻는다", () => {
    const dd = [
      g("dd2", "Dragon's Dogma 2"),
      g("bundle", "Dragon's Dogma 2: Dark Arisen"),
      g("exp", "Dragon's Dogma 2: Dark Arisen Expansion", "dlc", "dd2"),
    ];
    const [f] = findParentMoreSpecific(dd, NONE, new Set(["dd2", "bundle"]));
    expect(f.verdict).toBe("candidate");
  });

  it("같은 제목 본편이 둘이면 사람에게 묻는다", () => {
    const dup = [g("hub", "Series"), g("a", "Series Two"), g("b", "Series Two"), g("d", "Series Two - Pack", "dlc", "hub")];
    const [f] = findParentMoreSpecific(dup, NONE, NONE);
    expect(f.verdict).toBe("candidate");
  });

  it("한 낱말 본편은 후보로 보지 않는다", () => {
    const one = [g("hub", "Id"), g("doom", "Doom"), g("d", "Doom Eternal - Pack", "dlc", "hub")];
    expect(findParentMoreSpecific(one, NONE, NONE)).toEqual([]);
  });
});

describe("findReleaseDateGaps", () => {
  const NOW = new Date("2026-10-28T00:00:00Z");
  const row = (id: string, platform: string, releaseDate: string | null, gameId = "x", priced = true): QualityPlatformRow => ({
    id,
    gameId,
    platform,
    releaseDate,
    priced,
  });

  it("새 작품이고 다른 플랫폼 둘이 같은 날이면 자동으로 채운다", () => {
    const [f] = findReleaseDateGaps([row("a", "steam", "2026-09-16"), row("b", "ps5", "2026-09-17"), row("c", "xbox", null)], NOW);
    expect(f.verdict).toBe("auto");
    expect(f.fix).toEqual({ kind: "set_release_date", platformRowId: "c", date: "2026-09-17" });
  });

  it("하루씩 갈리면 가장 많이 나온 날, 같으면 늦은 날(한국 날짜)로 채운다", () => {
    // 2026-10-29 레지던트 이블 레퀴엠: Xbox 만 UTC 로 하루 이르다
    const [f] = findReleaseDateGaps(
      [row("a", "steam", "2026-02-27"), row("b", "ps5", "2026-02-27"), row("c", "xbox", "2026-02-26"), row("d", "switch2", null)],
      NOW,
    );
    expect(f.fix).toEqual({ kind: "set_release_date", platformRowId: "d", date: "2026-02-27" });
    expect(pickReleaseDate(["2026-03-19", "2026-03-20"])).toBe("2026-03-20");
  });

  it("날짜를 낸 곳이 하나뿐이면 사람에게 묻는다", () => {
    const [f] = findReleaseDateGaps([row("a", "steam", "2026-09-16"), row("c", "epic", null)], NOW);
    expect(f.verdict).toBe("candidate");
  });

  it("오래된 작품의 빈 칸은 올리지 않는다(이식판일 공산이 크다)", () => {
    expect(findReleaseDateGaps([row("a", "steam", "2020-01-01"), row("b", "ps5", "2020-01-01"), row("c", "xbox", null)], NOW)).toEqual([]);
  });

  it("기기가 나오기 전 날짜는 빌리지 않는다", () => {
    expect(findReleaseDateGaps([row("a", "steam", "2025-01-01"), row("b", "xbox", "2025-01-01"), row("c", "switch2", null)], NOW)).toEqual([]);
  });

  it("안 파는 행은 건너뛴다", () => {
    expect(findReleaseDateGaps([row("a", "steam", "2026-10-01"), row("c", "ps5", null, "x", false)], NOW)).toEqual([]);
  });
});

describe("findParentChains", () => {
  it("사슬을 맨 위 본편으로 올린다", () => {
    const out = findParentChains([g("root", "Root"), g("ed", "Root Deluxe", "edition", "root"), g("d", "Root Pack", "dlc", "ed")], NONE);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ rule: "parent_chain", verdict: "auto", fix: { kind: "set_parent", gameId: "d", from: "ed", to: "root" } });
  });

  it("잠긴 부모의 사슬은 사람에게 묻는다", () => {
    const [f] = findParentChains([g("root", "Root"), g("ed", "Root Deluxe", "edition", "root"), g("d", "Root Pack", "dlc", "ed")], new Set(["d"]));
    expect(f.verdict).toBe("candidate");
  });

  it("자기 자신이 부모인 행을 찾는다", () => {
    const [f] = findParentChains([g("s", "Self", "dlc", "s")], NONE);
    expect(f).toMatchObject({ rule: "self_parent", verdict: "candidate", fix: { kind: "promote_game", gameId: "s" } });
  });

  it("서로를 가리키는 고리에서도 끝난다", () => {
    expect(() => findParentChains([g("a", "A", "dlc", "b"), g("b", "B", "dlc", "a")], NONE)).not.toThrow();
  });
});

describe("findSharedStoreIds", () => {
  it("고침 없이 알림만 낸다", () => {
    const [f] = findSharedStoreIds([{ source: "psstore", externalId: "10001130", gameIds: ["a", "b"] }]);
    expect(f).toMatchObject({ verdict: "notify", subjectKey: "psstore:10001130", gameId: "a", fix: null });
  });
});
