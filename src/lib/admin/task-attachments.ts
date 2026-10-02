// 할 일 첨부의 규칙 — 받는 형식, 크기, 저장 경로, 업로드 요청 꼴. 서버(토큰 발급, 등록)와 화면이 같이 쓴다.
// 순수 함수라 테스트로 고정한다(task-attachments.test.ts).
//
// 형식을 **확장자로** 정한다. 브라우저가 주는 file.type 은 믿을 수 없다 — 윈도 크롬은 zip 을
// application/x-zip-compressed 로, .log 는 빈 문자열로 준다. 확장자에서 형식을 정해 업로드에 박아 보내면
// 저장소에 적히는 형식이 늘 이 표의 값 중 하나가 되고, 서버의 허용 목록도 이 표 하나로 끝난다.
//
// 경로에 할 일 id 를 박는 이유는 매장 사진과 같다(lib/shops/photo): 업로드는 브라우저가 Blob 으로 곧장 보내서
// 서버가 확인할 수 있는 건 토큰 받을 때의 경로와 등록할 때의 경로뿐이다. 둘 다 이 접두 아래여야 한다.
import { z } from "zod";

/** 받는 확장자와 저장 형식. 사용자가 고른 범위다(2026-10-02): 이미지, PDF, 글 파일(로그 포함), 압축 */
export const ATTACHMENT_TYPES = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
  txt: "text/plain",
  log: "text/plain",
  csv: "text/csv",
  json: "application/json",
  zip: "application/zip",
} as const satisfies Record<string, string>;

export type AttachmentExt = keyof typeof ATTACHMENT_TYPES;

/** 저장소 토큰이 허락하는 형식(중복을 걷은 값). 토큰 발급과 등록 확인이 같이 쓴다 */
export const ATTACHMENT_CONTENT_TYPES: readonly string[] = [...new Set(Object.values(ATTACHMENT_TYPES))];

/** 파일 고르기 창의 accept. 확장자로 건다 — 형식으로 걸면 .log 처럼 형식이 비는 파일이 창에서 안 보인다 */
export const ATTACHMENT_ACCEPT = Object.keys(ATTACHMENT_TYPES)
  .map((e) => `.${e}`)
  .join(",");

/**
 * 한 파일의 최대 크기. 사용자가 고른 값(2026-10-02). 화면 갈무리, 로그, 기획 PDF 가 다 들어가고,
 * 영상처럼 판에 둘 까닭이 없는 것은 걸러지는 선이다. 업로드는 Blob 으로 곧장 가서 함수 본문 한도(4.5MB)와 무관하다.
 */
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

/**
 * 할 일 하나(본문과 기록을 합쳐)에 붙는 파일 수 상한. 판 질의가 첨부까지 한 번에 읽으므로 한 장이 끝없이 늘면
 * 판 전체가 무거워진다. 서른이면 한 일의 갈무리와 로그를 다 담고도 남는다.
 */
export const ATTACHMENT_MAX_PER_TASK = 30;

/** 파일 이름 상한. 저장 경로에는 안 쓰고 화면에만 쓴다 */
export const ATTACHMENT_NAME_MAX = 200;

/** 확장자 → 저장 형식. 받지 않는 확장자면 null */
export function attachmentType(fileName: string): { ext: AttachmentExt; contentType: string } | null {
  const dot = fileName.lastIndexOf(".");
  if (dot < 0) return null;
  const ext = fileName.slice(dot + 1).toLowerCase();
  if (!Object.hasOwn(ATTACHMENT_TYPES, ext)) return null;
  return { ext: ext as AttachmentExt, contentType: ATTACHMENT_TYPES[ext as AttachmentExt] };
}

export function isImageType(contentType: string): boolean {
  return contentType.startsWith("image/");
}

export function attachmentPathPrefix(taskId: string): string {
  return `admin/tasks/${taskId}/`;
}

/** 경로가 이 할 일 아래인가. `..` 로 접두를 빠져나가는 꼴도 막는다 */
export function isOwnAttachmentPath(pathname: string, taskId: string): boolean {
  const prefix = attachmentPathPrefix(taskId);
  if (!pathname.startsWith(prefix)) return false;
  const rest = pathname.slice(prefix.length);
  return rest.length > 0 && !rest.includes("/") && !rest.includes("..");
}

/** 바이트 → "820 KB", "3.4 MB". 첨부 상한이 10MB 라 GB 는 안 센다 */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${Number((n / (1024 * 1024)).toFixed(1))} MB`;
}

/** 업로드 토큰을 받을 때 브라우저가 싣는 값 */
export const attachmentUploadPayloadSchema = z.object({ taskId: z.uuid() });

/** 올린 뒤 등록할 때 싣는 값. 크기와 형식은 서버가 저장소에 물어 적는다 — 브라우저 말을 믿지 않는다 */
export const attachmentRegisterSchema = z.object({
  taskId: z.uuid(),
  noteId: z.uuid().nullable(),
  url: z.url(),
  pathname: z.string().min(1).max(300),
  name: z.string().trim().min(1).max(ATTACHMENT_NAME_MAX),
});

export type AttachmentRegisterInput = z.infer<typeof attachmentRegisterSchema>;
