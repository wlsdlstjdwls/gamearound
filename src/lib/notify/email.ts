// 이메일 템플릿 채우기(2026-11-02). 본문 문법은 텔레그램 템플릿과 하나다(lib/notify/template) — 운영자가 수단마다 다른 꾸밈을 외우지 않게.
// 같은 renderNotice 로 변수를 채우고 허용 태그만 남긴 뒤, 메일 HTML 로 감싼다.
//
// 메일 클라이언트(지메일, 네이버 메일)는 <style> 을 떼는 일이 흔해 꾸밈은 전부 인라인 스타일이다(server/mail/password-reset-mail 과 같은 이유).
// 줄바꿈 글자는 <br> 로 바꾼다 — 텔레그램은 글자 그대로 줄이 되지만 HTML 메일은 한 줄로 붙는다. pre 안은 white-space 로 지킨다.
// 텍스트판(text)도 같이 만든다. HTML 을 못 그리는 클라이언트, 스팸 판정이 둘 다 있는 메일을 낫게 본다.
import { NOTIFY_CONTENT_MESSAGES as C } from "./messages";
import { fillVars, renderNotice } from "./template";
import { MAIL_COLOR } from "@/lib/notify/email-color";
import { MAIL_BLOCK_CLOSE as BLOCK_CLOSE, MAIL_BLOCK_OPEN as BLOCK_OPEN, mailShell, promoteMailLines } from "@/lib/notify/email-shell";

/** 메일 제목 상한. RFC 5322 권장 줄 길이(78자)에 머리말이 붙어도 받은편지함에서 잘리지 않을 만큼 */
export const EMAIL_SUBJECT_MAX = 120;
/** 메일 본문 상한(변수를 채운 HTML 기준). 공지 한 통이 넉넉히 들어가고, Resend 요청 한 번이 무거워지지 않을 만큼 */
export const EMAIL_BODY_MAX = 20_000;

export { MAIL_COLOR } from "@/lib/notify/email-color";
/** 태그 → 인라인 스타일. 링크는 파랑, 인용은 왼쪽 띠 */
const INLINE: Record<string, string> = {
  a: `color:${MAIL_COLOR.acc};text-decoration:underline`,
  blockquote: `margin:8px 0;padding:2px 0 2px 12px;border-left:3px solid ${MAIL_COLOR.acc};color:${MAIL_COLOR.mut}`,
  code: `background:${MAIL_COLOR.soft};border-radius:4px;padding:1px 4px;font-size:13px`,
  pre: `background:${MAIL_COLOR.soft};border-radius:8px;padding:10px;font-size:13px;white-space:pre-wrap`,
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

/**
 * 코드가 그린 덩어리 하나(2026-11-04, 주간 소식 기사 카드). 변수 값은 늘 글자로 들어가서(lib/notify/template) 줄마다 링크, 그림을 못 건다 —
 * 그 자리는 템플릿 변수 대신 덩어리로 채운다. 템플릿에는 {목록} 처럼 자리만 두고, 둘레 문구는 운영자가 알림템플릿관리에서 고친다.
 * html 은 코드가 값을 이스케이프해 만든 것이라 허용 태그 검사(sanitize)를 지나지 않는다. 회원이나 운영자가 친 글을 이스케이프 없이 넣지 않는다.
 */
export type EmailBlock = { html: string; text: string };
export type EmailBlocks = Readonly<Record<string, EmailBlock>>;

/** 덩어리 표식. 감싸기(wrapEmailHtml)가 이 안은 줄바꿈, 인라인 스타일을 건드리지 않는다 — 덩어리는 제 스타일을 들고 온다 */
const BLOCK_PART = /(<!--mail-block-->[\s\S]*?<!--\/mail-block-->)/;

/** 정리된 본문의 {이름} 자리에 덩어리 HTML 을 넣는다. 미리 보기(알림템플릿관리)도 이것으로 같은 모양을 본다 */
export function withEmailBlocks(clean: string, blocks: EmailBlocks | undefined): string {
  if (!blocks) return clean;
  let out = clean;
  for (const [name, b] of Object.entries(blocks)) out = out.split(`{${name}}`).join(`${BLOCK_OPEN}${b.html}${BLOCK_CLOSE}`);
  return out;
}

/** 본문 하나 → 미리 보기용 본문, 메일 HTML, 텍스트판. blocks 의 이름은 vars 에 넣지 않는다(넣으면 글자로 먼저 채워진다) */
export function renderEmail(body: string, vars: Readonly<Record<string, string | null | undefined>>, blocks?: EmailBlocks): RenderedEmail {
  const clean = renderNotice(body, vars);
  const withBlocks = withEmailBlocks(clean, blocks);
  let text = emailPlainText(clean);
  for (const [name, b] of Object.entries(blocks ?? {})) text = text.split(`{${name}}`).join(b.text);
  return { body: withBlocks, html: wrapEmailHtml(withBlocks), text };
}

/** 허용 태그만 남은 본문을 메일 HTML 로 감싼다. 미리 보기도 이것으로 그려 보낸 메일과 같은 모양을 본다 */
export function wrapEmailHtml(clean: string): string {
  // 미디어와 덩어리는 제 줄을 차지한다(display:block). 앞뒤 줄바꿈 하나씩은 <br> 로 바꾸지 않는다 — 바꾸면 위아래가 한 줄씩 더 빈다
  // 제목 줄, 단추 줄도 덩어리로 바꾼 뒤(email-shell) 같은 규칙을 탄다
  const tight = promoteMailLines(clean)
    .replace(/\r?\n?(<img [^>]*>|<video [^>]*>)\r?\n?/g, "$1")
    .replace(/\r?\n?(<!--mail-block-->)/g, "$1")
    .replace(/(<!--\/mail-block-->)\r?\n?/g, "$1");
  const inner = tight
    .split(BLOCK_PART)
    .map((part, i) => (i % 2 === 1 ? part : breakLines(inlineStyles(videosToLinks(part)))))
    .join("");
  return mailShell(inner);
}
