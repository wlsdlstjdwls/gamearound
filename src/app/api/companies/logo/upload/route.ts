// POST /api/companies/logo/upload — 회사 로고 Blob 업로드 토큰(프로필 사진과 같은 클라이언트 업로드 방식).
// 파일은 여기로 안 온다. 이 경로는 회사 관리 권한과 경로 접두(companies/<회사 id>/logo-)만 가린다. 주소는 저장 액션이 적는다.
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { errorMessage } from "@/lib/errors";
import { AVATAR_CONTENT_TYPES, AVATAR_MAX_BYTES } from "@/lib/me/constants";
import { COMPANY_MANAGE_MESSAGES as G } from "@/lib/companies/messages";
import { companyLogoPrefix } from "@/lib/companies/schemas";
import { canManageCompany } from "@/server/services/company-claims";
import { getCurrentUser } from "@/server/services/users";

export const dynamic = "force-dynamic";

/** 경로의 회사 id 자리. 접두 뒤에는 파일 이름만 와야 한다(하위 폴더 금지) */
const LOGO_PATH = /^companies\/([0-9a-f-]{36})\/logo-[^/]+$/;

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as HandleUploadBody;
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const user = await getCurrentUser();
        const companyId = LOGO_PATH.exec(pathname)?.[1];
        if (!user || !companyId || !pathname.startsWith(companyLogoPrefix(companyId)) || !(await canManageCompany(companyId, user))) throw new Error(G.logoFailed);
        // 프로필 사진과 같은 형식, 크기 한도 — 같은 줄이기(resizePhoto)를 거친다
        return { allowedContentTypes: [...AVATAR_CONTENT_TYPES], maximumSizeInBytes: AVATAR_MAX_BYTES, addRandomSuffix: true };
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}
