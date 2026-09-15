import { describe, expect, it } from "vitest";
import {
  canPlaceOnScale,
  PER_HOUR_MIN_SAMPLE,
  perHourPosition,
  perHourVerdict,
  pricePerHour,
  toPositiveNumber,
  type PricePerHourScale,
} from "./price-per-hour";

const SCALE: PricePerHourScale = {
  currency: "KRW",
  sampleSize: 1200,
  q1: 400,
  median: 900,
  q3: 1800,
  axisMax: 3000,
};

describe("pricePerHour", () => {
  it("가격을 시간으로 나눠 반올림한다", () => {
    expect(pricePerHour(26460, 60)).toBe(441);
    expect(pricePerHour(10000, 3)).toBe(3333);
  });

  it("값이 없거나 0 이하면 null", () => {
    expect(pricePerHour(null, 60)).toBeNull();
    expect(pricePerHour(26460, null)).toBeNull();
    expect(pricePerHour(0, 60)).toBeNull();
    expect(pricePerHour(26460, 0)).toBeNull();
    expect(pricePerHour(-100, 60)).toBeNull();
  });
});

describe("toPositiveNumber", () => {
  it("numeric 문자열을 숫자로 읽는다", () => {
    expect(toPositiveNumber("57.5")).toBe(57.5);
  });

  it("빈 값, 0, 음수, 숫자가 아닌 것은 null", () => {
    expect(toPositiveNumber("")).toBeNull();
    expect(toPositiveNumber(null)).toBeNull();
    expect(toPositiveNumber(undefined)).toBeNull();
    expect(toPositiveNumber("0")).toBeNull();
    expect(toPositiveNumber(-3)).toBeNull();
    expect(toPositiveNumber("모름")).toBeNull();
  });
});

describe("perHourVerdict", () => {
  it("q1 미만은 싼 편, q3 초과는 비싼 편, 사이는 보통", () => {
    expect(perHourVerdict(200, SCALE)).toBe("cheap");
    expect(perHourVerdict(900, SCALE)).toBe("mid");
    expect(perHourVerdict(5000, SCALE)).toBe("pricy");
  });

  it("경계값은 아직 그 편이 아니다 - 표본이 조금 움직여도 판정이 안 뒤집히게", () => {
    expect(perHourVerdict(SCALE.q1, SCALE)).toBe("mid");
    expect(perHourVerdict(SCALE.q3, SCALE)).toBe("mid");
  });
});

describe("perHourPosition", () => {
  it("축 길이에 대한 비율을 퍼센트로 준다", () => {
    expect(perHourPosition(1500, 3000)).toBe(50);
  });

  it("양끝은 여백 안쪽에 붙여 세운다", () => {
    expect(perHourPosition(0.1, 3000)).toBe(2);
    expect(perHourPosition(99999, 3000)).toBe(98);
  });

  it("축이 없으면 왼쪽 끝", () => {
    expect(perHourPosition(441, 0)).toBe(2);
  });
});

describe("canPlaceOnScale", () => {
  it("같은 통화, 표본 충분, 축이 있으면 얹는다", () => {
    expect(canPlaceOnScale("KRW", SCALE)).toBe(true);
  });

  it("통화가 다르면 얹지 않는다 - 환산하지 않기로 했다", () => {
    expect(canPlaceOnScale("USD", SCALE)).toBe(false);
    expect(canPlaceOnScale("JPY", SCALE)).toBe(false);
  });

  it("표본이 적으면 얹지 않는다", () => {
    expect(canPlaceOnScale("KRW", { ...SCALE, sampleSize: PER_HOUR_MIN_SAMPLE - 1 })).toBe(false);
  });

  it("분포가 없으면 얹지 않는다", () => {
    expect(canPlaceOnScale("KRW", null)).toBe(false);
  });

  it("축 끝이 0 이면 얹지 않는다 - 나눗셈이 뜻을 잃는다", () => {
    expect(canPlaceOnScale("KRW", { ...SCALE, axisMax: 0 })).toBe(false);
  });
});
