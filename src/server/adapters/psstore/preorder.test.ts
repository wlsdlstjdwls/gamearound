// PlayStation 예약 특전 읽기 — 2026-11-19 한국 콘셉트 페이지의 기본 상품 소개(preorder-page 로 꺼낸 글) 견본
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { xboxBonusRows, XBOX_BONUS_DEFAULT_LABEL } from "../xbox-preorder";
import { parsePsstorePreorderBonus, PSSTORE_EARLY_BONUS_LABEL, readPsstoreHeading } from "./preorder";

type Sample = { conceptId: string; slug: string; title: string; description: string };
const samples = JSON.parse(readFileSync(fileURLToPath(new URL("../__fixtures__/psstore-preorder-descriptions.json", import.meta.url)), "utf8")) as Sample[];
const desc = (slug: string): string => samples.find((s) => s.slug === slug)?.description ?? "";
const rows = (slug: string) => {
  const parsed = parsePsstorePreorderBonus(desc(slug));
  return parsed ? xboxBonusRows(parsed) : [];
};

describe("parsePsstorePreorderBonus: Xbox 와 같은 꼴", () => {
  it("진격의 거인 3: [예약 특전], [조기 구매 특전] 두 묶음, 조기 구매만 마감일", () => {
    expect(parsePsstorePreorderBonus(desc("attack-on-titan-3-a-o-t-3"))?.groups).toEqual([
      { label: "예약 특전", setName: null, items: ["주인공 의상 「캐릭터 편집 부품: 자유의 날개 피어스」"], endsOn: null },
      { label: "조기 구매 특전", setName: null, items: ["주인공 의상 「캐릭터 편집 부품: 자유의 날개 후드티」"], endsOn: "2026-12-23" },
    ]);
  });

  it("드래곤 퀘스트 몬스터즈 4: 【…특전: 세트 이름】 + 【구성】 항목, 구분선 뒤는 읽지 않는다", () => {
    expect(rows("dragon-quest-monsters-the-withered-world")).toEqual([
      { name: "모험 스타트 대시 세트", notes: ["조기 구매 특전", "마물의 먹이 10개", "원기 구슬 3개", "스킬의 씨앗 5개"], endsOn: "2027-01-04" },
    ]);
  });

  it("프리스타일 풋볼 2: '사전예약 시 아래 … 받으세요:' 머리말은 기본 이름, 빈 줄 뒤 '에디션 구성:' 에서 멈춘다", () => {
    expect(rows("freestyle-football-2").map((r) => `${r.name}|${r.notes[0]}`)).toEqual([
      `ZEPHYR 세트 (바람막이, 카고 바지, 트래블러, 러닝 고글)|${XBOX_BONUS_DEFAULT_LABEL}`,
      `HORIZON 세트 (바람막이, 레깅스, 스니커즈)|${XBOX_BONUS_DEFAULT_LABEL}`,
    ]);
  });

  it("FF7 리버레이션: ■예약 구매 특전, 슬래시 날짜 마감일", () => {
    expect(rows("final-fantasy-vii-revelation")).toEqual([{ name: "소환 마테리아: 로봇 초코보&모그리", notes: ["예약 구매 특전"], endsOn: "2027-04-07" }]);
  });
});

describe("parsePsstorePreorderBonus: PS 에서 더 본 꼴", () => {
  it("방랑검: 【예약 특전】 뒤 기한 괄호는 마감일로", () => {
    expect(rows("wandering-sword")).toEqual([{ name: "오리지널 코스튬 2종", notes: ["예약 특전"], endsOn: "2027-01-20" }]);
  });

  it("카리아의 아틀리에: 괄호 뒤 이름이 세트 이름, 설명 문단을 넘어 다음 머리말까지 읽는다", () => {
    expect(rows("atelier-karia-the-night-kingdom-the-guide-of-memories")).toEqual([
      { name: "카리아의 아틀리에 한정 포토 포즈&프레임", notes: ["예약 구매 특전"], endsOn: null },
      { name: "카리아의 아틀리에 노크타렘 개척 준비 세트", notes: ["조기 구매 특전"], endsOn: "2027-03-10" },
    ]);
  });

  it("약사의 혼잣말: 이름 머리말 + 설명 문단, 다음 묶음의 '– ' 항목", () => {
    expect(rows("the-apothecary-diaries-the-false-imperial-brother").map((r) => r.name)).toEqual([
      "Apothecary's Tasteful Accessory Pack",
      "Apothecary's Starter Aid Kit",
      "Apothecary's Modest Accessory Pack",
    ]);
  });

  it("레이튼 교수: '■ 예약 혜택: 이름'", () => {
    expect(rows("professor-layton-and-the-new-world-of-steam")).toEqual([{ name: "시리즈 사운드 셀렉션", notes: ["예약 혜택"], endsOn: "2026-12-09" }]);
  });

  it("Fate/EXTRA Record: 【프리오더 특전】 바로 다음 줄이 이름", () => {
    expect(rows("fate-extra-record")).toEqual([{ name: "「츠쿠미하라학원 교복」마이 서번트 의상 세트 조기 해방 코드", notes: ["프리오더 특전"], endsOn: null }]);
  });

  it("스트레인저 댄 헤븐: 특전을 말하는 안내 문장 + '수록 내용' 소제목", () => {
    expect(rows("stranger-than-heaven")).toEqual([{ name: "무기 '단도 카게키리'", notes: ["예약 특전"], endsOn: "2027-01-14" }]);
  });

  it("로맨싱 사가 3: '…까지 구매하면 … 받을 수 있습니다' + '■세트 내용' 은 조기 구매 특전, 마감일은 안내 문장에서", () => {
    expect(rows("romancing-saga-3-destinies-united")).toEqual([
      { name: "타티아나의 저금통", notes: [PSSTORE_EARLY_BONUS_LABEL], endsOn: "2027-02-15" },
      { name: "로빈의 영웅 지도서", notes: [PSSTORE_EARLY_BONUS_LABEL], endsOn: "2027-02-15" },
    ]);
  });

  it("Fable: '…다음이 포함된 …을 받으세요.' 바로 아래 항목", () => {
    expect(rows("fable-standard-edition").map((r) => r.name)).toEqual([
      "닭 슈트(코스메틱 의상)",
      "야생화 다발(인게임 선물)",
      "장난감 닭(인게임 선물)",
      "스콘과 잼 소풍 바구니(인게임 선물)",
    ]);
  });

  it("갓 오브 워 라우페이: 각주 표시를 걷고, '세트:' 아래 하위 항목은 괄호로 모은다", () => {
    expect(rows("god-of-war-laufey")).toEqual([
      { name: "마지막 소원 방어구 세트(마지막 소원 방어구, 마지막 소원 허리 보호대)", notes: ["예약주문 특전"], endsOn: null },
      { name: "프랭크의 황금빛 잎사귀 외형(꾸미기 전용)", notes: ["예약주문 특전"], endsOn: null },
      { name: "게임 내 자원 팩", notes: ["예약주문 특전"], endsOn: null },
    ]);
  });

  it("Until Dawn 2: '예약 주문 보너스 구성품¹:' 머리말은 '예약 주문 보너스'", () => {
    expect(rows("until-dawn-2").map((r) => r.notes[0])).toEqual(["예약 주문 보너스", "예약 주문 보너스"]);
  });
});

