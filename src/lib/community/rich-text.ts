// 글 본문 HTML 의 규칙 — 에디터(components/community/rich-editor)가 HTML 을 내고, 서버는 저장 전과 그리기 전에 둘 다 걸러 낸다.
//
// 거르기는 lib/community/sanitize 에 따로 둔다 — 이 파일은 글쓰기 검증(클라이언트)도 쓰므로 sanitize-html 을 화면 번들에 끌고 가면 안 된다.
// 왜 두 번 거르나: 저장 전 거르기는 DB 에 더러운 HTML 이 안 쌓이게 하고, 그리기 전 거르기는 허용 목록이 좁아졌을 때
// 이미 저장된 글에도 새 규칙이 먹게 한다. 거르기는 허용 목록 방식(sanitize-html)이다 — 막을 것을 나열하면 빠지는 것이 생긴다.
//
// 옛 글은 글자 그대로다(이 규칙이 생기기 전에 올라온 글). 구분은 첫 글자가 에디터가 내는 블록 태그인가로 한다 —
// 표시 칸을 새로 두지 않으려는 것이다(마이그레이션 없음). 사람이 손으로 "<p>" 로 시작하는 글을 썼던 경우에도 걸러진 HTML 로 보일 뿐 위험은 없다.

const RICH_START = /^\s*<(p|h2|h3|ul|ol|blockquote|pre|img|figure|div|hr)[\s>/]/i;

export function isRichBody(body: string): boolean {
  return RICH_START.test(body);
}

/** 태그를 걷은 글자 — 본문 길이 검사, 요약에 쓴다. 엔티티는 글자 하나로 센다 */
export function richPlainText(html: string): string {
  return html
    .replace(/<(br|\/p|\/h2|\/h3|\/li|\/blockquote|\/pre)\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&[a-z]+;|&#\d+;/gi, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** 본문 첫 그림 주소. 홍보 고정 카드의 썸네일로 쓴다(2026-10-29). https 만 받는다(저장 전 거르기를 거친 HTML 이지만 한 번 더) */
export function firstImageSrc(html: string): string | null {
  const m = /<img\b[^>]*\bsrc=["'](https:\/\/[^"']+)["']/i.exec(html);
  return m ? m[1] : null;
}

/** 목록 카드에 세우는 본문 앞부분. 줄바꿈을 한 칸으로 접고 max 자에서 자른다 */
export function postExcerpt(body: string, max: number): string {
  const text = (isRichBody(body) ? richPlainText(body) : body).replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}...` : text;
}

/** 본문에 그림이 있나 — 글자 없이 그림만 올린 글도 본문이 있는 것으로 본다 */
export function hasPostImage(html: string): boolean {
  return /<img\s/i.test(html);
}
