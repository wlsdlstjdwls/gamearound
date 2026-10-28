// POST /api/community/media/upload — 글 본문 그림, 첨부파일의 Blob 업로드 토큰을 내준다(Vercel Blob 클라이언트 업로드).
//
// 인디 그림(api/indie/images/upload)과 같은 방식이다. 다른 점: 글이 아직 없을 때 올리므로 글 주인을 볼 수 없다 —
// 로그인, 경로 접두, 갈래(그림/파일)마다의 형식과 크기만 가린다. 규칙은 lib/community/media 하나에 있다.
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { errorMessage } from "@/lib/errors";
import { isPostMediaPath, POST_FILE_CONTENT_TYPES, POST_FILE_MAX_BYTES, POST_IMAGE_CONTENT_TYPES, POST_IMAGE_MAX_BYTES } from "@/lib/community/media";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import { getCurrentUser } from "@/server/services/users";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({ kind: z.enum(["image", "file"]) });

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as HandleUploadBody;
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const parsed = payloadSchema.safeParse(JSON.parse(clientPayload ?? "null"));
        if (!parsed.success || !isPostMediaPath(pathname)) throw new Error(M.uploadForbidden);
        const user = await getCurrentUser();
        if (!user) throw new Error(M.uploadForbidden);
        const image = parsed.data.kind === "image";
        return {
          allowedContentTypes: image ? [...POST_IMAGE_CONTENT_TYPES] : [...POST_FILE_CONTENT_TYPES],
          maximumSizeInBytes: image ? POST_IMAGE_MAX_BYTES : POST_FILE_MAX_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}
