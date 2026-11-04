// 주간 맞춤 소식 고르기 — 무엇을 넣고 어떤 순서로 세우는지
import { describe, expect, it } from "vitest";
import { digestSections, hasDigestTaste, isDigestNoise, kstWeekStart, NEWS_DIGEST_MIN_ITEMS, pickDigest, pickTrending, type DigestCandidate, type DigestTaste } from "@/lib/news/digest";

const at = (iso: string) => new Date(iso);
const c = (newsId: string, gameId: string, over: Partial<DigestCandidate> = {}): DigestCandidate => ({
  newsId,
  title: `${newsId} title`,
  publishedAt: at("2026-11-02T00:00:00Z"),
  gameId,
  platforms: ["steam"],
  genreIds: [1],
  ...over,
});
const taste = (over: Partial<DigestTaste> = {}): DigestTaste => ({ platforms: null, genreIds: null, wishedGameIds: new Set(), ...over });
const ids = (xs: DigestCandidate[]) => xs.map((x) => x.newsId);

describe("pickDigest", () => {
  it("고를 근거가 없으면 비운다", () => {
    expect(hasDigestTaste(taste())).toBe(false);
    expect(pickDigest([c("a", "g1")], taste(), 10)).toEqual([]);
  });

  it("찜한 게임은 취향과 상관없이 맨 앞", () => {
    const list = [c("genre", "g1"), c("wish", "g2", { platforms: ["switch"], genreIds: [9] })];
    expect(ids(pickDigest(list, taste({ platforms: ["steam"], genreIds: [1], wishedGameIds: new Set(["g2"]) }), 10))).toEqual(["wish", "genre"]);
  });

  it("장르를 고르면 장르와 플랫폼이 다 맞아야 한다", () => {
    const list = [c("ok", "g1"), c("wrong-genre", "g2", { genreIds: [2] }), c("wrong-platform", "g3", { platforms: ["switch"] })];
    expect(ids(pickDigest(list, taste({ platforms: ["steam"], genreIds: [1] }), 10))).toEqual(["ok"]);
  });

  it("장르를 안 골랐으면 플랫폼만 맞아도 넣는다", () => {
    const list = [c("steam", "g1"), c("switch", "g2", { platforms: ["switch"] })];
    expect(ids(pickDigest(list, taste({ platforms: ["steam"] }), 10))).toEqual(["steam"]);
  });

  it("한 게임에는 한 건, 한국어 제목 먼저, 그다음 최신", () => {
    const list = [
      c("old-en", "g1", { publishedAt: at("2026-11-01T00:00:00Z") }),
      c("new-en", "g1", { publishedAt: at("2026-11-03T00:00:00Z") }),
      c("ko", "g1", { title: "콜 오브 듀티 새 시즌", publishedAt: at("2026-10-30T00:00:00Z") }),
      c("other-a", "g2", { publishedAt: at("2026-11-01T00:00:00Z") }),
      c("other-b", "g2", { publishedAt: at("2026-11-03T00:00:00Z") }),
    ];
    expect(ids(pickDigest(list, taste({ genreIds: [1] }), 10))).toEqual(["other-b", "ko"]);
  });

  it("limit 개까지만", () => {
    const list = [c("a", "g1"), c("b", "g2"), c("c", "g3")];
    expect(pickDigest(list, taste({ genreIds: [1] }), 2)).toHaveLength(2);
  });
});

describe("isDigestNoise", () => {
  it("공략, 경품, 할인 모음은 뺀다", () => {
    for (const t of [
      "How to beat the Aberrant Three-Faced Puppet in Phantom Blade Zero",
      "Phantom Blade Zero: How to Defeat Jing Ye, The Outlaw",
      "Where to find the Flesh Lily in Phantom Blade Zero",
      "All Pirate Treasure Chest locations in Fortnite Treasure Hunters",
      "Best Wonderkids in Football Manager 27 for every position",
      "Godzilla: Destroy All Monsters Melee Remastered fighter guide",
      "How to Enter the AGON x COUNTER-STRIKE 2 Limited Edition Monitor Giveaway",
      "The Best Deals Today: Gears of War: E-Day, Apple Watch Ultra 4",
      "메모리 브랜드, '콜 오브 듀티 모던 워페어 4' 출시 SNS 이벤트 진행 중",
    ]) expect(isDigestNoise(t), t).toBe(true);
  });

  it("소식은 남긴다(패치 노트, 판매량, 세일)", () => {
    for (const t of [
      "No Man's Sky Unveils Forsaken (Update 7.10), Here Are The Full Patch Notes",
      "Phantom Blade Zero Put Up Some Massive Sales Numbers",
      "Square Enix's 'Harvest Sale' Includes Huge Discounts On Final Fantasy VII Remake",
      "Bungie shares hopes for a new forever Destiny",
    ]) expect(isDigestNoise(t), t).toBe(false);
  });

  it("pickDigest 가 뺀다", () => {
    const list = [c("guide", "g1", { title: "How to beat the boss in G1" }), c("news", "g2")];
    expect(ids(pickDigest(list, taste({ genreIds: [1] }), 10))).toEqual(["news"]);
  });
});

