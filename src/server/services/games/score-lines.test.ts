// 상세 평점 줄(scoreLines)의 유저 점수 고르기 — 스토어 유저 점수와 메타크리틱 유저 점수 중 표본이 큰 쪽 하나
import { describe, expect, it } from "vitest";
import { scoreLines } from "@/server/services/games/mappers";
import type { PlatformDto } from "@/server/services/games/dto";

const row = (over: Partial<PlatformDto>): PlatformDto =>
  ({ platform: "switch", metacriticScore: null, opencriticScore: null, ignScore: null, userScore: null, metacriticUser: null, ...over }) as PlatformDto;

const user = (platforms: PlatformDto[]) => scoreLines(platforms).find((l) => l.key === "user");

describe("scoreLines 유저 점수", () => {
  it("스토어 유저 점수가 없으면 메타크리틱 유저 점수가 선다", () => {
    const line = user([row({ metacriticUser: { value: 84, count: 25134 } })]);
    expect(line?.value).toBe(84);
    expect(line?.note).toContain("메타크리틱 유저");
  });

  it("표본이 큰 쪽 하나만 선다", () => {
    const steam = row({ platform: "steam", userScore: { value: 94, kind: "positive_ratio", count: 480000 } });
    const both = [steam, row({ metacriticUser: { value: 84, count: 25134 } })];
    expect(scoreLines(both).filter((l) => l.key === "user")).toHaveLength(1);
    expect(user(both)?.value).toBe(94);
  });

  it("메타크리틱 표본이 더 크면 그쪽", () => {
    const xbox = row({ platform: "xbox", userScore: { value: 78, kind: "star_average", count: 300 } });
    expect(user([xbox, row({ metacriticUser: { value: 84, count: 25134 } })])?.value).toBe(84);
  });

  it("옛 캐시 DTO(칸 없음)도 깨지지 않는다", () => {
    const old = { platform: "switch", metacriticScore: 90, opencriticScore: null, ignScore: null, userScore: null } as unknown as PlatformDto;
    expect(user([old])).toBeUndefined();
  });
});
