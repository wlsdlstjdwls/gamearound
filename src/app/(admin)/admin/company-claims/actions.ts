"use server";
// 회사 관리 신청 심사 액션. 페이지가 막혀 있어도 액션은 주소로 직접 불릴 수 있어 여기서 다시 본다(§6).
import { revalidatePath } from "next/cache";
import { actionError } from "@/lib/db-errors";
import { COMPANY_CLAIM_ADMIN_MESSAGES as A, COMPANY_CLAIM_MESSAGES as C } from "@/lib/companies/messages";
import { companyClaimReviewSchema } from "@/lib/companies/schemas";
import { ROUTES, companyClaimPath } from "@/lib/routes";
import { reviewCompanyClaim } from "@/server/services/company-claims";
import { requireRole } from "@/server/services/users";

export type CompanyClaimReviewState = { ok: true; message: string } | { ok: false; error: string } | null;

export async function reviewCompanyClaimAction(_prev: CompanyClaimReviewState, formData: FormData): Promise<CompanyClaimReviewState> {
  try {
    const admin = await requireRole("admin");
    const parsed = companyClaimReviewSchema.safeParse({
      claimId: String(formData.get("claimId") ?? ""),
      decision: String(formData.get("decision") ?? ""),
      reason: String(formData.get("reason") ?? "").trim() || undefined,
    });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? C.badRequest };
    const slug = await reviewCompanyClaim(parsed.data, admin);
    revalidatePath(ROUTES.adminCompanyClaims);
    // 신청자가 보는 상태 화면도 같이 푼다
    revalidatePath(companyClaimPath(slug));
    return { ok: true, message: parsed.data.decision === "approve" ? A.approved : A.rejected };
  } catch (e) {
    return { ok: false, error: actionError(e, C.badRequest) };
  }
}
