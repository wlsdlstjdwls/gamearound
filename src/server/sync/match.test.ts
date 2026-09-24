// 매칭 임계값 테스트 (§4.2) — trigram 유사도 + classifyMatch/pickBestCandidate 순수 함수만. DB/네트워크 없음
import { describe, expect, it } from "vitest";
import { normalizeTitle, slugify, trigramSimilarity } from "@/lib/slug";
import { AUTO_MATCH_THRESHOLD, classifyMatch, findGameByTitle, guardTakenRef, NO_CANDIDATE_EXTERNAL_ID, NONE_RETRY_DAYS, noneRetryCutoff, PENDING_MATCH_THRESHOLD, pickBestCandidate, refRowFor } from "@/server/sync/match";
import { matchNewsToGame } from "@/server/sync/run-news";

describe("classifyMatch", () => {
  it("≥0.9 auto, 0.7~0.9 pending, <0.7 none", () => {
    expect(classifyMatch(1)).toBe("auto");
    expect(classifyMatch(AUTO_MATCH_THRESHOLD)).toBe("auto");
    expect(classifyMatch(0.85)).toBe("pending");
    expect(classifyMatch(PENDING_MATCH_THRESHOLD)).toBe("pending");
    expect(classifyMatch(0.69)).toBe("none");
    expect(classifyMatch(0)).toBe("none");
  });
});

describe("trigramSimilarity + normalizeTitle", () => {
  it("동일 제목, 에디션 접미어 차이는 auto 구간", () => {
    expect(trigramSimilarity("Cyberpunk 2077", "Cyberpunk 2077")).toBe(1);
    expect(classifyMatch(trigramSimilarity("Cyberpunk 2077", "Cyberpunk 2077: Ultimate Edition"))).toBe("auto");
    expect(classifyMatch(trigramSimilarity("The Witcher 3: Wild Hunt", "The Witcher 3 - Wild Hunt"))).toBe("auto");
  });
  it("전혀 다른 제목은 none", () => {
    expect(classifyMatch(trigramSimilarity("Cyberpunk 2077", "Stardew Valley"))).toBe("none");
  });
  it("normalizeTitle 은 특수문자, 에디션 접미어를 제거", () => {
    expect(normalizeTitle("Cyberpunk 2077: Ultimate Edition")).toBe("cyberpunk 2077");
    expect(normalizeTitle("The Witcher® 3")).toBe("the witcher 3");
  });
});

describe("pickBestCandidate", () => {
  const candidates = [
    { externalId: "1", title: "Cyberpunk 2077: Phantom Liberty", url: "u1" },
    { externalId: "2", title: "Cyberpunk 2077", url: "u2" },
    { externalId: "3", title: "Cyberpunk 2077 Bundle", url: "u3" },
  ];
  it("가장 유사한 후보를 고른다", () => {
    const best = pickBestCandidate("Cyberpunk 2077", null, candidates);
    expect(best?.candidate.externalId).toBe("2");
    expect(best?.similarity).toBe(1);
  });
  it("titleKo 로도 비교한다", () => {
    const best = pickBestCandidate("Some English", "사이버펑크 2077", [{ externalId: "9", title: "사이버펑크 2077", url: "u" }]);
    expect(best?.similarity).toBe(1);
  });
  it("후보가 없으면 null", () => {
    expect(pickBestCandidate("x", null, [])).toBeNull();
  });
});

describe("matchNewsToGame", () => {
  const index = [
    { id: "a", slug: "elden-ring", needles: ["elden ring"] },
    { id: "b", slug: "elden-ring-nightreign", needles: ["elden ring nightreign"] },
    { id: "c", slug: "go", needles: ["go"] }, // 너무 짧은 제목은 무시
  ];
  it("제목 포함 시 가장 긴 제목의 게임을 연결", () => {
    expect(matchNewsToGame("Elden Ring Nightreign patch 1.02 is out", index)?.id).toBe("b");
    expect(matchNewsToGame("ELDEN RING sale", index)?.id).toBe("a");
  });
  it("없으면 null, 짧은 제목은 매칭하지 않음", () => {
    expect(matchNewsToGame("Let's go outside", index)).toBeNull();
  });
});

describe("noneRetryCutoff", () => {
  const now = new Date("2026-09-12T00:00:00.000Z");

  it("now - NONE_RETRY_DAYS 를 반환한다", () => {
    expect(noneRetryCutoff(now).toISOString()).toBe("2026-08-29T00:00:00.000Z");
    expect(NONE_RETRY_DAYS).toBe(14);
  });

  it("경계: 정확히 NONE_RETRY_DAYS 전 기록은 아직 재검색 대상이 아니다(cutoff 미만만 대상)", () => {
    const checkedAt = new Date(now.getTime() - NONE_RETRY_DAYS * 24 * 60 * 60 * 1000);
    expect(checkedAt < noneRetryCutoff(now)).toBe(false);
  });

  it("NONE_RETRY_DAYS + 1일 지난 기록은 재검색 대상", () => {
    const checkedAt = new Date(now.getTime() - (NONE_RETRY_DAYS + 1) * 24 * 60 * 60 * 1000);
    expect(checkedAt < noneRetryCutoff(now)).toBe(true);
  });
});

