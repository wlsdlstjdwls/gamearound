import { describe, expect, it } from "vitest";
import type { GameSummary } from "@/server/services/games";
import { pickTopDeals } from "./deals";

const game = (slug: string, discountPct: number | null): GameSummary => ({
  slug,
  titleKo: null,
  titleEn: slug,
  coverUrl: null,
  best: discountPct === null ? null : { platform: "steam", listPrice: 10000, currentPrice: 5000, currency: "KRW", discountPct, discountEndsAt: null, discountName: null, releaseDate: null },
  platforms: [],
  genres: [],
});

describe("pickTopDeals", () => {
  it("웅덩이 안에서 할인율이 큰 순으로 세운다", () => {
    const list = [game("a", 70), game("b", 30), game("c", 60), game("d", 15), game("e", 90)];
    expect(pickTopDeals(list, 3, 5).map((g) => g.slug)).toEqual(["e", "a", "c"]);
  });

  it("웅덩이 밖의 큰 할인은 끌어오지 않는다", () => {
    const list = [game("a", 20), game("b", 10), game("old", 95)];
    expect(pickTopDeals(list, 2, 2).map((g) => g.slug)).toEqual(["a", "b"]);
  });

  it("할인율이 같으면 인기 순서를 지킨다", () => {
    const list = [game("a", 50), game("b", 50), game("c", null)];
    expect(pickTopDeals(list, 3, 3).map((g) => g.slug)).toEqual(["a", "b", "c"]);
  });
});
