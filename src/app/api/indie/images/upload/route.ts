// POST /api/indie/images/upload — 인디 홍보 글 그림의 Blob 업로드 토큰을 내준다(Vercel Blob 클라이언트 업로드).
//
// 매장 사진(api/shops/photos/upload)과 같은 방식이다: 파일은 여기로 안 오고, 이 경로는 토큰을 줄 사람인가만 가린다 —
// 로그인, 글 주인(관리자는 통과), 경로 접두, 장수 상한. 완료 콜백은 안 쓰고 브라우저가 올린 뒤 액션으로 등록한다.
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { errorMessage } from "@/lib/errors";
import { PHOTO_CONTENT_TYPES, PHOTO_MAX_BYTES } from "@/lib/shops/constants";
import { INDIE_IMAGE_MAX } from "@/lib/indie/constants";
import { INDIE_FORM_MESSAGES as M } from "@/lib/indie/messages";
import { indieImageUploadPayloadSchema, isOwnIndieImagePath } from "@/lib/indie/schemas";
import { canUploadIndieImage } from "@/server/services/indie";
import { getCurrentUser } from "@/server/services/users";

export const dynamic = "force-dynamic";

async function authorize(pathname: string, clientPayload: string | null): Promise<void> {
  const parsed = indieImageUploadPayloadSchema.safeParse(JSON.parse(clientPayload ?? "null"));
  if (!parsed.success) throw new Error(M.forbidden);
  const user = await getCurrentUser();
  if (!user) throw new Error(M.forbidden);
  const { postId } = parsed.data;
  if (!isOwnIndieImagePath(pathname, postId)) throw new Error(M.forbidden);
  if (!(await canUploadIndieImage(postId, { userId: user.id, isAdmin: user.role === "admin" }))) {
    throw new Error(M.imageFull(INDIE_IMAGE_MAX));
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as HandleUploadBody;
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        await authorize(pathname, clientPayload);
        return {
          allowedContentTypes: [...PHOTO_CONTENT_TYPES],
          maximumSizeInBytes: PHOTO_MAX_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}
