// 인디 글 그림 올리기 한 벌 — 고치기 화면의 그림 칸(image-manager)과 새 글 폼(post-form)이 같이 쓴다.
//
// 길은 매장 사진과 같다(components/shops/listing-photos 주석): 브라우저가 줄이고(resizePhoto) → 토큰을 받아 Blob 으로
// 곧장 올리고 → 액션으로 적는다. 여러 장은 한 장씩 차례로 — 한꺼번에 보내면 장수 상한 셈이 전부 "아직 비었다" 로 읽힌다.
// 새 글 폼은 글을 저장해 id 를 받은 뒤에 이걸 부른다 — Blob 경로에 글 id 가 박혀야 한다(lib/indie/schemas 주석).
import { upload } from "@vercel/blob/client";
import { registerIndieImageAction } from "@/app/(user)/indie/actions";
import { INDIE_IMAGE_UPLOAD_PATH } from "@/lib/routes";
import { INDIE_FORM_MESSAGES as M } from "@/lib/indie/messages";
import { indieImagePrefix } from "@/lib/indie/schemas";
import { resizePhoto } from "@/lib/shops/photo-resize";

/** 고른 순서대로 올린다. 한 장이라도 실패하면 거기서 멈추고 사유를 돌려준다. 다 올리면 null */
export async function uploadIndieImages(postId: string, files: File[], onProgress?: (done: number, total: number) => void): Promise<string | null> {
  for (let i = 0; i < files.length; i++) {
    onProgress?.(i, files.length);
    try {
      const photo = await resizePhoto(files[i]).catch(() => {
        throw new Error(M.imageUnreadable);
      });
      const blob = await upload(`${indieImagePrefix(postId)}image.${photo.ext}`, photo.blob, {
        access: "public",
        handleUploadUrl: INDIE_IMAGE_UPLOAD_PATH,
        clientPayload: JSON.stringify({ postId }),
        contentType: photo.blob.type,
      });
      const r = await registerIndieImageAction({ postId, url: blob.url, pathname: blob.pathname, width: photo.width, height: photo.height });
      if (!r.ok) throw new Error(r.error);
    } catch (e) {
      return e instanceof Error && e.message ? e.message : M.imageFailed;
    }
  }
  return null;
}
