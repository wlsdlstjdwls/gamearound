// IGDB 회사 고르기, 변환 — 2026-11-03 실측 응답 꼴을 줄여 픽스처로
import { describe, expect, it } from "vitest";
import { pickCompany, toCompanyInfo, type IgdbCompanyRaw } from "./parse";

const c17: IgdbCompanyRaw = {
  id: 61234,
  name: "17Studio",
  country: 398,
  start_date: 1300320000,
  description: "17Studio is an independent game indie studio",
  logo: { image_id: "cl1abc" },
  websites: [{ url: "https://twitter.com/x", type: 5 }, { url: "https://17studio.kz", type: 1 }],
  developed: [{ name: "911: Cannibal" }],
};

describe("pickCompany", () => {
  it("이름이 같고 게임이 겹치는 후보 하나를 고른다", () => {
    expect(pickCompany("17Studio", ["911: Cannibal™"], [c17])?.id).toBe(61234);
  });

  it("게임이 하나도 안 겹치면 고르지 않는다(동명 회사 방지)", () => {
    expect(pickCompany("17Studio", ["Other Game"], [c17])).toBeNull();
  });

  it("겹치는 동명 후보가 둘이면 고르지 않는다", () => {
    expect(pickCompany("17Studio", ["911: Cannibal"], [c17, { ...c17, id: 2 }])).toBeNull();
  });

  it("이름이 다르면 고르지 않는다", () => {
    expect(pickCompany("17 Studios Inc", ["911: Cannibal"], [{ ...c17, name: "Studio 17" }])).toBeNull();
  });
});

describe("toCompanyInfo", () => {
  it("숫자 나라 코드를 두 글자와 한국어 이름으로, 공식 사이트와 로고 주소를 만든다", () => {
    expect(toCompanyInfo(c17)).toEqual({
      igdbId: 61234,
      countryCode: "KZ",
      countryNameKo: "카자흐스탄",
      foundedAt: "2011-03-17",
      websiteUrl: "https://17studio.kz",
      description: "17Studio is an independent game indie studio",
      logoUrl: "https://images.igdb.com/igdb/image/upload/t_logo_med/cl1abc.png",
    });
  });

  it("표에 없는 나라 번호는 비운다", () => {
    expect(toCompanyInfo({ id: 1, name: "x", country: 999 }).countryCode).toBeNull();
  });
});
