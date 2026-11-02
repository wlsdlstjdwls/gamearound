// POST /api/admin/notify/media/upload — 알림 본문 이미지, 영상, 영상 첫 장면의 Blob 업로드 토큰(2026-11-02, Vercel Blob 클라이언트 업로드).
// 글 미디어(api/community/media/upload)와 같은 방식이다. 다른 점: 관리자만, 접두 notify/, 갈래마다 형식과 크기는 lib/notify/media 하나에 있다.
// 영상은 서버를 거치면 함수 본문 상한(4.5MB)에 걸려 브라우저가 Blob 으로 곧장 올린다 — 이 길이 그래서 토큰만 내준다.
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { NOTIFY_MESSAGES as M } from "@/lib/admin/messages";
import { errorMessage } from "@/lib/errors";
import { isNotifyMediaPath, NOTIFY_IMAGE_CONTENT_TYPES, NOTIFY_IMAGE_MAX_BYTES, NOTIFY_VIDEO_CONTENT_TYPES, NOTIFY_VIDEO_MAX_BYTES } from "@/lib/notify/media";
import { getCurrentUser } from "@/server/services/users";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({ kind: z.enum(["image", "video", "poster"]) });

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as HandleUploadBody;
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const parsed = payloadSchema.safeParse(JSON.parse(clientPayload ?? "null"));
        if (!parsed.success || !isNotifyMediaPath(pathname)) throw new Error(M.uploadForbidden);
        const user = await getCurrentUser();
        if (user?.role !== "admin") throw new Error(M.uploadForbidden);
        const video = parsed.data.kind === "video";
        return {
          allowedContentTypes: video ? [...NOTIFY_VIDEO_CONTENT_TYPES] : [...NOTIFY_IMAGE_CONTENT_TYPES],
          maximumSizeInBytes: video ? NOTIFY_VIDEO_MAX_BYTES : NOTIFY_IMAGE_MAX_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}
