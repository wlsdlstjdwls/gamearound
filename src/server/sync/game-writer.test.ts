// games 마스터 갱신 계획 테스트 — 순수 함수(planGameMeta)만. DB 는 건드리지 않는다.
// 여기서 지키는 규칙은 하나다: **다른 문자 체계로 세워진 제목이 우리가 이미 가진 제목을 덮지 않는다.**
// 닌텐도 두 소스는 영문 제목을 주지 않아 titleEn 자리에 한국어, 일본어가 들어온다
// (TEXT_FILL_ONLY_SOURCES). 그 값이 Steam 이 세운 영문 제목을 뒤집으면 목록이 읽히지 않는다.
import { describe, expect, it } from "vitest";
import type { Source } from "@/server/adapters/types";
import type { StoreSnapshot } from "@/server/adapters/types";
import type { Ctx } from "./context";
import { planGameMeta, type GameRow } from "./game-writer";

const NOW = new Date("2026-09-15T00:00:00.000Z");

function ctx(source: Source, locks: string[] = []): Ctx {
  return {
    db: null as unknown as Ctx["db"],
    source,
    now: NOW,
    locks: new Set(locks),
    processed: 0,
    failed: 0,
    errors: [],
    changedSlugs: new Set(),
    changedCompanySlugs: new Set(),
    priceChanges: [],
    droppedPrices: 0,
  };
}

function game(over: Partial<GameRow> = {}): GameRow {
  return {
    id: "g-1",
    slug: "pragmata",
    titleEn: "PRAGMATA",
    titleKo: null,
    publisher: "CAPCOM",
    ...over,
  } as GameRow;
}

const meta = (over: Partial<NonNullable<StoreSnapshot["meta"]>> = {}) =>
  ({ titleEn: "プラグマタ", titleKo: null, ...over }) as NonNullable<StoreSnapshot["meta"]>;

describe("planGameMeta 제목 권위", () => {
  it("nintendo_jp 는 이미 있는 영문 제목을 일본어로 덮지 않는다", () => {
    expect(planGameMeta(ctx("nintendo_jp"), game(), meta())).toEqual({});
  });

  it("nintendo 는 이미 있는 영문 제목을 한국어로 덮지 않는다", () => {
    expect(planGameMeta(ctx("nintendo"), game(), meta({ titleEn: "프라그마타" }))).toEqual({});
  });

  it("비어 있으면 채운다 — 그 스토어에만 있는 작품은 그 표기가 유일한 근거다", () => {
    const blank = game({ titleEn: "" });
    expect(planGameMeta(ctx("nintendo_jp"), blank, meta())).toEqual({ titleEn: "プラグマタ" });
  });

  it("한국어 제목은 이 규칙을 타지 않는다 — 늦게 온 값이 더 나은 값이다", () => {
    expect(planGameMeta(ctx("nintendo"), game(), meta({ titleEn: "프라그마타", titleKo: "프라그마타" }))).toEqual({
      titleKo: "프라그마타",
    });
  });

  it("영문 제목을 주는 소스는 그대로 덮는다", () => {
    expect(planGameMeta(ctx("steam"), game(), meta({ titleEn: "Pragmata" }))).toEqual({ titleEn: "Pragmata" });
  });

  it("회사 이름도 같은 규칙을 탄다 — 일본 표기가 기존 회사명을 덮지 않는다", () => {
    expect(planGameMeta(ctx("nintendo_jp"), game(), meta({ titleEn: undefined, publisher: "カプコン" }))).toEqual({});
  });
});
