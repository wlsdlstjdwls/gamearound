// 알림 본문 이미지, 영상 올리기 — 브라우저 전용(2026-11-02). 본문 칸(body-field)의 이미지, 영상 단추가 부른다.
//
// 이미지는 브라우저가 줄여 jpeg 로 굽고(resizePhoto jpegOnly, 메일과 텔레그램이 webp 를 못 받는 곳이 있다) Blob 으로 곧장 보낸다.
// 영상은 줄이지 않는다(브라우저에서 다시 인코딩할 길이 없다) — 형식과 크기만 보고, 첫 장면을 그림으로 떠서 같이 올린다.
// 첫 장면은 메일이 영상 대신 보여 줄 그림이다(lib/notify/media). 뜨지 못하면 그림 없이 링크만 선다.
// 저장소 경로에 원래 파일 이름을 쓰지 않는다(글 미디어 post-media 와 같은 이유).
import { upload } from "@vercel/blob/client";
import { NOTIFY_MESSAGES as M } from "@/lib/admin/messages";
import { formatFileSize } from "@/lib/community/media";
import { NOTIFY_MEDIA_PREFIX, NOTIFY_VIDEO_CONTENT_TYPES, NOTIFY_VIDEO_MAX_BYTES, type NotifyMediaKind } from "@/lib/notify/media";
import { NOTIFY_MEDIA_UPLOAD_PATH } from "@/lib/routes";
import { resizePhoto } from "@/lib/shops/photo-resize";

/** 첫 장면을 뜰 때 기다리는 시간. 큰 영상이 앞부분을 못 읽으면 그림 없이 간다 */
const POSTER_TIMEOUT_MS = 8000;
/** 첫 장면 시각(초). 0 초는 검은 화면인 영상이 많다 */
const POSTER_AT_SEC = 0.5;
/** 첫 장면 jpeg 품질 */
const POSTER_QUALITY = 0.85;

async function put(name: string, blob: Blob, kind: NotifyMediaKind, contentType: string): Promise<string> {
  const res = await upload(`${NOTIFY_MEDIA_PREFIX}${name}`, blob, {
    access: "public",
    handleUploadUrl: NOTIFY_MEDIA_UPLOAD_PATH,
    clientPayload: JSON.stringify({ kind }),
    contentType,
  }).catch(() => {
    throw new Error(M.uploadFailed);
  });
  return res.url;
}

/** 이미지 한 장 → 공개 주소. 실패하면 화면에 띄울 문장을 담아 던진다 */
export async function uploadNotifyImage(file: File): Promise<string> {
  const photo = await resizePhoto(file, { jpegOnly: true }).catch(() => {
    throw new Error(M.imageUnreadable);
  });
  return put("image.jpg", photo.blob, "image", "image/jpeg");
}

/** 영상 첫 장면을 jpeg 로. 못 뜨면 null */
function capturePoster(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let done = false;
    const finish = (b: Blob | null) => {
      if (done) return;
      done = true;
      URL.revokeObjectURL(url);
      resolve(b);
    };
    const timer = window.setTimeout(() => finish(null), POSTER_TIMEOUT_MS);
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(POSTER_AT_SEC, Math.max(video.duration / 2, 0));
    };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx || canvas.width === 0) return finish(null);
      ctx.drawImage(video, 0, 0);
      canvas.toBlob((b) => {
        window.clearTimeout(timer);
        finish(b);
      }, "image/jpeg", POSTER_QUALITY);
    };
    video.onerror = () => finish(null);
    video.src = url;
  });
}

/** 영상 하나 → 영상 주소와 첫 장면 주소 */
export async function uploadNotifyVideo(file: File): Promise<{ src: string; poster: string | null }> {
  if (!(NOTIFY_VIDEO_CONTENT_TYPES as readonly string[]).includes(file.type)) throw new Error(M.videoType);
  if (file.size > NOTIFY_VIDEO_MAX_BYTES) throw new Error(M.tooBig(formatFileSize(NOTIFY_VIDEO_MAX_BYTES)));
  const [src, posterBlob] = await Promise.all([put("video.mp4", file, "video", file.type), capturePoster(file)]);
  const poster = posterBlob ? await put("poster.jpg", posterBlob, "poster", "image/jpeg").catch(() => null) : null;
  return { src, poster };
}
