// 알림 본문의 이미지, 영상(2026-11-02, 사용자 "글 중간중간 이미지나 영상"). 본문 문법(lib/notify/template)에 두 태그를 더한다:
//   <img src="주소">                      이미지 한 장
//   <video src="주소" poster="주소">      영상 하나(poster 는 첫 장면 그림, 올릴 때 브라우저가 떠서 같이 올린다)
// 둘 다 닫는 태그가 없는 한 줄짜리다. 글 어디에나 둘 수 있고, 수단마다 다르게 나간다:
//   이메일    그 자리에 이미지. 영상은 메일 클라이언트가 재생하지 않아(지메일, 네이버가 video 태그를 걷는다) 첫 장면 그림 + "영상 보기" 링크
//   텔레그램  한 메시지에 글과 사진을 섞을 수 없다 — 이 자리에서 메시지를 나눠 글, 사진, 영상 순서대로 보낸다(splitNotice)
//   웹 알림   알림함 한 줄이라 쓰지 않는다(저장 검사가 태그를 막는다)
//
// 주소는 우리 Blob 저장소(notify/ 아래)만 받는다. 남의 서버 그림은 메일을 열었는지 엿보는 추적 그림이 될 수 있고, 텔레그램이 못 받으면 발송이 실패한다.

/** 이미지 한 장 상한. 텔레그램 sendPhoto 가 주소로 받는 사진 상한(5MB, Bot API sendPhoto)과 같다 */
export const NOTIFY_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
/** 영상 하나 상한. 텔레그램이 주소로 받는 파일 상한(20MB, Bot API "Sending files" 2번)과 같다 — 넘으면 발송이 실패한다 */
export const NOTIFY_VIDEO_MAX_BYTES = 20 * 1024 * 1024;
/** 영상 형식. mp4 만 받는다 — 텔레그램 sendVideo 가 바로 재생하는 형식이고 브라우저, 휴대폰이 다 튼다 */
export const NOTIFY_VIDEO_CONTENT_TYPES = ["video/mp4"] as const;
export const NOTIFY_VIDEO_ACCEPT = ".mp4,video/mp4";
/**
 * 이미지 형식. jpeg 만 굽는다(올리기 전 브라우저가 줄여 굽는다). webp 는 아웃룩 메일이 못 그리고,
 * 텔레그램 sendPhoto 도 jpeg, png 를 기대한다
 */
export const NOTIFY_IMAGE_CONTENT_TYPES = ["image/jpeg"] as const;
export const NOTIFY_IMAGE_ACCEPT = "image/*";

/** 저장소 경로 접두. 업로드 토큰은 이 아래 한 단계 파일만 허락한다(글 미디어 posts/ 와 같은 규칙) */
export const NOTIFY_MEDIA_PREFIX = "notify/";
/** Blob 공개 주소 호스트 끝(lib/community/media 의 POST_MEDIA_HOST_SUFFIX 와 같은 값) */
const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

export type NotifyMediaKind = "image" | "video" | "poster";

/** 경로가 알림 미디어 접두 바로 아래 파일인가. `..` 이나 하위 폴더로 빠져나가는 꼴을 막는다 */
export function isNotifyMediaPath(pathname: string): boolean {
  if (!pathname.startsWith(NOTIFY_MEDIA_PREFIX)) return false;
  const rest = pathname.slice(NOTIFY_MEDIA_PREFIX.length);
  return rest.length > 0 && !rest.includes("/") && !rest.includes("..") && !rest.includes("\\");
}

/** 본문에 둘 수 있는 미디어 주소인가 */
export function isNotifyMediaUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(BLOB_HOST_SUFFIX) && u.pathname.startsWith(`/${NOTIFY_MEDIA_PREFIX}`);
  } catch {
    return false;
  }
}

/** 본문 칸에 넣을 태그. 앞뒤에 줄을 둬 글과 갈라 읽힌다 */
export function imageTag(src: string): string {
  return `<img src="${src}">`;
}
export function videoTag(src: string, poster: string | null): string {
  return poster ? `<video src="${src}" poster="${poster}">` : `<video src="${src}">`;
}

export type NoticePart = { kind: "text"; html: string } | { kind: "image"; src: string } | { kind: "video"; src: string; poster: string | null };

/** 정리된 본문(renderNotice 결과)의 미디어 태그. template 의 허용 태그 정규식과 같은 꼴이다 */
const MEDIA = /<img src="([^"<>]*)">|<video src="([^"<>]*)"(?: poster="([^"<>]*)")?>/g;

const unescapeAttr = (v: string) => v.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

/**
 * 본문을 글, 이미지, 영상 조각으로 나눈다(나온 순서). 텔레그램은 조각마다 메시지 한 통이다.
 * 글 조각은 앞뒤 빈 줄을 걷고, 빈 조각은 버린다 — 이미지 앞뒤에 둔 줄바꿈이 빈 메시지가 되면 400 이 난다.
 */
export function splitNotice(html: string): NoticePart[] {
  const parts: NoticePart[] = [];
  const pushText = (t: string) => {
    const trimmed = t.replace(/^\s*\n/, "").replace(/\n\s*$/, "");
    if (trimmed.trim()) parts.push({ kind: "text", html: trimmed });
  };
  let at = 0;
  for (const m of html.matchAll(MEDIA)) {
    const idx = m.index ?? 0;
    pushText(html.slice(at, idx));
    if (m[1] !== undefined) parts.push({ kind: "image", src: unescapeAttr(m[1]) });
    else parts.push({ kind: "video", src: unescapeAttr(m[2]), poster: m[3] !== undefined ? unescapeAttr(m[3]) : null });
    at = idx + m[0].length;
  }
  pushText(html.slice(at));
  return parts;
}

/** 본문에 미디어가 있나 */
export function hasMedia(html: string): boolean {
  return new RegExp(MEDIA.source).test(html);
}
