// 이메일 템플릿 채우기(2026-11-02). 본문 문법은 텔레그램 템플릿과 하나다(lib/notify/template) — 운영자가 수단마다 다른 꾸밈을 외우지 않게.
// 같은 renderNotice 로 변수를 채우고 허용 태그만 남긴 뒤, 메일 HTML 로 감싼다.
//
// 메일 클라이언트(지메일, 네이버 메일)는 <style> 을 떼는 일이 흔해 꾸밈은 전부 인라인 스타일이다(server/mail/password-reset-mail 과 같은 이유).
// 줄바꿈 글자는 <br> 로 바꾼다 — 텔레그램은 글자 그대로 줄이 되지만 HTML 메일은 한 줄로 붙는다. pre 안은 white-space 로 지킨다.
// 텍스트판(text)도 같이 만든다. HTML 을 못 그리는 클라이언트, 스팸 판정이 둘 다 있는 메일을 낫게 본다.
import { NOTIFY_CONTENT_MESSAGES as C } from "./messages";
import { fillVars, renderNotice } from "./template";

/** 메일 제목 상한. RFC 5322 권장 줄 길이(78자)에 머리말이 붙어도 받은편지함에서 잘리지 않을 만큼 */
export const EMAIL_SUBJECT_MAX = 120;
/** 메일 본문 상한(변수를 채운 HTML 기준). 공지 한 통이 넉넉히 들어가고, Resend 요청 한 번이 무거워지지 않을 만큼 */
export const EMAIL_BODY_MAX = 20_000;

const FONT = "-apple-system,'Segoe UI','Apple SD Gothic Neo','Malgun Gothic',sans-serif";
const WRAP = `font-family:${FONT};max-width:520px;margin:0 auto;padding:24px;color:#18202b;font-size:15px;line-height:1.7`;
/** 태그 → 인라인 스타일. 메일은 CSS 변수를 못 읽어 globals.css 의 --acc, --ink 값을 글자로 옮겼다. 링크는 파랑, 인용은 왼쪽 띠 */
const INLINE: Record<string, string> = {
  a: "color:#2563eb;text-decoration:underline",
  blockquote: "margin:8px 0;padding:2px 0 2px 12px;border-left:3px solid #2563eb;color:#55524c",
  code: "background:#f1f0ec;border-radius:4px;padding:1px 4px;font-size:13px",
  pre: "background:#f1f0ec;border-radius:8px;padding:10px;font-size:13px;white-space:pre-wrap",
  img: "display:block;max-width:100%;height:auto;border:0;border-radius:8px;margin:8px 0",
};

/**
 * 영상 자리 → 첫 장면 그림 + "영상 보기" 링크(메일은 video 를 재생하지 않는다, lib/notify/media). 첫 장면이 없으면 링크만.
 * 링크 뒤에 줄을 끊는다 — 앞뒤 줄바꿈을 걷어(wrapEmailHtml) 다음 글이 링크 옆에 붙었다.
 * 인라인 스타일을 입히기 전에 바꾼다 — 바꾼 img, a 도 같은 스타일을 받는다
 */
function videosToLinks(html: string): string {
  return html.replace(/<video src="([^"]*)"(?: poster="([^"]*)")?>/g, (_, src: string, poster?: string) =>
    poster ? `<a href="${src}"><img src="${poster}" alt="${C.videoPosterAlt}"></a><a href="${src}">${C.emailVideoLink}</a><br>` : `<a href="${src}">${C.emailVideoLink}</a><br>`,
  );
}

function inlineStyles(html: string): string {
  return html.replace(/<(a|blockquote|code|pre|img)(\s|>)/g, (_, tag: string, rest: string) => `<${tag} style="${INLINE[tag]}"${rest}`);
}

/** pre 밖의 줄바꿈만 <br> 로 */
function breakLines(html: string): string {
  return html
    .split(/(<pre[^>]*>[\s\S]*?<\/pre>)/)
    .map((part, i) => (i % 2 === 1 ? part : part.replace(/\r?\n/g, "<br>")))
    .join("");
}

function unescape(s: string): string {
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n))).replace(/&amp;/g, "&");
}

/** 허용 태그만 남은 HTML 을 텍스트판으로. 링크는 "글자 (주소)" 로 풀어 주소가 사라지지 않게 */
export function emailPlainText(html: string): string {
  return unescape(
    html
      .replace(/<video src="([^"]*)"[^>]*>/g, (_, src: string) => `${C.plainVideo} (${src})`)
      .replace(/<img src="([^"]*)">/g, (_, src: string) => `${C.plainImage} (${src})`)
      .replace(/<a href="([^"]*)">([\s\S]*?)<\/a>/g, (_, href: string, label: string) => (label.trim() === href.trim() ? href : `${label} (${href})`))
      .replace(/<[^>]+>/g, ""),
  ).trim();
}

/** 메일 제목. 태그를 쓰지 않는 칸이라 변수 값을 이스케이프하지 않은 글로 채운다 */
export function renderEmailSubject(subject: string, vars: Readonly<Record<string, string | null | undefined>>): string {
  return unescape(fillVars(subject, vars)).replace(/\s+/g, " ").trim();
}

export interface RenderedEmail {
  /** 허용 태그만 남긴 본문(미리 보기, 발송 이력에 남는 글) */
  body: string;
  /** 보낼 메일 HTML(감싼 것) */
  html: string;
  text: string;
}

/** 본문 하나 → 미리 보기용 본문, 메일 HTML, 텍스트판 */
export function renderEmail(body: string, vars: Readonly<Record<string, string | null | undefined>>): RenderedEmail {
  const clean = renderNotice(body, vars);
  return { body: clean, html: wrapEmailHtml(clean), text: emailPlainText(clean) };
}

/** 허용 태그만 남은 본문을 메일 HTML 로 감싼다. 미리 보기도 이것으로 그려 보낸 메일과 같은 모양을 본다 */
export function wrapEmailHtml(clean: string): string {
  // 미디어는 제 줄을 차지하는 덩어리(display:block)라 앞뒤 줄바꿈 하나씩은 <br> 로 바꾸지 않는다 — 바꾸면 그림 위아래가 한 줄씩 더 빈다
  const tight = clean.replace(/\r?\n?(<img [^>]*>|<video [^>]*>)\r?\n?/g, "$1");
  return `<div style="${WRAP}">${breakLines(inlineStyles(videosToLinks(tight)))}</div>`;
}
