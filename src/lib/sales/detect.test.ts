// 세일 실측 판정 테스트 — 기준은 2026 가을 세일 확정 회차(2026-10-01 17:00Z 부터 7일, 종료 10-08 17:00Z).
import { describe, expect, it } from "vitest";
import { SALE_DETECT_MIN_ROWS, detectRunningSale, runningSaleEndsAt } from "./detect";

const AUTUMN_END = new Date("2026-10-08T17:00:00Z");
const DURING = new Date("2026-10-02T06:00:00Z");

describe("detectRunningSale", () => {
  it("진행 중인 회차의 종료 시각에 묶음이 있으면 그 세일이다", () => {
    const hit = detectRunningSale(DURING, [
      { endsAt: new Date("2026-10-04T17:00:00Z"), count: 6 },
      { endsAt: AUTUMN_END, count: 1022 },
    ]);
    expect(hit).toEqual({ key: "autumn", name: "가을 세일", endsAt: AUTUMN_END, count: 1022 });
  });

  it("문턱 바로 아래는 아니고, 문턱과 같으면 맞다", () => {
    expect(detectRunningSale(DURING, [{ endsAt: AUTUMN_END, count: SALE_DETECT_MIN_ROWS - 1 }])).toBeNull();
    expect(detectRunningSale(DURING, [{ endsAt: AUTUMN_END, count: SALE_DETECT_MIN_ROWS }])?.key).toBe("autumn");
  });

  it("큰 묶음이어도 달력의 종료 시각과 다르면 세일로 안 본다(평소 주의 퍼블리셔 세일)", () => {
    // 2026-09-21 실측: 세일이 없는 주에 한 시각에 654행이 몰렸다
    const quietWeek = new Date("2026-09-18T06:00:00Z");
    expect(detectRunningSale(quietWeek, [{ endsAt: new Date("2026-09-21T17:00:00Z"), count: 654 }])).toBeNull();
  });

  it("세일 기간 중이어도 종료 시각이 초 단위로 어긋나면 안 맞는다(출시 기념 할인)", () => {
    expect(detectRunningSale(DURING, [{ endsAt: new Date("2026-10-08T17:00:24Z"), count: 500 }])).toBeNull();
  });

  it("달력상 진행 중이어도 데이터에 묶음이 없으면 null", () => {
    expect(detectRunningSale(DURING, [])).toBeNull();
  });

  it("세일이 끝난 뒤에는 묶음이 남아 있어도 null", () => {
    expect(detectRunningSale(new Date("2026-10-08T17:00:01Z"), [{ endsAt: AUTUMN_END, count: 1022 }])).toBeNull();
  });
});

describe("runningSaleEndsAt", () => {
  it("진행 중인 회차의 종료 시각", () => {
    expect(runningSaleEndsAt("autumn", DURING)).toEqual(AUTUMN_END);
  });

  it("진행 중이 아니거나 모르는 키면 null", () => {
    expect(runningSaleEndsAt("winter", DURING)).toBeNull();
    expect(runningSaleEndsAt("nope", DURING)).toBeNull();
  });
});
