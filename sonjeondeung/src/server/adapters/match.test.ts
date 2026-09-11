// 매칭 임계값 테스트 (§4.2) — trigram 유사도 + classifyMatch/pickBestCandidate 순수 함수만. DB/네트워크 없음
import { describe, expect, it } from "vitest";
import { normalizeTitle, trigramSimilarity } from "@/lib/slug";
import { AUTO_MATCH_THRESHOLD, classifyMatch, NONE_RETRY_DAYS, noneRetryCutoff, PENDING_MATCH_THRESHOLD, pickBestCandidate } from "@/server/sync/match";
import { matchNewsToGame } from "@/server/sync/run-source";

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
  it("동일 제목·에디션 접미어 차이는 auto 구간", () => {
    expect(trigramSimilarity("Cyberpunk 2077", "Cyberpunk 2077")).toBe(1);
    expect(classifyMatch(trigramSimilarity("Cyberpunk 2077", "Cyberpunk 2077: Ultimate Edition"))).toBe("auto");
    expect(classifyMatch(trigramSimilarity("The Witcher 3: Wild Hunt", "The Witcher 3 - Wild Hunt"))).toBe("auto");
  });
  it("전혀 다른 제목은 none", () => {
    expect(classifyMatch(trigramSimilarity("Cyberpunk 2077", "Stardew Valley"))).toBe("none");
  });
  it("normalizeTitle 은 특수문자·에디션 접미어를 제거", () => {
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