describe("refRowFor (후보 → 기록할 행)", () => {
  const candidate = { externalId: "71763", title: "Crusader Kings III", url: "https://hltb/71763" };

  it("후보가 없어도 none 행을 남긴다 — 안 남기면 큐 선두에 영원히 머문다", () => {
    const row = refRowFor(null);
    expect(row.matchedBy).toBe("none");
    expect(row.externalId).toBe(NO_CANDIDATE_EXTERNAL_ID);
    expect(row.matchedTitle).toBeNull();
    expect(row.confidence).toBeNull();
  });

  it("auto 구간은 후보의 id, 제목, 유사도를 그대로 남긴다", () => {
    const row = refRowFor({ candidate, similarity: 1 });
    expect(row).toEqual({ externalId: "71763", url: "https://hltb/71763", matchedTitle: "Crusader Kings III", matchedBy: "auto", confidence: "1.00" });
  });

  it("pending 구간은 검수용으로 스토어 제목을 남긴다", () => {
    const row = refRowFor({ candidate, similarity: 0.75 });
    expect(row.matchedBy).toBe("pending");
    expect(row.matchedTitle).toBe("Crusader Kings III");
    expect(row.confidence).toBe("0.75");
  });

  it("후보는 있지만 유사도 미달이면 none 이되 자리표시자가 아니다", () => {
    const row = refRowFor({ candidate, similarity: 0.3 });
    expect(row.matchedBy).toBe("none");
    expect(row.externalId).toBe("71763");
  });
});

describe("findGameByTitle (역방향 매칭)", () => {
  const rows = [
    { id: "g1", slug: "hollow-knight-silksong", titleEn: "Hollow Knight: Silksong", titleKo: "할로우 나이트: 실크송" },
    { id: "g2", slug: "stardew-valley", titleEn: "Stardew Valley", titleKo: null },
  ];

  it("영문 제목이 같으면 기존 게임에 흡수한다", () => {
    expect(findGameByTitle("Stardew Valley", rows)?.game.id).toBe("g2");
  });

  it("한국어 제목으로도 찾는다 — Switch 스토어는 한국어 제목만 준다", () => {
    expect(findGameByTitle("할로우 나이트: 실크송", rows)?.game.id).toBe("g1");
  });

  it("임계값 미만은 별개 게임으로 둔다 (애매한 병합은 가격을 섞는다)", () => {
    expect(findGameByTitle("Hollow Knight", rows)).toBeNull();
    expect(findGameByTitle("전혀 다른 게임", rows)).toBeNull();
  });

  it("기존 게임이 없으면 null", () => {
    expect(findGameByTitle("Stardew Valley", [])).toBeNull();
  });
});

describe("한글 정규화 (NFKD 자모 분해 회귀)", () => {
  it("한국어 제목이 정규화 후에도 남는다", () => {
    expect(normalizeTitle("젤다의 전설")).toBe("젤다의 전설");
    expect(normalizeTitle("할로우 나이트: 실크송")).toBe("할로우 나이트 실크송");
  });

  it("서로 다른 한국어 제목은 유사도가 1 이 아니다", () => {
    // 자모가 분해된 채 걸러지면 둘 다 빈 문자열이 되어 1.0 으로 auto 매칭된다
    expect(trigramSimilarity("전혀 다른 게임", "할로우 나이트")).toBeLessThan(AUTO_MATCH_THRESHOLD);
  });

  it("한국어 제목의 slug 가 게임마다 구분된다", () => {
    expect(slugify("할로우 나이트: 실크송")).toBe("할로우-나이트-실크송");
    expect(slugify("젤다의 전설")).not.toBe(slugify("마리오 카트"));
  });

  it("라틴 문자 악센트 제거는 그대로 동작한다", () => {
    expect(normalizeTitle("Pokémon Légendes")).toBe("pokemon legendes");
  });
});

describe("guardTakenRef", () => {
  const auto = { externalId: "10001130", url: null, matchedTitle: "Call of Duty®: Black Ops 6 - Cross-Gen Bundle", matchedBy: "auto" as const, confidence: "1.00" };
  it("다른 게임이 쥔 외부 ID 면 auto 를 pending 으로 내린다", () => {
    expect(guardTakenRef(auto, true).matchedBy).toBe("pending");
  });
  it("아무도 안 쥐었으면 그대로 둔다", () => {
    expect(guardTakenRef(auto, false)).toBe(auto);
  });
  it("auto 가 아닌 판정은 건드리지 않는다", () => {
    const none = { ...auto, matchedBy: "none" as const };
    expect(guardTakenRef(none, true)).toBe(none);
  });
});
