// games 마스터 갱신 계획 테스트 — 순수 함수(planGameMeta)만. DB 는 건드리지 않는다.
// 여기서 지키는 규칙은 둘이다.
//   1) 권위를 가진 소스(META_OVERWRITE_SOURCES = steam)만 이미 있는 값을 덮는다. 나머지는 빈 칸만 채운다 —
//      열어 두면 스토어끼리 같은 필드를 번갈아 뒤집고, 그 왕복이 매 실행 캐시를 무효화한다.
//   2) 그래도 빈 칸은 누구든 채운다. 스팀에 없는 게임에는 그 스토어의 표기가 유일한 근거다
//      (닌텐도 두 소스는 영문 제목을 주지 않아 titleEn 자리에 한국어, 일본어가 들어온다).
import { describe, expect, it } from "vitest";
import type { Source } from "@/server/adapters/types";
import type { StoreSnapshot } from "@/server/adapters/types";
import type { Ctx } from "./context";
import { isTitleEnRecovery, planGameMeta, type GameRow } from "./game-writer";

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
    touched: new Map(),
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

  it("한국어 제목도 이미 있으면 덮지 않는다 — 스토어끼리 번갈아 뒤집으면 매 실행 캐시가 날아간다", () => {
    const named = game({ titleKo: "프라그마타(구)" });
    expect(planGameMeta(ctx("nintendo"), named, meta({ titleEn: "프라그마타", titleKo: "프라그마타" }))).toEqual({});
  });

  it("비어 있던 한국어 제목은 어느 스토어든 채운다", () => {
    const blank = game({ titleKo: null });
    expect(planGameMeta(ctx("xbox"), blank, meta({ titleEn: undefined, titleKo: "프라그마타" }))).toEqual({
      titleKo: "프라그마타",
    });
  });

  it("설명, 개발사도 빈 칸이면 비-steam 이 채운다 — 스팀에 없는 게임의 유일한 근거다", () => {
    const blank = game({ description: null, developer: null });
    expect(
      planGameMeta(ctx("xbox"), blank, meta({ titleEn: undefined, description: "설명", developer: "개발사" })),
    ).toEqual({ description: "설명", developer: "개발사" });
  });

  it("영문 제목을 주는 소스는 그대로 덮는다", () => {
    expect(planGameMeta(ctx("steam"), game(), meta({ titleEn: "Pragmata" }))).toEqual({ titleEn: "Pragmata" });
  });

  it("회사 이름도 같은 규칙을 탄다 — 일본 표기가 기존 회사명을 덮지 않는다", () => {
    expect(planGameMeta(ctx("nintendo_jp"), game(), meta({ titleEn: undefined, publisher: "カプコン" }))).toEqual({});
  });
});

// 한글이 든 title_en 은 "채워진 값" 이 아니라 잘못 채워진 값이다 — 권위 없는 소스라도 라틴 이름으로 되돌린다.
// 09-15 발견 회차에 본편 1,443건이 한국어 제목으로 등록됐고, fillOnly 가 그걸 영영 굳히고 있었다(2026-09-17).
describe("planGameMeta 영문 제목 복구", () => {
  const contaminated = game({ titleEn: "게임개발 스토리" });

  it("한글이 든 영문 제목은 권위 없는 소스도 라틴 이름으로 덮는다", () => {
    expect(planGameMeta(ctx("xbox"), contaminated, meta({ titleEn: "Game Dev Story" }))).toEqual({
      titleEn: "Game Dev Story",
    });
  });

  it("후보에도 한글이 있으면 그대로 둔다 — 닌텐도 코리아 공식 표기가 그 형태다", () => {
    expect(
      planGameMeta(ctx("nintendo"), game({ titleEn: "ASTRAL CHAIN (애스트럴 체인)" }), meta({ titleEn: "ASTRAL CHAIN (애스트럴 체인)" })),
    ).toEqual({});
  });

  it("라틴 제목이 멀쩡하면 건드리지 않는다 — 복구는 오염된 자리에서만 돈다", () => {
    expect(planGameMeta(ctx("xbox"), game(), meta({ titleEn: "Pragmata" }))).toEqual({});
  });

  it("잠긴 필드는 복구도 하지 않는다 — 관리자가 고른 제목이 우선이다", () => {
    expect(planGameMeta(ctx("xbox", ["games:g-1:title_en"]), contaminated, meta({ titleEn: "Game Dev Story" }))).toEqual({});
  });
});

// 주소 갱신(store-apply)이 이 술어를 같이 쓴다 — 갈라지면 평범한 제목 정정에도 주소가 따라 바뀐다
describe("isTitleEnRecovery", () => {
  it("한글 제목을 라틴 이름으로 되돌리는 경우만 참이다", () => {
    expect(isTitleEnRecovery("게임개발 스토리", "Game Dev Story")).toBe(true);
  });

  it("평범한 제목 정정은 복구가 아니다", () => {
    expect(isTitleEnRecovery("Game", "Game: Definitive Edition")).toBe(false);
  });

  it("후보가 없으면 거짓이다", () => {
    expect(isTitleEnRecovery("게임개발 스토리", null)).toBe(false);
  });
});

// 인원수는 큰 값이 이긴다 — 스토어마다 판이 달라 숫자가 다르고, 덮어쓰면 두 스토어가 번갈아 뒤집는다
describe("planGameMeta 인원수", () => {
  const players = (local: number | null, online: number | null) => game({ localMaxPlayers: local, onlineMaxPlayers: online });

  it("빈 칸은 채운다", () => {
    expect(planGameMeta(ctx("xbox"), players(null, null), meta({ multiplayer: { localMax: 2, onlineMax: 6 } }))).toEqual({
      localMaxPlayers: 2,
      onlineMaxPlayers: 6,
    });
  });

  it("더 작은 값으로는 내리지 않는다", () => {
    expect(planGameMeta(ctx("xbox"), players(4, 12), meta({ multiplayer: { localMax: 2, onlineMax: 6 } }))).toEqual({});
  });

  it("더 큰 값으로는 올린다", () => {
    expect(planGameMeta(ctx("nintendo"), players(2, 6), meta({ multiplayer: { localMax: 4, onlineMax: 12 } }))).toEqual({
      localMaxPlayers: 4,
      onlineMaxPlayers: 12,
    });
  });

  it("잠긴 칸은 건드리지 않는다", () => {
    expect(planGameMeta(ctx("nintendo", ["games:g-1:local_max_players"]), players(2, null), meta({ multiplayer: { localMax: 4 } }))).toEqual({});
  });
});
