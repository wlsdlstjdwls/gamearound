import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseXboxDescriptions, parseXboxPreorderBonus, readHeading, xboxBonusRows, XBOX_BONUS_DEFAULT_LABEL } from "./xbox-preorder";

// 2026-11-18 displaycatalog(market=KR, ko-kr) 응답에서 제목과 긴 소개만 남긴 것
const raw = JSON.parse(readFileSync(path.join(__dirname, "__fixtures__", "xbox-preorder-descriptions.json"), "utf8")) as unknown;
const descriptions = parseXboxDescriptions(raw);
const desc = (id: string) => descriptions.get(id)?.description ?? "";

describe("parseXboxDescriptions", () => {
  it("상품마다 제목과 긴 소개를 대문자 ID 로 담는다", () => {
    expect(descriptions.size).toBe(7);
    expect(descriptions.get("9P3H4968GRSM")?.title).toBe("Grand Theft Auto VI");
  });

  it("봉투가 깨지면 빈 결과 — 던지지 않고 부르는 쪽이 '모름' 으로 다룬다", () => {
    expect(parseXboxDescriptions({ Products: "x" }).size).toBe(0);
    expect(parseXboxDescriptions(null).size).toBe(0);
  });
});

describe("parseXboxPreorderBonus", () => {
  it("진격의 거인 3: [예약 특전], [조기 구매 특전] 두 묶음, 조기 구매만 마감일", () => {
    const r = parseXboxPreorderBonus(desc("9MT4F57F7CVW"));
    expect(r?.groups).toEqual([
      { label: "예약 특전", setName: null, items: ["주인공 의상 「캐릭터 편집 부품: 자유의 날개 피어스」"], endsOn: null },
      { label: "조기 구매 특전", setName: null, items: ["주인공 의상 「캐릭터 편집 부품: 자유의 날개 후드티」"], endsOn: "2026-12-23" },
    ]);
  });

  it("타이탄 퀘스트 2: '사전 주문 특전:' 뒤 - 항목, 빈 줄 뒤 본문에서 멈춘다", () => {
    const r = parseXboxPreorderBonus(desc("9NB1JJ0ZRQWG"));
    expect(r?.groups).toEqual([
      { label: "사전 주문 특전", setName: null, items: ["Cosmic Turtle Companion DLC", "96시간 먼저 체험 가능", "Titan Quest 보유 시 10% 할인"], endsOn: null },
    ]);
  });

  it("GTA VI: 날짜 머리말은 기본 이름으로, 날짜는 마감일로 — 머리말과 항목 사이 빈 줄을 넘는다", () => {
    const r = parseXboxPreorderBonus(desc("9P3H4968GRSM"));
    expect(r?.groups).toEqual([{ label: XBOX_BONUS_DEFAULT_LABEL, setName: null, items: ["빈티지 바이스 시티 팩", "GTA+ 한 달 이용"], endsOn: "2026-11-19" }]);
  });

  it("드래곤 퀘스트 몬스터즈 4: 【…특전: 세트 이름】 + 【구성】 항목, 구분선 뒤 에디션 구성은 읽지 않는다", () => {
    const r = parseXboxPreorderBonus(desc("9NSGK9XLGTZ6"));
    expect(r?.groups).toEqual([
      { label: "조기 구매 특전", setName: "모험 스타트 대시 세트", items: ["마물의 먹이 10개", "원기 구슬 3개", "스킬의 씨앗 5개"], endsOn: "2027-01-04" },
    ]);
  });

  it("트로피코 7: 머리말 뒤 한 문장은 그 문장을 특전 하나로", () => {
    const r = parseXboxPreorderBonus(desc("9N0ZT139CDJG"));
    expect(r?.groups).toHaveLength(1);
    expect(r?.groups[0].label).toBe("투칸 얼리 예약 보너스");
    expect(r?.groups[0].items).toHaveLength(1);
    expect(r?.groups[0].items[0]).toMatch(/^Tropico 7 - Deluxe Edition을 예약 구매하시면/);
  });

  it("페르소나4 리바이벌: 그 줄만 있는 '예약 구매 특전' 머리말, * 안내문에서 마감일", () => {
    const r = parseXboxPreorderBonus(desc("9N0D1SHFFK31"));
    expect(r?.groups[0]).toMatchObject({ label: "예약 구매 특전", endsOn: "2027-02-17" });
    expect(r?.groups[0].items).toHaveLength(6);
  });

  it("특전이 없는 소개는 null", () => {
    expect(parseXboxPreorderBonus(desc("9N8ZH70WV39B"))).toBeNull();
    expect(parseXboxPreorderBonus("")).toBeNull();
    expect(parseXboxPreorderBonus(null)).toBeNull();
  });

  it("머리말 없이 홍보 문장으로만 적은 특전은 읽지 않는다", () => {
    expect(parseXboxPreorderBonus("지금 Fable을 예약 구매하고 닭 슈트가 포함된 Pre-Order Content Pack을 받아 보세요.\n\n본문")).toBeNull();
  });

  it("본문 깊은 곳의 '…특전' 은 특전 마디가 아니다", () => {
    const text = ["소개 1", "소개 2", "소개 3", "소개 4", "소개 5", "소개 6", "【Digital Deluxe Edition 특전】", "・시즌 패스"].join("\n");
    expect(parseXboxPreorderBonus(text)).toBeNull();
  });

  it("특전 뒤 빈 줄 다음 괄호 소제목(에디션 구성)에서 멈춘다 — 건담 로그 오비트 꼴", () => {
    const text = "【예약 특전】\n■선행 개방 기체 컬러 「어스 블루」\n\n※안내\n\n【세트 내용】\n■게임 본편\n■부스트";
    expect(parseXboxPreorderBonus(text)?.groups).toEqual([{ label: "예약 특전", setName: null, items: ["선행 개방 기체 컬러 「어스 블루」"], endsOn: null }]);
  });

  it("CRLF 줄바꿈도 같게 읽는다", () => {
    expect(parseXboxPreorderBonus("사전 주문 특전:\r\n- 아이템 A\r\n\r\n본문")?.groups[0].items).toEqual(["아이템 A"]);
  });
});