describe("kstWeekStart", () => {
  it("한국 월요일 0시(= 일요일 15시 UTC)", () => {
    // 2026-11-03 은 화요일. 한국 화요일 오전 3시 = 월요일 18시 UTC
    expect(kstWeekStart(at("2026-11-02T18:00:00Z")).toISOString()).toBe("2026-11-01T15:00:00.000Z");
  });

  it("일요일 밤(한국)은 아직 지난주", () => {
    // 한국 11-08(일) 23시 = 11-08 14시 UTC
    expect(kstWeekStart(at("2026-11-08T14:00:00Z")).toISOString()).toBe("2026-11-01T15:00:00.000Z");
  });

  it("월요일 0시 정각부터 새 주", () => {
    expect(kstWeekStart(at("2026-11-08T15:00:00Z")).toISOString()).toBe("2026-11-08T15:00:00.000Z");
  });
});

type Src = DigestCandidate & { sourceName: string };
const s = (newsId: string, gameId: string, sourceName: string, over: Partial<DigestCandidate> = {}): Src => ({ ...c(newsId, gameId, over), sourceName });

describe("pickTrending", () => {
  it("다룬 매체가 많은 게임 순, 매체 하나뿐인 게임은 뺀다", () => {
    const list = [s("a1", "ga", "IGN"), s("a2", "ga", "PC Gamer"), s("a3", "ga", "게임메카"), s("b1", "gb", "IGN"), s("b2", "gb", "Eurogamer"), s("c1", "gc", "IGN"), s("c2", "gc", "IGN")];
    expect(pickTrending(list, taste(), new Set(), 10).map((x) => x.gameId)).toEqual(["ga", "gb"]);
  });
  it("맞춤에 든 게임, 공략 글, 고른 플랫폼 밖 게임은 뺀다", () => {
    const list = [
      s("w1", "wished", "IGN"), s("w2", "wished", "Eurogamer"),
      s("g1", "guide", "IGN", { title: "How to beat the boss" }), s("g2", "guide", "Eurogamer", { title: "Best builds guide" }),
      s("n1", "switch", "IGN", { platforms: ["switch"] }), s("n2", "switch", "Eurogamer", { platforms: ["switch"] }),
      s("ok1", "ok", "IGN"), s("ok2", "ok", "Eurogamer"),
    ];
    expect(pickTrending(list, taste({ platforms: ["steam"] }), new Set(["wished"]), 10).map((x) => x.gameId)).toEqual(["ok"]);
  });
});

describe("digestSections", () => {
  const trendy = [s("t1", "gt", "IGN"), s("t2", "gt", "Eurogamer")];
  it("맞춤이 적으면 많이 다룬 소식을 덧붙인다", () => {
    const r = digestSections([s("w", "wished", "IGN"), ...trendy], taste({ wishedGameIds: new Set(["wished"]) }), 8);
    expect(ids(r.picks)).toEqual(["w"]);
    expect(r.trending.map((x) => x.gameId)).toEqual(["gt"]);
  });
  it("맞춤이 0건이면 화제만 담아 보내지 않는다", () => {
    expect(digestSections(trendy, taste({ wishedGameIds: new Set(["none"]) }), 8)).toEqual({ picks: [], trending: [] });
  });
  it("맞춤이 넉넉하면 덧붙이지 않는다", () => {
    const wished = Array.from({ length: NEWS_DIGEST_MIN_ITEMS }, (_, i) => s(`w${i}`, `g${i}`, "IGN"));
    const r = digestSections([...wished, ...trendy], taste({ wishedGameIds: new Set(wished.map((w) => w.gameId)) }), 8);
    expect(r.trending).toEqual([]);
  });
});
