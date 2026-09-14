import { describe, expect, it } from "vitest";
import { normalizeForSearch, normalizeTitle, slugify, trigramSimilarity } from "./slug";

// 이 규칙은 games.title_en_norm / title_ko_norm 생성 컬럼과 짝을 이룬다.
// SQL: lower(regexp_replace(title, '[^[:alnum:]]+', '', 'g')) — C.UTF-8 기준
describe("normalizeForSearch", () => {
  it.each([
    ["ELDEN RING", "eldenring"],
    ["엘든 링", "엘든링"],
    ["엘든링", "엘든링"],
    ["철권 8", "철권8"],
    ["철권8", "철권8"],
    ["Diablo® IV", "diabloiv"],
    ["Diablo™ IV", "diabloiv"],
    ["Sid Meier's Civilization® VI", "sidmeierscivilizationvi"],
    ["Warhammer 40,000: Space Marine 2", "warhammer40000spacemarine2"],
    ["  공백   투성이  ", "공백투성이"],
    ["ダークソウル", "ダークソウル"],
    ["三國志", "三國志"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeForSearch(input)).toBe(expected);
  });

  it("공백, 구두점만 다른 제목은 같은 키가 된다", () => {
    expect(normalizeForSearch("엘든 링")).toBe(normalizeForSearch("엘든링"));
    expect(normalizeForSearch("ELDEN RING:")).toBe(normalizeForSearch("eldenring"));
  });

  it("구두점뿐인 질의는 빈 문자열 — 호출부가 전체 매치를 피하도록", () => {
    expect(normalizeForSearch("!!! ???")).toBe("");
  });
});

// 에디션, 플랫폼 표시는 매칭 전에 떨어져야 한다 — Xbox 카탈로그가 같은 게임을 SKU 별로 내보내
// "볼트 에디션", "(Windows)" 가 각각 새 게임으로 등록되던 문제(2026-09-14 실측).
describe("normalizeTitle", () => {
  it.each([
    ["Call of Duty®: Modern Warfare® 4 - Vault Edition", "call of duty modern warfare 4"],
    ["Call of Duty®: Modern Warfare® 4 - Vault Edition (Windows)", "call of duty modern warfare 4"],
    ["콜 오브 듀티®: 모던 워페어 4 - 볼트 에디션 (Windows)", "콜 오브 듀티 모던 워페어 4"],
    ["Grand Theft Auto VI: Ultimate Edition", "grand theft auto vi"],
    ["Diablo II: Resurrected – Infernal Edition", "diablo ii resurrected"],
    ["ELDEN RING Deluxe Edition", "elden ring"],
    ["Vault Edition", "vault edition"], // 통째로 지우면 빈 제목이 된다 — 원본을 지킨다
  ])("%s → %s", (input, expected) => {
    expect(normalizeTitle(input)).toBe(expected);
  });

  it("부제는 살리고 에디션 이름만 뗀다", () => {
    // 에디션 이름을 두 낱말까지만 보는 이유 — 부제가 통째로 날아가면 서로 다른 게임이 한 제목이 된다
    expect(normalizeTitle("Halo: Combat Evolved Anniversary Edition")).toBe("halo combat evolved");
    expect(normalizeTitle("Halo: The Master Chief Collection")).toBe("halo the master chief collection");
  });

  it("에디션만 다른 SKU 는 본편과 유사도 1.0 이라 흡수된다", () => {
    expect(
      trigramSimilarity("Call of Duty®: Modern Warfare® 4", "Call of Duty®: Modern Warfare® 4 - Vault Edition (Windows)"),
    ).toBe(1);
    expect(trigramSimilarity("Grand Theft Auto VI", "Grand Theft Auto VI: Ultimate Edition")).toBe(1);
  });

  it("서로 다른 게임은 합쳐지지 않는다", () => {
    expect(trigramSimilarity("Halo: Combat Evolved Anniversary", "Halo: The Master Chief Collection")).toBeLessThan(0.9);
  });
});

describe("slugify — 글자를 쓰는 언어", () => {
  it("가나, 한자를 버리지 않는다 — 버리면 라틴 조각만 남아 뜻을 잃는다", () => {
    expect(slugify("ロマンシング サガ3 デスティニーユナイテッド")).toBe("ロマンシング-サガ3-デスティニーユナイテッド");
    expect(slugify("ゼルダ無双 厄災の黙示録 DX")).toBe("ゼルダ無双-厄災の黙示録-dx");
    expect(slugify("非凡仙途")).toBe("非凡仙途");
  });

  it("한글, 영문 slug 는 그대로다", () => {
    expect(slugify("Hollow Knight")).toBe("hollow-knight");
    expect(slugify("젤다의 전설")).toBe("젤다의-전설");
  });

  it("섞인 제목은 둘 다 남긴다", () => {
    expect(slugify("餓狼伝説 City of the Wolves")).toBe("餓狼伝説-city-of-the-wolves");
  });
});

