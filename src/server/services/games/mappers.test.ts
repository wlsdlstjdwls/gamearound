// 원산지 고르기 — 상세 화면의 출시일 줄이 국기 하나를 여기서 받는다.
// 회사가 여럿 붙는 게임이 흔해서(개발 스튜디오 + 모회사 + 지역 배급사) "어느 줄을 고르나" 가 규칙이다.
import { describe, expect, it } from "vitest";
import { originCountry } from "./mappers";
import type { GameCompanyDto } from "./dto";

const company = (p: Partial<GameCompanyDto>): GameCompanyDto => ({
  slug: "c",
  name: "회사",
  countryNameKo: null,
  countryCode: null,
  role: "developer",
  ...p,
});

describe("originCountry", () => {
  it("개발사의 나라를 고른다 — 배급사가 앞에 있어도", () => {
    expect(
      originCountry([
        company({ slug: "sega-publisher", role: "publisher", countryCode: "JP", countryNameKo: "일본" }),
        company({ slug: "studio", role: "developer", countryCode: "KR", countryNameKo: "대한민국" }),
      ]),
    ).toEqual({ countryCode: "KR", countryNameKo: "대한민국" });
  });

  it("개발사에 나라가 없으면 배급사로 내려간다", () => {
    expect(
      originCountry([company({ role: "developer" }), company({ role: "publisher", countryCode: "US", countryNameKo: "미국" })]),
    ).toEqual({ countryCode: "US", countryNameKo: "미국" });
  });

  it("나라 이름이 위키데이터 내부 URL 이면 버린다 — 주소 문자열이 나라 이름 자리에 설 뻔했다", () => {
    expect(
      originCountry([
        company({ countryCode: "PL", countryNameKo: "http://www.wikidata.org/.well-known/genid/f813fb50" }),
        company({ role: "publisher", countryCode: "PL", countryNameKo: "폴란드" }),
      ]),
    ).toEqual({ countryCode: "PL", countryNameKo: "폴란드" });
  });

  it("쓸 수 있는 줄이 없으면 null — 국기 자리를 통째로 비운다", () => {
    expect(originCountry([])).toBeNull();
    expect(originCountry([company({ countryCode: "KR", countryNameKo: null })])).toBeNull();
    expect(originCountry([company({ countryCode: null, countryNameKo: "대한민국" })])).toBeNull();
  });
});
