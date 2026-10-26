// POST /api/me/avatar/upload — 프로필 사진 Blob 업로드 토큰(Vercel Blob 클라이언트 업로드, 인디 그림과 같은 방식).
// 파일은 여기로 안 온다. 이 경로는 로그인과 경로 접두(avatars/<내 ID>/)만 가린다. 올린 뒤 액션이 주소를 적는다.
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { errorMessage } from "@/lib/errors";
import { AVATAR_CONTENT_TYPES, AVATAR_MAX_BYTES, avatarPrefix, ME_MESSAGES as M } from "@/lib/me/constants";
import { getCurrentUser } from "@/server/services/users";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as HandleUploadBody;
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const user = await getCurrentUser();
        if (!user || !pathname.startsWith(avatarPrefix(user.id)) || pathname.slice(avatarPrefix(user.id).length).includes("/")) throw new Error(M.avatarFailed);
        return { allowedContentTypes: [...AVATAR_CONTENT_TYPES], maximumSizeInBytes: AVATAR_MAX_BYTES, addRandomSuffix: true };
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}