describe("parsePsstorePreorderBonus: 첫 줄 문장 안의 물건 이름", () => {
  it("레이맨, 엣지 오브 메모리즈: '…포함된 … 팩을 획득/받' 의 이름만 잘라 낸다", () => {
    expect(rows("rayman-legends-retold")).toEqual([{ name: "한정판 후드럼 하복 팩", notes: [XBOX_BONUS_DEFAULT_LABEL], endsOn: null }]);
    expect(rows("edge-of-memories")).toEqual([{ name: "레거시 코스튬 팩", notes: [XBOX_BONUS_DEFAULT_LABEL], endsOn: null }]);
  });

  it("이름 끝말 뒤 괄호까지 이름이다", () => {
    expect(parsePsstorePreorderBonus("사전 주문하시면 생존 의상(조기 잠금 해제)을 받으실 수 있습니다\n\n본문")?.groups[0].items).toEqual(["생존 의상(조기 잠금 해제)"]);
  });

  it("홍보 문장은 읽지 않는다: 윙스 클럽, Guns of Eschaton, 이름 끝말이 없는 Forza Horizon 6", () => {
    expect(parsePsstorePreorderBonus(desc("winx-club-moonlight-quest"))).toBeNull();
    expect(parsePsstorePreorderBonus(desc("guns-of-eschaton"))).toBeNull();
    expect(parsePsstorePreorderBonus(desc("forza-horizon-6"))).toBeNull();
  });

  it("예약 말이 없는 문장, 첫 줄이 아닌 문장은 읽지 않는다", () => {
    expect(parsePsstorePreorderBonus("게임을 시작하면 스타터 팩을 받을 수 있습니다.")).toBeNull();
    expect(parsePsstorePreorderBonus("소개\n\n지금 예약하면 포함된 레거시 코스튬 팩을 받을 수 있습니다.")).toBeNull();
  });
});

describe("parsePsstorePreorderBonus: 경계", () => {
  it("빈 소개는 null", () => {
    expect(parsePsstorePreorderBonus("")).toBeNull();
    expect(parsePsstorePreorderBonus(null)).toBeNull();
  });

  it("이름 붙은 머리말 뒤 설명은 한 문단만 넘긴다 — 두 번째 문단은 본문이다", () => {
    const text = "[예약 특전] 코스튬 팩\n\n전용 코스튬을 받아요.\n\n[조기 구매 특전] 무기 팩\n\n본문";
    expect(parsePsstorePreorderBonus(text)?.groups.map((g) => g.setName)).toEqual(["코스튬 팩", "무기 팩"]);
    const deep = "[예약 특전] 코스튬 팩\n\n설명 하나\n\n설명 둘\n\n[조기 구매 특전]\n・무기";
    expect(parsePsstorePreorderBonus(deep)?.groups.map((g) => g.setName)).toEqual(["코스튬 팩"]);
  });

  it("특전 항목 뒤 '구성품:' 소제목에서 멈춘다(에디션 구성)", () => {
    expect(parsePsstorePreorderBonus("예약 특전:\n- A\n구성품:\n- 게임 본편")?.groups[0].items).toEqual(["A"]);
  });
});

describe("readPsstoreHeading", () => {
  it("괄호 머리말 뒤가 문장이면 그 문장이 특전 내용이다", () => {
    expect(readPsstoreHeading("[예약 특전] 지금 예약하면 코스튬을 드립니다.")).toEqual({ label: "예약 특전", setName: null, inline: "지금 예약하면 코스튬을 드립니다." });
  });

  it("예약, 구매가 붙지 않은 혜택은 머리말이 아니다", () => {
    expect(readPsstoreHeading("■ PS Plus 혜택: 온라인 플레이")).toBeNull();
    expect(readPsstoreHeading("・예약 구매 특전 「코스튬」")).toBeNull();
  });
});