// 일본 eShop 을 붙이면서 드러난 문제(2026-09-14): normalizeTitle 이 가나, 한자를 버려
// 일본어 제목이 통째로 빈 문자열이 됐다. 빈 것끼리는 유사도 1.0 이라 서로 다른 일본 게임이
// auto 로 합쳐지고, 같은 게임의 판매 단위는 반대로 못 알아봤다.
describe("normalizeTitle — 일본어", () => {
  it("가나, 한자를 남긴다 — 버리면 라틴 조각만 남거나 빈 제목이 된다", () => {
    expect(normalizeTitle("ゼルダ無双 厄災の黙示録 DX")).toBe("ゼルダ無双 厄災の黙示録 dx");
    expect(normalizeTitle("非凡仙途")).toBe("非凡仙途");
  });

  it("전각은 반각으로 맞춘다 — 같은 게임을 스토어마다 다르게 적는다", () => {
    expect(normalizeTitle("マリオカート８ デラックス")).toBe(normalizeTitle("マリオカート8 デラックス"));
    expect(normalizeTitle("Ｒ－ＴＹＰＥ ＦＩＮＡＬ 2")).toBe(normalizeTitle("R-TYPE FINAL 2"));
  });

  it("판매 단위 표시를 뗀다 — 일본어는 공백 없이 붙어 온다", () => {
    expect(normalizeTitle("ポケットモンスター スカーレットダウンロード版")).toBe("ポケットモンスター スカーレット");
    expect(normalizeTitle("ゼルダの伝説 ブレス オブ ザ ワイルド 通常版")).toBe("ゼルダの伝説 ブレス オブ ザ ワイルド");
    expect(normalizeTitle("ペルソナ5 ザ・ロイヤル デラックスエディション")).toBe("ペルソナ5 ザ ロイヤル");
  });

  it("체험판은 떼지 않는다 — 본편에 흡수하면 무료 데모 가격이 본편을 덮는다", () => {
    expect(normalizeTitle("スプラトゥーン3 体験版")).toContain("体験版");
  });

  it("꼬리만 남는 제목은 원본을 지킨다", () => {
    expect(normalizeTitle("ダウンロード版")).toBe("ダウンロード版");
  });
});

// 임계값(AUTO 0.9 / PENDING 0.7)을 그대로 두어도 되는지 재보는 표본.
// 여기가 깨지면 임계값이 아니라 정규화를 먼저 의심한다 — 2026-09-14 에도 원인은 정규화였다.
describe("trigramSimilarity — 임계값 표본", () => {
  const same: [string, string][] = [
    ["ポケットモンスター スカーレット", "ポケットモンスター スカーレットダウンロード版"],
    ["ゼルダの伝説 ブレス オブ ザ ワイルド", "ゼルダの伝説ブレスオブザワイルド"],
    ["ファイナルファンタジー VII リメイク", "ファイナルファンタジーVIIリメイク"],
    ["ドラゴンクエストXI 過ぎ去りし時を求めて S", "ドラゴンクエストXI 過ぎ去りし時を求めて"],
    ["몬스터 헌터 라이즈", "몬스터헌터라이즈"],
    ["Call of Duty®: Modern Warfare® 4", "Call of Duty: Modern Warfare 4"],
  ];
  const diff: [string, string][] = [
    ["ポケットモンスター スカーレット", "ポケットモンスター バイオレット"],
    ["ファイアーエムブレム 風花雪月", "ファイアーエムブレム無双 風花雪月"],
    ["スプラトゥーン2", "スプラトゥーン3"],
    ["モンスターハンターライズ", "モンスターハンターライズ：サンブレイク"],
    ["あつまれ どうぶつの森", "とびだせ どうぶつの森"],
    ["三國志", "三國無双"],
    ["Portal", "Portal 2"],
    ["Hollow Knight", "Hollow Knight Silksong"],
  ];

  it.each(same)("같은 게임은 0.85 이상: %s / %s", (a, b) => {
    expect(trigramSimilarity(a, b)).toBeGreaterThanOrEqual(0.85);
  });

  it.each(diff)("다른 게임은 0.7 미만: %s / %s", (a, b) => {
    expect(trigramSimilarity(a, b)).toBeLessThan(0.7);
  });

  it("글자를 못 남긴 제목끼리 붙지 않는다 — 빈 키는 0", () => {
    expect(trigramSimilarity("★★★", "!!!")).toBe(0);
    expect(trigramSimilarity("★★★", "Hollow Knight")).toBe(0);
  });
});
