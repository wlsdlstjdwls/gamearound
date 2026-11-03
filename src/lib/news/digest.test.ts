// 주간 맞춤 소식 고르기 — 무엇을 넣고 어떤 순서로 세우는지
import { describe, expect, it } from "vitest";
import { hasDigestTaste, kstWeekStart, pickDigest, type DigestCandidate, type DigestTaste } from "@/lib/news/digest";

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
