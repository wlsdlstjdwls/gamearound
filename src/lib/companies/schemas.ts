// 회사 관리 신청, 회사 정보 고치기, 심사의 검증 규칙 — 서버 액션과 폼이 같이 쓴다(AGENTS §2).
import { z } from "zod";
import { COMPANY_CLAIM_ADMIN_MESSAGES as A, COMPANY_CLAIM_MESSAGES as C, COMPANY_MANAGE_MESSAGES as G } from "./messages";
import { isCompanyCountryCode } from "./countries";

export const CLAIM_NAME_MAX = 40;
export const CLAIM_TITLE_MAX = 40;
export const CLAIM_EMAIL_MAX = 120;
export const CLAIM_URL_MAX = 300;
export const CLAIM_NOTE_MAX = 500;
export const CLAIM_REASON_MAX = 300;
export const COMPANY_NAME_KO_MAX = 60;
/** 회사 화면 소개 칸이 넓은 화면에서 네다섯 줄로 끝나는 길이 */
export const COMPANY_DESCRIPTION_MAX = 600;
/** 설립 연도로 받을 범위. 닌텐도가 1889년이다 */
export const FOUNDED_YEAR_MIN = 1850;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, C.tooLong)
    .transform((v) => v || null);

/** http(s) 주소만. 빈 값은 null */
export const optionalUrl = z
  .string()
  .trim()
  .max(CLAIM_URL_MAX, C.tooLong)
  .refine((v) => v === "" || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(v), C.urlInvalid)
  .transform((v) => v || null);

export const companyClaimSchema = z.object({
  contactName: z.string().trim().min(1, C.nameRequired).max(CLAIM_NAME_MAX, C.tooLong),
  contactTitle: optionalText(CLAIM_TITLE_MAX),
  contactEmail: z.string().trim().max(CLAIM_EMAIL_MAX, C.tooLong).pipe(z.email({ message: C.emailInvalid })),
  evidenceUrl: optionalUrl,
  note: optionalText(CLAIM_NOTE_MAX),
});
export type CompanyClaimInput = z.infer<typeof companyClaimSchema>;

export function companyManageSchema(thisYear: number) {
  return z.object({
    nameKo: optionalText(COMPANY_NAME_KO_MAX),
    description: optionalText(COMPANY_DESCRIPTION_MAX),
    websiteUrl: optionalUrl,
    countryCode: z
      .string()
      .trim()
      .refine((v) => v === "" || isCompanyCountryCode(v), G.countryInvalid)
      .transform((v) => v || null),
    foundedYear: z
      .string()
      .trim()
      .refine((v) => v === "" || (/^\d{4}$/.test(v) && Number(v) >= FOUNDED_YEAR_MIN && Number(v) <= thisYear), G.yearInvalid)
      .transform((v) => (v ? Number(v) : null)),
    logoUrl: optionalUrl,
  });
}
export type CompanyManageInput = z.infer<ReturnType<typeof companyManageSchema>>;

/** 심사. 반려는 사유가 있어야 한다 — 이유 없는 반려는 고쳐 다시 낼 방법이 없다 */
export const companyClaimReviewSchema = z
  .object({
    claimId: z.uuid(C.badRequest),
    decision: z.enum(["approve", "reject"]),
    reason: z.string().trim().max(CLAIM_REASON_MAX).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.decision === "reject" && !v.reason) ctx.addIssue({ code: "custom", path: ["reason"], message: A.reasonRequired });
  });
export type CompanyClaimReviewInput = z.infer<typeof companyClaimReviewSchema>;

/** 로고 Blob 경로 접두. 회사 id 를 박아 남의 회사 경로로 토큰을 받는 길을 막는다 */
export function companyLogoPrefix(companyId: string): string {
  return `companies/${companyId}/logo-`;
}
