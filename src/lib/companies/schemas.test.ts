// 회사 관리 신청, 고치기, 심사 검증 규칙
import { describe, expect, it } from "vitest";
import { companyClaimReviewSchema, companyClaimSchema, companyLogoPrefix, companyManageSchema } from "./schemas";
import { countryNameKo, isCompanyCountryCode } from "./countries";

describe("companyClaimSchema", () => {
  it("빈 선택 칸은 null 로", () => {
    const r = companyClaimSchema.parse({ contactName: " 홍길동 ", contactTitle: "", contactEmail: "pr@studio.com", evidenceUrl: "", note: "" });
    expect(r).toEqual({ contactName: "홍길동", contactTitle: null, contactEmail: "pr@studio.com", evidenceUrl: null, note: null });
  });

  it("메일과 주소 꼴을 본다", () => {
    expect(companyClaimSchema.safeParse({ contactName: "a", contactTitle: "", contactEmail: "nope", evidenceUrl: "", note: "" }).success).toBe(false);
    expect(companyClaimSchema.safeParse({ contactName: "a", contactTitle: "", contactEmail: "a@b.co", evidenceUrl: "javascript:alert(1)", note: "" }).success).toBe(false);
  });

  it("이름은 필수", () => {
    expect(companyClaimSchema.safeParse({ contactName: "  ", contactTitle: "", contactEmail: "a@b.co", evidenceUrl: "", note: "" }).success).toBe(false);
  });
});

describe("companyManageSchema", () => {
  const schema = companyManageSchema(2026);
  const base = { nameKo: "", description: "", websiteUrl: "", countryCode: "", foundedYear: "", logoUrl: "" };

  it("빈 칸은 null, 연도는 숫자로", () => {
    expect(schema.parse({ ...base, foundedYear: "2015", countryCode: "KR" })).toEqual({ nameKo: null, description: null, websiteUrl: null, countryCode: "KR", foundedYear: 2015, logoUrl: null });
  });

  it("미래 연도와 목록 밖 나라는 막는다", () => {
    expect(schema.safeParse({ ...base, foundedYear: "2030" }).success).toBe(false);
    expect(schema.safeParse({ ...base, countryCode: "XX" }).success).toBe(false);
  });
});

describe("companyClaimReviewSchema", () => {
  const id = "00000000-0000-4000-8000-000000000000";
  it("반려는 사유가 있어야 한다", () => {
    expect(companyClaimReviewSchema.safeParse({ claimId: id, decision: "reject" }).success).toBe(false);
    expect(companyClaimReviewSchema.safeParse({ claimId: id, decision: "reject", reason: "증빙 없음" }).success).toBe(true);
    expect(companyClaimReviewSchema.safeParse({ claimId: id, decision: "approve" }).success).toBe(true);
  });
});

describe("countries", () => {
  it("한국어 이름, 짧은 홍콩", () => {
    expect(countryNameKo("KR")).toBe("대한민국");
    expect(countryNameKo("HK")).toBe("홍콩");
    expect(isCompanyCountryCode("JP")).toBe(true);
    expect(isCompanyCountryCode("ZZ")).toBe(false);
  });

  it("로고 경로 접두에 회사 id 가 박힌다", () => {
    expect(companyLogoPrefix("abc")).toBe("companies/abc/logo-");
  });
});
