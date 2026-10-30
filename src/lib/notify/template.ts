// 알림 템플릿 채우기(2026-10-30). 알림템플릿관리, 알림발송관리 미리 보기와 서버 발송이 같은 함수를 쓴다 — 미리 본 글이 그대로 나간다.
//
// 본문 문법은 둘이다.
//   {변수}: 발송 때 값으로 바뀐다. 이름은 한글, 영문, 숫자, 밑줄(운영자가 읽는 화면이라 {제목} 처럼 한글이 기본이다).
//   텔레그램 HTML 일부: <b> <i> <u> <s> <code> <pre> <blockquote> <a href="...">. 그 밖의 < > & 는 글자로 바꾼다.
// 왜 HTML 인가는 server/telegram/send 머리 주석(이스케이프할 글자가 셋뿐). 변수 값은 늘 이스케이프한다 — 사람이 친 제목의 `<` 하나에 400 이 난다.
// 순서: 변수를 먼저 이스케이프한 값으로 채우고, 그다음 통째로 정리한다. 그래야 링크 주소에 들어간 변수까지 같은 검사를 받는다.
import { escapeHtml } from "@/lib/html-entities";

/** 변수 자리. 중괄호 안은 글자, 숫자, 밑줄만 — "{ }" 같은 맨 중괄호는 변수가 아니다 */
const VAR = /\{([\p{L}\p{N}_]+)\}/gu;
/** 텔레그램이 받는 태그 가운데 운영 알림에 쓸 만한 것. span, tg-spoiler 등은 뺐다 */
const SIMPLE_TAGS = ["b", "i", "u", "s", "code", "pre", "blockquote"] as const;
const TAG = /<\/?(?:b|i|u|s|code|pre|blockquote)>|<a href="[^"<>]*">|<\/a>/g;
/** 이미 이스케이프된 글자(변수 값). 다시 바꾸면 &amp;lt; 로 두 번 바뀐다 */
const ENTITY = /^&(?:amp|lt|gt|quot|#\d+);/;
/** 링크로 둘 수 있는 주소. javascript: 같은 것을 미리 보기에 그대로 세우지 않는다 */
const SAFE_HREF = /^https?:\/\//i;

/** 본문에 나오는 변수 이름(나온 순서, 겹침 없이). 발송 화면이 이 순서로 입력 칸을 세운다 */
export function templateVars(body: string): string[] {
  return [...new Set([...body.matchAll(VAR)].map((m) => m[1]))];
}

/** 변수 채우기. 값이 없는 변수는 {이름} 그대로 둔다 — 빈칸으로 바꾸면 빠뜨린 것을 글에서 못 찾는다 */
export function fillVars(body: string, vars: Readonly<Record<string, string | null | undefined>>): string {
  return body.replace(VAR, (whole, name: string) => {
    const v = vars[name];
    return v === null || v === undefined ? whole : escapeHtml(v);
  });
}

function unescapeAttr(v: string): string {
  return v.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

/** 글자 조각의 < > & 를 바꾼다. 이미 바뀐 글자는 그대로 */
function escapeText(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "&") out += ENTITY.test(s.slice(i)) ? "&" : "&amp;";
    else if (ch === "<") out += "&lt;";
    else if (ch === ">") out += "&gt;";
    else out += ch;
  }
  return out;
}

/**
 * 허용 태그만 남기고 나머지 꺾쇠를 글자로 바꾼다. 링크는 주소가 http(s) 일 때만 링크다 — 아니면 태그를 글자로 남겨 운영자가 보고 고친다.
 * 짝이 맞는지는 보지 않는다(checkTags 가 저장 때 본다).
 */
export function sanitizeTelegramHtml(html: string): string {
  let out = "";
  let at = 0;
  for (const m of html.matchAll(TAG)) {
    const idx = m.index ?? 0;
    out += escapeText(html.slice(at, idx));
    const tag = m[0];
    const href = /^<a href="([^"]*)">$/.exec(tag)?.[1];
    out += href !== undefined && !SAFE_HREF.test(unescapeAttr(href)) ? escapeText(tag) : tag;
    at = idx + tag.length;
  }
  return out + escapeText(html.slice(at));
}

/** 템플릿 한 통. 미리 보기와 발송이 이것 하나를 부른다 */
export function renderNotice(body: string, vars: Readonly<Record<string, string | null | undefined>>): string {
  return sanitizeTelegramHtml(fillVars(body, vars));
}

export type TagProblem = { kind: "unclosed"; tag: string } | { kind: "unexpected"; tag: string };

/**
 * 태그 짝 검사. 짝이 안 맞으면 텔레그램이 글 전체를 400 으로 돌려보낸다 — 저장 전에 칸에서 말한다.
 * 링크 주소는 변수({링크})일 수 있어 여기서 보지 않는다(발송 때 renderNotice 가 본다).
 */
export function checkTags(body: string): TagProblem | null {
  const stack: string[] = [];
  for (const m of body.matchAll(TAG)) {
    const tag = m[0];
    const name = tag.startsWith("<a ") || tag === "</a>" ? "a" : tag.replace(/[</>]/g, "");
    if (!tag.startsWith("</")) {
      stack.push(name);
      continue;
    }
    if (stack.at(-1) !== name) return { kind: "unexpected", tag: name };
    stack.pop();
  }
  const open = stack.at(-1);
  return open ? { kind: "unclosed", tag: open } : null;
}

export const TEMPLATE_TAGS = [...SIMPLE_TAGS, "a"] as const;
