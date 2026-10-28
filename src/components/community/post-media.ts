// 글 본문 그림, 첨부파일 올리기 — 글쓰기 에디터(rich-editor)와 첨부 칸(post-attachments)이 같이 쓴다. 브라우저 전용.
//
// 길은 인디 그림(components/indie/upload-images)과 같다: 그림은 브라우저가 줄여(resizePhoto) Blob 으로 곧장 보낸다.
// 등록 액션이 없다 — 올린 주소가 본문 HTML 에 그대로 들어간다(lib/community/media 머리 주석).
// 저장소 경로에는 원래 파일 이름을 쓰지 않는다: 한글, 띄어쓰기, 사람 이름이 공개 주소에 박힌다. 이름은 본문 링크 글자에만 남긴다.
import { upload } from "@vercel/blob/client";
import { formatFileSize, POST_FILE_MAX_BYTES, POST_FILE_NAME_MAX, POST_MEDIA_PREFIX, postFileType } from "@/lib/community/media";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import { POST_MEDIA_UPLOAD_PATH } from "@/lib/routes";
import { resizePhoto } from "@/lib/shops/photo-resize";

export type UploadedImage = { url: string; width: number; height: number };
export type UploadedFile = { url: string; name: string; size: number };

/** 실패하면 화면에 그대로 띄울 문장을 담아 던진다 */
export async function uploadPostImage(file: File): Promise<UploadedImage> {
  const photo = await resizePhoto(file).catch(() => {
    throw new Error(M.imageUnreadable);
  });
  const blob = await upload(`${POST_MEDIA_PREFIX}image.${photo.ext}`, photo.blob, {
    access: "public",
    handleUploadUrl: POST_MEDIA_UPLOAD_PATH,
    clientPayload: JSON.stringify({ kind: "image" }),
    contentType: photo.blob.type,
  }).catch(() => {
    throw new Error(M.uploadFailed);
  });
  return { url: blob.url, width: photo.width, height: photo.height };
}

export async function uploadPostFile(file: File): Promise<UploadedFile> {
  const type = postFileType(file.name);
  if (!type) throw new Error(M.uploadType);
  if (file.size > POST_FILE_MAX_BYTES) throw new Error(M.uploadTooBig(formatFileSize(POST_FILE_MAX_BYTES)));
  const blob = await upload(`${POST_MEDIA_PREFIX}file.${type.ext}`, file, {
    access: "public",
    handleUploadUrl: POST_MEDIA_UPLOAD_PATH,
    clientPayload: JSON.stringify({ kind: "file" }),
    contentType: type.contentType,
  }).catch(() => {
    throw new Error(M.uploadFailed);
  });
  return { url: blob.url, name: file.name.slice(0, POST_FILE_NAME_MAX), size: file.size };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

/**
 * 첨부 목록을 본문 끝에 붙일 HTML 로. 표를 따로 두지 않고 본문 안의 표시된 묶음(data-attachments)으로 싣는다 —
 * 거르기(lib/community/sanitize)가 이 속성만 남기고, 글 화면 CSS(.post-body)가 파일 카드로 그린다.
 */
export function attachmentsHtml(files: UploadedFile[]): string {
  if (files.length === 0) return "";
  const items = files.map((f) => `<a href="${escapeHtml(f.url)}" data-file="" data-size="${escapeHtml(formatFileSize(f.size))}">${escapeHtml(f.name)}</a>`).join("");
  return `<div data-attachments="">${items}</div>`;
}