describe("readHeading", () => {
  it("항목 표시로 시작하는 줄은 머리말이 아니다", () => {
    expect(readHeading("・마스터즈판 구매 특전 「몬스터 마스터의 길」")).toBeNull();
    expect(readHeading("※예약 구매 특전은 2027/4/7 23:59까지 예약 구매한 경우에 받을 수 있습니다.")).toBeNull();
  });

  it("특전 말이 없는 괄호, 콜론 줄은 머리말이 아니다", () => {
    expect(readHeading("【구성】")).toBeNull();
    expect(readHeading("에디션 구성:")).toBeNull();
  });
});

describe("xboxBonusRows", () => {
  it("세트 이름이 있으면 세트 하나에 구성을 안내 줄로", () => {
    const rows = xboxBonusRows(parseXboxPreorderBonus(desc("9NSGK9XLGTZ6"))!);
    expect(rows).toEqual([{ name: "모험 스타트 대시 세트", notes: ["조기 구매 특전", "마물의 먹이 10개", "원기 구슬 3개", "스킬의 씨앗 5개"], endsOn: "2027-01-04" }]);
  });

  it("세트 이름이 없으면 항목마다 하나, 어느 묶음인지를 안내 줄로", () => {
    const rows = xboxBonusRows(parseXboxPreorderBonus(desc("9P3H4968GRSM"))!);
    expect(rows.map((r) => r.name)).toEqual(["빈티지 바이스 시티 팩", "GTA+ 한 달 이용"]);
    expect(rows[0].notes).toEqual([XBOX_BONUS_DEFAULT_LABEL]);
  });

  it("같은 이름이 두 묶음에 나오면 앞의 것만", () => {
    const rows = xboxBonusRows({ groups: [
      { label: "예약 특전", setName: null, items: ["A"], endsOn: null },
      { label: "조기 구매 특전", setName: null, items: ["A", "B"], endsOn: "2027-01-01" },
    ] });
    expect(rows.map((r) => `${r.name}:${r.notes[0]}`)).toEqual(["A:예약 특전", "B:조기 구매 특전"]);
  });
});
