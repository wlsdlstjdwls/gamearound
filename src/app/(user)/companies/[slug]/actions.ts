"use server";
// 회사 페이지 관리 신청, 취소, 회사 정보 저장 액션. 레이아웃이 로그인을 보지만 액션은 주소로 직접 불릴 수 있어 다시 본다(§6).
import { revalidatePath, updateTag } from "next/cache";
import { actionError } from "@/lib/db-errors";
import { COMPANY_CLAIM_MESSAGES as C, COMPANY_MANAGE_MESSAGES as G } from "@/lib/companies/messages";
import { companyClaimSchema, companyManageSchema } from "@/lib/companies/schemas";
import { companyClaimPath, companyPath } from "@/lib/routes";
import { applyCompanyClaim, findCompanyBrief, updateCompanyByManager, withdrawCompanyClaim } from "@/server/services/company-claims";
import { requireUser } from "@/server/services/users";

export type CompanyFormState = { ok: true; message: string } | { ok: false; error: string } | null;

const text = (fd: FormData, name: string) => String(fd.get(name) ?? "");

export async function applyCompanyClaimAction(_prev: CompanyFormState, formData: FormData): Promise<CompanyFormState> {
  try {
    const user = await requireUser();
    const company = await findCompanyBrief(text(formData, "slug"));
    if (!company) return { ok: false, error: C.companyNotFound };
    const parsed = companyClaimSchema.safeParse({
      contactName: text(formData, "contactName"),
      contactTitle: text(formData, "contactTitle"),
      contactEmail: text(formData, "contactEmail"),
      evidenceUrl: text(formData, "evidenceUrl"),
      note: text(formData, "note"),
    });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? C.badRequest };
    await applyCompanyClaim(company, user, parsed.data);
    revalidatePath(companyClaimPath(company.slug));
    return { ok: true, message: C.applied };
  } catch (e) {
    return { ok: false, error: actionError(e, C.badRequest) };
  }
}

export async function withdrawCompanyClaimAction(slug: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireUser();
    const company = await findCompanyBrief(slug);
    if (!company) return { ok: false, error: C.companyNotFound };
    await withdrawCompanyClaim(company.id, user);
    revalidatePath(companyClaimPath(slug));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: actionError(e, C.badRequest) };
  }
}

export async function saveCompanyAction(_prev: CompanyFormState, formData: FormData): Promise<CompanyFormState> {
  try {
    const user = await requireUser();
    const slug = text(formData, "slug");
    const parsed = companyManageSchema(new Date().getFullYear()).safeParse({
      nameKo: text(formData, "nameKo"),
      description: text(formData, "description"),
      websiteUrl: text(formData, "websiteUrl"),
      countryCode: text(formData, "countryCode"),
      foundedYear: text(formData, "foundedYear"),
      logoUrl: text(formData, "logoUrl"),
    });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? C.badRequest };
    await updateCompanyByManager(slug, user, parsed.data);
    // 저장 직후 회사 화면이 옛 값을 내지 않게 updateTag(revalidateTag "max" 는 첫 요청이 옛 값이다)
    updateTag(`company:${slug}`);
    revalidatePath(companyPath(slug));
    return { ok: true, message: G.saved };
  } catch (e) {
    return { ok: false, error: actionError(e, C.badRequest) };
  }
}
