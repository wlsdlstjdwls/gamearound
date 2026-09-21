import { describe, expect, it } from "vitest";
import { normalizeForSearch, normalizeTitle, seriesConflict, seriesNumbers, slugify, slugWithSuffix, trigramSimilarity } from "./slug";

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

  // 기종은 game_platforms 의 축이지 제목의 축이 아니다(2026-09-16).
  // 이걸 안 떼면 "호그와트 레거시 PS5 버전" 이 새 게임으로 등록돼 본편 상세에 PS 가격이 안 붙는다.
  describe("괄호 없이 꼬리로 붙은 기종", () => {
    it.each([
      ["Hogwarts Legacy PS5 Version", "hogwarts legacy"],
      ["호그와트 레거시 PS5 버전", "호그와트 레거시"],
      ["호그와트 레거시 버전", "호그와트 레거시"], // PlayStation 한국어 SKU 는 기종을 빼고 "버전" 만 남긴다
      ["Cooking Simulator Windows", "cooking simulator"],
      ["MotoGP 25 — Xbox One", "motogp 25"],
      ["ELDEN RING Shadow of the Erdtree PS4 & PS5", "elden ring shadow of the erdtree"],
    ])("%s → %s", (input, expected) => {
      expect(normalizeTitle(input)).toBe(expected);
    });

    it("제목의 일부인 기종 이름은 지킨다", () => {
      // 꼬리로 붙은 것만 뗀다 — 앞이나 가운데에 있는 낱말은 제목 그 자체다
      expect(normalizeTitle("PC Building Simulator")).toBe("pc building simulator");
      expect(normalizeTitle("Xbox Game Pass")).toBe("xbox game pass");
      // 통째로 지우면 빈 제목이 된다 — 빈 제목은 아무하고나 붙는다
      expect(normalizeTitle("Switch")).toBe("switch");
    });

    it("기종만 다른 SKU 는 본편과 유사도 1.0 이라 흡수된다", () => {
      expect(trigramSimilarity("Hogwarts Legacy", "Hogwarts Legacy PS5 Version")).toBe(1);
      expect(trigramSimilarity("호그와트 레거시", "호그와트 레거시 버전")).toBe(1);
    });
  });

  // 한국 스토어의 "판" 꼬리. 라틴 "standard edition" 은 떼면서 그 한국어판을 못 떼어
  // "디아블로 IV — 일반판" 이 본편과 별개 게임으로 앉았다(2026-09-21 실측).
  describe("한국어 판매 단위 꼬리", () => {
    it.each([
      ["디아블로 IV — 일반판", "디아블로 iv"],
      ["디아블로® IV", "디아블로 iv"],
      ["메탈기어 솔리드 델타 완전판", "메탈기어 솔리드 델타"],
      ["용과 같이 0 제품판", "용과 같이 0"],
      ["파이널 판타지 XVI 디럭스판", "파이널 판타지 xvi"],
    ])("%s → %s", (input, expected) => {
      expect(normalizeTitle(input)).toBe(expected);
    });

    it("일반판은 본편과 유사도 1.0 이라 흡수된다", () => {
      expect(trigramSimilarity("디아블로® IV", "디아블로 IV — 일반판")).toBe(1);
    });

    it("데모와 별개 상품은 그대로 둔다", () => {
      // 체험판을 본편에 흡수하면 무료 가격이 본편 가격을 덮는다
      expect(normalizeTitle("몬스터 헌터 와일즈 체험판")).toBe("몬스터 헌터 와일즈 체험판");
      // 확장판은 값도 내용도 다른 별개 상품이다
      expect(normalizeTitle("스타크래프트 확장판")).toBe("스타크래프트 확장판");
    });

    it("'판' 으로 끝나는 진짜 제목은 지킨다", () => {
      // 카탈로그에 실제로 있다 — 접미어를 낱말로 못 박은 이유
      expect(normalizeTitle("기동전사 건담 3:심판")).toBe("기동전사 건담 3 심판");
    });
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

// 접미어에는 스토어 외부 ID 가 그대로 들어온다 — 주소에 못 쓸 글자를 걸러야 한다(2026-09-17)
describe("slugWithSuffix", () => {
  it("Epic 외부 ID 의 콜론을 주소에 남기지 않는다", () => {
    expect(slugWithSuffix("maneater-truth-quest", "turtle:dd2c5fdab4104ad5b8577bef89db4c8a")).toBe(
      "maneater-truth-quest-turtle-dd2c5fdab4104ad5b8577bef89db4c8a",
    );
  });

  it("Xbox 대문자 ID 를 소문자로 내린다", () => {
    expect(slugWithSuffix("the-settlers-new-allies", "9NPGPDCXWJQ7")).toBe("the-settlers-new-allies-9npgpdcxwjq7");
  });

  it("숫자 접미어는 그대로다", () => {
    expect(slugWithSuffix("pragmata", 2)).toBe("pragmata-2");
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

// 2026-09-15 검수 큐 36건 실측 표본. 이 규칙이 그 큐를 비운 근거다.
describe("시리즈 번호", () => {
  it("로마 숫자와 아라비아 숫자를 같은 번호로 읽는다", () => {
    expect(seriesNumbers("Dragon's Dogma II")).toEqual(new Set([2]));
    expect(seriesNumbers("Dragon's Dogma 2")).toEqual(new Set([2]));
    expect(seriesNumbers("Hearts of Iron IV")).toEqual(new Set([4]));
  });

  it("번호가 없으면 1편으로 본다", () => {
    expect(seriesNumbers("Darkest Dungeon")).toEqual(new Set([1]));
    expect(seriesNumbers("How to Fish 1")).toEqual(new Set([1]));
  });

  it("글자에 붙은 숫자는 시리즈 번호가 아니다", () => {
    // 3D 는 판본 표시, ps4/ps5 는 기기 표시, mwii 는 약어다
    expect(seriesNumbers("STAR WARS: Rogue Squadron 3D")).toEqual(new Set([1]));
    expect(seriesNumbers("ELDEN RING Shadow of the Erdtree PS4 & PS5")).toEqual(new Set([1]));
  });

  const conflict: [string, string][] = [
    ["Darkest Dungeon", "Darkest Dungeon II"],
    ["Hearts of Iron IV", "Hearts of Iron"],
    ["The Sinking City Remastered", "The Sinking City 2"],
    ["Total War: ROME REMASTERED", "Total War: Rome II"],
    ["Road to Empress I", "Road to Empress II"],
    ["BLACK SOULS", "Black Souls II"],
    ["Cities: Skylines II - Creator Pack: Skyscrapers", "Cities: Skylines - Content Creator Pack: Skyscrapers"],
  ];
  const sameSeries: [string, string][] = [
    ["Dragon's Dogma 2", "Dragon's Dogma II"],
    ["Warlords Battlecry 2", "Warlords Battlecry II"],
    ["Divinity: Original Sin 2 - Definitive Edition", "Divinity: Original Sin II"],
    ["Mad Experiments: Escape Room 2", "Mad Experiments 2: Escape Room"],
    ["How to Fish", "How to Fish 1"],
    ["Stronghold HD", "Stronghold"],
    ["STAR WARS™: Rogue Squadron 3D", "Star Wars: Rogue Squadron"],
    ["ELDEN RING Shadow of the Erdtree", "ELDEN RING Shadow of the Erdtree PS4 & PS5"],
    ["Tropico 6 - The Llama of Wall Street", "Tropico 6 - The Llama of Wall Street DLC"],
  ];

  it.each(conflict)("속편은 어긋난다: %s / %s", (a, b) => {
    expect(seriesConflict(a, b)).toBe(true);
  });

  it.each(sameSeries)("같은 편은 어긋나지 않는다: %s / %s", (a, b) => {
    expect(seriesConflict(a, b)).toBe(false);
  });

  it("로마 숫자를 접으면 같은 속편이 auto 임계값을 넘는다", () => {
    // 접기 전 실측 0.71. 이 값이 다시 0.9 아래로 내려가면 검수 큐가 도로 찬다
    expect(trigramSimilarity("Dragon's Dogma 2", "Dragon's Dogma II")).toBeGreaterThanOrEqual(0.9);
    expect(trigramSimilarity("Stronghold HD", "Stronghold")).toBeGreaterThanOrEqual(0.9);
  });
});
