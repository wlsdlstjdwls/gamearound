// 입점 신청 검증 규칙 — 서버 액션과 폼이 **같은 스키마 하나**를 본다(AGENTS §2).
// 규칙이 두 벌이 되면 브라우저에서 통과한 값이 서버에서 막히고, 그 차이를 사람이 화면에서 읽을 수 없다.
import { z } from "zod";
import { RESERVED_SHOP_SLUGS } from "@/lib/routes";
import { SHOP_MESSAGES } from "./messages";

export const SHOP_NAME_MIN = 2;
export const SHOP_NAME_MAX = 40;
/** 공개 주소로 쓰는 값이라 길면 링크가 읽히지 않는다. 짧으면 겹치기 쉬워 하한도 둔다 */
export const SHOP_SLUG_MIN = 3;
export const SHOP_SLUG_MAX = 30;
export const SHOP_DESCRIPTION_MAX = 300;
export const SHOP_ADDRESS_MAX = 120;
/** 반려, 정지 사유. 매장주 화면에 그대로 뜨는 글이라 한 문단을 넘기지 않는다 */
export const SHOP_REASON_MAX = 200;

/** 사업자등록번호 10자리. 하이픈은 받아서 지운다 — 사람은 적힌 대로 옮겨 적는다 */
const BIZ_REG_NO_DIGITS = 10;

export function normalizeBizRegNo(raw: string): string {
  return raw.replace(/[^0-9]/g, "");
}

/** 전화번호도 모양을 고르지 않는다. 숫자만 남겨 길이만 본다 */
export function normalizePhone(raw: string): string {
  return raw.replace(/[^0-9]/g, "");
}

const slugField = z
  .string()
  .trim()
  .toLowerCase()
  .min(SHOP_SLUG_MIN, SHOP_MESSAGES.slugTooShort)
  .max(SHOP_SLUG_MAX, SHOP_MESSAGES.slugTooLong)
  .regex(/^[a-z0-9-]+$/, SHOP_MESSAGES.slugCharset)
  .refine((v) => !v.startsWith("-") && !v.endsWith("-"), SHOP_MESSAGES.slugCharset)
  .refine((v) => !(RESERVED_SHOP_SLUGS as readonly string[]).includes(v), SHOP_MESSAGES.slugReserved);

/**
 * 입점 신청서.
 *
 * 개인 판매자(`personal`)를 지금 막지 않고 스키마에서 갈라 두는 이유: 중고거래를 켜는 날 하는 일이
 * "`shopType = 'personal'` 행을 허용하는 것뿐" 이어야 한다(설계서 §3). 필수 항목만 갈린다 —
 * 사업자 매장은 사업자번호와 주소가 있어야 하고, 개인은 둘 다 없다.
 */
export const shopApplicationSchema = z
  .object({
    shopType: z.enum(["business", "personal"]),
    name: z.string().trim().min(SHOP_NAME_MIN, SHOP_MESSAGES.nameTooShort).max(SHOP_NAME_MAX, SHOP_MESSAGES.nameTooLong),
    slug: slugField,
    bizRegNo: z.string().trim().optional(),
    addressType: z.enum(["offline", "online_only", "none"]),
    address: z.string().trim().max(SHOP_ADDRESS_MAX).optional(),
    addressDetail: z.string().trim().max(SHOP_ADDRESS_MAX).optional(),
    phone: z.string().trim().optional(),
    description: z.string().trim().max(SHOP_DESCRIPTION_MAX, SHOP_MESSAGES.descriptionTooLong).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.shopType === "business") {
      if (normalizeBizRegNo(v.bizRegNo ?? "").length !== BIZ_REG_NO_DIGITS) {
        ctx.addIssue({ code: "custom", path: ["bizRegNo"], message: SHOP_MESSAGES.bizRegNoInvalid });
      }
    }
    // 오프라인 매장은 주소가 곧 상품이다 — 손님이 찾아가는 곳이라 비워 두면 화면에 낼 것이 없다
    if (v.addressType === "offline" && !v.address) {
      ctx.addIssue({ code: "custom", path: ["address"], message: SHOP_MESSAGES.addressRequired });
    }
    const phone = normalizePhone(v.phone ?? "");
    if (phone.length > 0 && (phone.length < 9 || phone.length > 11)) {
      ctx.addIssue({ code: "custom", path: ["phone"], message: SHOP_MESSAGES.phoneInvalid });
    }
  });

export type ShopApplicationInput = z.infer<typeof shopApplicationSchema>;

/** 심사 결정. 반려와 정지는 사유가 있어야 한다 — 이유 없는 반려는 재신청할 방법이 없다 */
export const shopReviewSchema = z
  .object({
    shopId: z.uuid(SHOP_MESSAGES.badRequest),
    decision: z.enum(["approve", "reject", "suspend", "reactivate"]),
    reason: z.string().trim().max(SHOP_REASON_MAX).optional(),
  })
  .superRefine((v, ctx) => {
    if ((v.decision === "reject" || v.decision === "suspend") && !v.reason) {
      ctx.addIssue({ code: "custom", path: ["reason"], message: SHOP_MESSAGES.reasonRequired });
    }
  });

export type ShopReviewInput = z.infer<typeof shopReviewSchema>;
