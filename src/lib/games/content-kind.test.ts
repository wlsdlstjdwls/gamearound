// 예약 관련 상품 판정 테스트 — 실제로 본 제목만 넣는다(2026-09-18 카탈로그 실측).
import { describe, expect, it } from "vitest";
import { isCurrencyItemTitle, isPreOrderExtraTitle } from "./content-kind";

describe("isPreOrderExtraTitle", () => {
  it("예약 특전, 예약 팩은 본편이 아니다", () => {
    expect(isPreOrderExtraTitle("TCG Card Shop Simulator Pre-Order Bonus")).toBe(true);
    expect(isPreOrderExtraTitle("Aniimo Pre-Order Pack: Advanced Edition")).toBe(true);
    expect(isPreOrderExtraTitle("Age Of Wonders 4: Pre-Order Content Pack")).toBe(true);
    expect(isPreOrderExtraTitle("ONE PIECE: PIRATE WARRIORS 4 Pre-Order DLC Pack")).toBe(true);
    expect(isPreOrderExtraTitle("Dustborn Preorder Bonus")).toBe(true);
  });

  it("예약 중인 본편은 건드리지 않는다 — 값이 본편 값인 상품들이다", () => {
    expect(isPreOrderExtraTitle("Gears of War: E-Day Pre-Order")).toBe(false);
    expect(isPreOrderExtraTitle("Gears of War: E-Day Premium Edition Pre-Order")).toBe(false);
    expect(isPreOrderExtraTitle("The Relic: First Guardian Pre-order")).toBe(false);
  });

  it("예약과 상관없는 제목은 걸리지 않는다", () => {
    expect(isPreOrderExtraTitle("Starter Pack")).toBe(false);
    expect(isPreOrderExtraTitle("ELDEN RING")).toBe(false);
    expect(isPreOrderExtraTitle(null)).toBe(false);
    expect(isPreOrderExtraTitle("")).toBe(false);
  });
});

/**
 * 제목은 전부 2026-09-21 에 카탈로그에서 실제로 읽은 것이다.
 * 규칙만 적고 예를 안 남기면 다음 사람이 왜 숫자를 요구하는지 모른다.
 */
describe("isCurrencyItemTitle", () => {
  it.each([
    "디아블로 IV — 500 백금화",
    "Battlefield V — Battlefield 화폐 6000",
    "F1 25: 2,000 Pitcoin",
    "FIFA 16 Point 8,000점",
    "Sao Coins 2100",
    "Car Vouchers (24)",
    "Forza Horizon 6 Car Voucher 4",
  ])("재화 상품을 가른다: %s", (t) => {
    expect(isCurrencyItemTitle(t)).toBe(true);
  });

  /**
   * 숫자를 요구하지 않았다면 전부 본편에서 내려갔을 제목들이다.
   * "세대 호환 번들" 은 PS4 판과 PS5 판을 같이 주는 **본편**이고, 에디션도 본편이다.
   */
  it.each([
    "나라카:블레이드포인트",
    "투 포인트 뮤지엄",
    "투 포인트 호스피탈 완전 회복 컬렉션",
    "RACCOIN: Coin Pusher Roguelike",
    "Dead by Daylight - 골드 에디션",
    "콜 오브 듀티®: 블랙 옵스 7 - 세대 호환 번들",
    "The Crew Motorfest 크로스젠 번들",
    "CoA: 아틀란의 크리스탈",
  ])("재화 낱말이 들어간 본편은 건드리지 않는다: %s", (t) => {
    expect(isCurrencyItemTitle(t)).toBe(false);
  });

  it("빈 값은 판단하지 않는다", () => {
    expect(isCurrencyItemTitle(null)).toBe(false);
    expect(isCurrencyItemTitle("")).toBe(false);
  });

  /**
   * 2026-09-21 2차 실측. 낱말 사전이 못 따라간 자리를 수량 단위가 메운다 —
   * 사전에 프리즘, 스타, 유물을 넣었다면 같은 낱말을 쓴 본편이 죽었다.
   */
  it.each([
    "오버워치 — 신화 프리즘 100개",
    "MLB The Show 25를 위한 Stubs 67,500개",
    "금괴 245개",
    "스타 110개 — Among Us",
    "거대한 포션 — 힌트 250개",
    "콜 오브 듀티: 어드밴스드 워페어 — 고급 보급품 13개 (Windows)",
    "Paladins 수정 200개",
    "Killer Klowns From Outer Space: 티켓 450장",
  ])("수량 단위가 붙은 재화를 가른다: %s", (t) => {
    expect(isCurrencyItemTitle(t)).toBe(true);
  });

  /** 숫자 없는 재화도 있다 — 앞 회차의 "숫자 없는 재화는 0건" 전제가 깨진 자리다 */
  it("현금 카드는 숫자가 없어도 재화다", () => {
    expect(isCurrencyItemTitle("Gta 온라인: 메갈로돈 샤크 현금 카드")).toBe(true);
    expect(isCurrencyItemTitle("GTA 온라인: 불 샤크 현금 카드 (Xbox Series X|S)")).toBe(true);
  });

  /**
   * 수량 단위를 보되 기간과 낱말은 보지 않는다.
   * 개월은 기간이라 구독 상품이고, Loot Box 가 든 넷은 실제로 팔리는 **게임**이다.
   */
  it.each([
    "개인 플랜 12개월(365일간) 이용권",
    "‘저스트 댄스+’ 3개월 패스",
    "Let's Sing 2025 — 12개월 Vip 패스",
    "Loot Box Simulator",
    "Shadow Of Loot Box",
    "Loot Box Quest — Mystic Maidens",
    "Lootbox Lyfe+",
    // "개의" 는 게임 제목 꼴이라 규칙에서 뺐다. 이 게임은 12,400원짜리 Xbox 본편이다
    "100 개의 문 감옥에서 탈출해보세요— 감옥 탈출 게임",
    // 그 대가로 진짜 재화 셋을 놓친다. 놓치는 것을 알고 놓는다 — 본편을 내리는 쪽이 더 나쁘다
    "110개의 유물",
  ])("기간제 이용권과 Loot Box 게임은 건드리지 않는다: %s", (t) => {
    expect(isCurrencyItemTitle(t)).toBe(false);
  });
});
