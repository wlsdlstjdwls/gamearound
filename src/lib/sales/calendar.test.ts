// 세일 일정 계산 테스트 — 순수 함수만. 네트워크도 DB 도 쓰지 않는다.
//
// 기준 날짜는 주석의 ANCHOR(과거 실제 회차)를 그대로 쓴다.
// 규칙을 고쳤을 때 과거 회차가 재현되지 않으면 그 규칙이 틀린 것이다.
import { describe, expect, it } from "vitest";
import {
  STEAM_SALES,
  countdownParts,
  inactiveSales,
  nthWeekdayOf,
  occurrenceIn,
  upcomingSales,
} from "./calendar";

const ymd = (d: Date): string => d.toISOString().slice(0, 10);
const sale = (key: string) => STEAM_SALES.find((s) => s.key === key)!;

describe("nthWeekdayOf", () => {
  it("그 달의 n번째 요일", () => {
    // 2025년 3월 목요일: 6, 13, 20, 27
    expect(ymd(nthWeekdayOf(2025, 3, 4, 2))).toBe("2025-03-13");
  });

  it("nth 가 -1 이면 마지막 해당 요일", () => {
    // 2025년 6월 목요일: 5, 12, 19, 26
    expect(ymd(nthWeekdayOf(2025, 6, 4, -1))).toBe("2025-06-26");
  });

  it("1일이 이미 그 요일이면 1일이 첫 번째다", () => {
    // 2026-01-01 은 목요일
    expect(ymd(nthWeekdayOf(2026, 1, 4, 1))).toBe("2026-01-01");
  });
});

describe("occurrenceIn: 과거 회차를 재현한다", () => {
  it("여름 세일 2023, 2024, 2025", () => {
    expect(ymd(occurrenceIn(sale("summer"), 2023).startsAt)).toBe("2023-06-29");
    expect(ymd(occurrenceIn(sale("summer"), 2024).startsAt)).toBe("2024-06-27");
    expect(ymd(occurrenceIn(sale("summer"), 2025).startsAt)).toBe("2025-06-26");
  });

  it("겨울 세일 2023, 2024, 2025", () => {
    expect(ymd(occurrenceIn(sale("winter"), 2023).startsAt)).toBe("2023-12-21");
    expect(ymd(occurrenceIn(sale("winter"), 2024).startsAt)).toBe("2024-12-19");
    expect(ymd(occurrenceIn(sale("winter"), 2025).startsAt)).toBe("2025-12-18");
  });

  it("봄 세일 2024, 2025", () => {
    expect(ymd(occurrenceIn(sale("spring"), 2024).startsAt)).toBe("2024-03-14");
    expect(ymd(occurrenceIn(sale("spring"), 2025).startsAt)).toBe("2025-03-13");
  });

  it("할로윈 세일 2024, 2025", () => {
    expect(ymd(occurrenceIn(sale("halloween"), 2024).startsAt)).toBe("2024-10-28");
    expect(ymd(occurrenceIn(sale("halloween"), 2025).startsAt)).toBe("2025-10-27");
  });

  it("겨울 세일은 해를 넘겨 끝난다", () => {
    expect(ymd(occurrenceIn(sale("winter"), 2025).endsAt)).toBe("2026-01-01");
  });
});

describe("upcomingSales", () => {
  it("가까운 순서로 준다", () => {
    const list = upcomingSales(new Date("2026-01-20T00:00:00Z"));
    expect(list.map((u) => u.sale.key)).toEqual(["spring", "summer", "halloween", "autumn", "winter"]);
  });

  it("진행 중이면 running 이고 종료까지 남은 시간을 센다", () => {
    // 2025 여름 세일은 06-26 17시(UTC) 시작, 14일간
    const list = upcomingSales(new Date("2025-06-30T00:00:00Z"));
    const summer = list.find((u) => u.sale.key === "summer")!;
    expect(summer.status).toBe("running");
    expect(summer.remainingMs).toBe(occurrenceIn(sale("summer"), 2025).endsAt.getTime() - Date.parse("2025-06-30T00:00:00Z"));
  });

  it("아직이면 upcoming 이고 시작까지 남은 시간을 센다", () => {
    const now = new Date("2025-06-01T00:00:00Z");
    const summer = upcomingSales(now).find((u) => u.sale.key === "summer")!;
    expect(summer.status).toBe("upcoming");
    expect(summer.remainingMs).toBe(occurrenceIn(sale("summer"), 2025).startsAt.getTime() - now.getTime());
  });

  it("해를 넘겨 진행 중인 겨울 세일을 1월에도 잡는다", () => {
    // 작년 회차까지 보지 않으면 이 건을 놓친다
    const winter = upcomingSales(new Date("2025-12-31T00:00:00Z")).find((u) => u.sale.key === "winter")!;
    expect(winter.status).toBe("running");
    expect(ymd(winter.startsAt)).toBe("2025-12-18");
  });

  it("끝난 회차는 내년 것으로 넘어간다", () => {
    const summer = upcomingSales(new Date("2025-08-01T00:00:00Z")).find((u) => u.sale.key === "summer")!;
    expect(ymd(summer.startsAt)).toBe("2026-06-25");
  });

  it("중단된 세일은 목록에 넣지 않는다", () => {
    const keys = upcomingSales(new Date("2026-01-20T00:00:00Z")).map((u) => u.sale.key);
    expect(keys).not.toContain("lunar");
  });
});

describe("inactiveSales", () => {
  it("사유가 있는 세일만 준다", () => {
    const list = inactiveSales();
    expect(list.map((s) => s.key)).toEqual(["lunar"]);
    expect(list[0].inactiveReason).toBeTruthy();
  });
});

describe("countdownParts", () => {
  it("일, 시, 분, 초로 쪼갠다", () => {
    const ms = ((2 * 24 + 3) * 60 + 4) * 60_000 + 5_000;
    expect(countdownParts(ms)).toEqual({ days: 2, hours: 3, minutes: 4, seconds: 5 });
  });

  it("음수는 0 으로 눕힌다", () => {
    expect(countdownParts(-1000)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  });
});
