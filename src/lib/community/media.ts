// 글 본문 그림과 첨부파일의 규칙 — 받는 형식, 크기, 저장 경로. 업로드 토큰 경로(api/community/media/upload)와 글쓰기 에디터가 같이 쓴다.
//
// 길은 인디 그림, 할 일 첨부와 같다: 브라우저가 Blob 으로 곧장 올리고(함수 본문 한도 4.5MB 와 무관) 서버는 토큰만 내준다.
// 다른 점은 등록 액션이 없다는 것 — 글이 아직 없을 때 올리므로 경로에 글 id 를 박을 수 없고, 올린 주소는 본문 HTML 안에 들어간다.
// 그래서 표를 새로 만들지 않았다(마이그레이션 없음). 대가: 쓰다 만 글의 파일은 저장소에 남는다 — `vercel blob list` 의 posts/ 접두로 치운다.
//
// 형식은 확장자로 정한다(lib/admin/task-attachments 와 같은 이유: 브라우저의 file.type 은 zip, log 에서 제멋대로다).

/** 본문 그림. 브라우저가 줄여서(lib/shops/photo-resize) webp 나 jpg 로 굽는다 — 저장소에는 이 둘만 간다 */
export const POST_IMAGE_EXTS = ["png", "jpg", "jpeg", "webp", "gif"] as const;
export const POST_IMAGE_CONTENT_TYPES = ["image/webp", "image/jpeg"] as const;
export const POST_IMAGE_ACCEPT = POST_IMAGE_EXTS.map((e) => `.${e}`).join(",");
/** 줄인 뒤 한 장의 상한. 긴 변 1600px webp 는 1MB 를 거의 안 넘는다 — 넘으면 줄이기가 실패한 것이다 */
export const POST_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
/** 글 하나의 그림 수. 공략 글이 화면 갈무리를 단계마다 붙여도 남는 수다 */
export const POST_IMAGE_MAX = 20;

/**
 * 첨부파일. 게시판에 오갈 법한 것만 받는다 — 공략 PDF, 세이브나 설정 파일 묶음(zip), 로그, 글 파일, 그림.
 * 실행 파일(exe, msi, apk)은 받지 않는다: 남이 올린 실행 파일을 우리 주소로 나눠 주는 꼴이 된다.
 */
export const POST_FILE_TYPES = {
  pdf: "application/pdf",
  zip: "application/zip",
  txt: "text/plain",
  log: "text/plain",
  csv: "text/csv",
  json: "application/json",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
} as const satisfies Record<string, string>;
export type PostFileExt = keyof typeof POST_FILE_TYPES;
export const POST_FILE_CONTENT_TYPES: readonly string[] = [...new Set(Object.values(POST_FILE_TYPES))];
export const POST_FILE_ACCEPT = Object.keys(POST_FILE_TYPES)
  .map((e) => `.${e}`)
  .join(",");
/** 첨부 한 개의 상한. 할 일 첨부(10MB)보다 넉넉하게 — 공략 PDF 묶음, 세이브 압축이 들어가고 영상은 걸러지는 선 */
export const POST_FILE_MAX_BYTES = 20 * 1024 * 1024;
/** 글 하나의 첨부 수 */
export const POST_FILE_MAX = 5;
/** 화면에 적는 파일 이름 상한 */
export const POST_FILE_NAME_MAX = 120;

/** 저장소 경로 접두. 업로드 토큰은 이 아래 한 단계 파일만 허락한다 */
export const POST_MEDIA_PREFIX = "posts/";

export type PostMediaKind = "image" | "file";

/** 확장자 → 저장 형식. 받지 않는 확장자면 null */
export function postFileType(fileName: string): { ext: PostFileExt; contentType: string } | null {
  const dot = fileName.lastIndexOf(".");
  if (dot < 0) return null;
  const ext = fileName.slice(dot + 1).toLowerCase();
  if (!Object.hasOwn(POST_FILE_TYPES, ext)) return null;
  return { ext: ext as PostFileExt, contentType: POST_FILE_TYPES[ext as PostFileExt] };
}

export function isPostImageName(fileName: string): boolean {
  const ext = fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase();
  return (POST_IMAGE_EXTS as readonly string[]).includes(ext);
}

/** 경로가 글 미디어 접두 바로 아래 파일인가. `..` 이나 하위 폴더로 접두를 빠져나가는 꼴을 막는다 */
export function isPostMediaPath(pathname: string): boolean {
  if (!pathname.startsWith(POST_MEDIA_PREFIX)) return false;
  const rest = pathname.slice(POST_MEDIA_PREFIX.length);
  return rest.length > 0 && !rest.includes("/") && !rest.includes("..") && !rest.includes("\\");
}

/** 바이트 → "820 KB", "3.4 MB" */
export function formatFileSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  const mb = n / (1024 * 1024);
  // 상한 안내("20MB")처럼 딱 떨어지는 값은 소수점을 떼고 붙여 쓴다
  return Number.isInteger(mb) ? `${mb}MB` : `${mb.toFixed(1)} MB`;
}

/** 본문 그림이 올 수 있는 유일한 호스트(next.config 의 images.remotePatterns 와 같은 값). 남의 서버 그림은 본문에서 걷는다 */
export const POST_MEDIA_HOST_SUFFIX = ".public.blob.vercel-storage.com";

export function isPostMediaUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(POST_MEDIA_HOST_SUFFIX) && u.pathname.startsWith(`/${POST_MEDIA_PREFIX}`);
  } catch {
    return false;
  }
}
