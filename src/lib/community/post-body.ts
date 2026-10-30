// 저장된 글 본문을 고치기 화면에 되돌려 놓는 규칙(2026-10-30, 글 수정 기능).
// 글쓰기는 에디터 HTML 끝에 첨부 묶음(<div data-attachments>, components/community/post-media 의 attachmentsHtml)을 붙여 한 칸에 저장한다.
// 고치기 화면은 그 둘을 다시 갈라 에디터와 첨부 칸에 따로 채워야 한다 — 묶음째 에디터에 넣으면 에디터가 모르는 태그라 첨부가 사라진다.
// 옛 글(글자 본문, lib/community/rich-text 의 isRichBody 가 거짓)은 문단 HTML 로 바꿔 에디터에 넣는다.
// 순수 함수라 서버, 클라이언트 어디서나 쓴다(sanitize-html 을 끌지 않는다).
import { decodeHtmlEntities, escapeHtml } from "@/lib/html-entities";
import { isRichBody } from "@/lib/community/rich-text";

/** 첨부 하나. 크기는 저장된 글자("1.2MB") 그대로 되돌린다 — 바이트 수는 본문에 남지 않는다 */
export type ParsedAttachment = { url: string; name: string; sizeLabel: string };

const ATTACHMENTS = /<div\b[^>]*\bdata-attachments\b[^>]*>([\s\S]*?)<\/div>\s*$/i;
const ANCHOR = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;

function attr(attrs: string, name: string): string | null {
  const m = new RegExp(`\\b${name}=["']([^"']*)["']`, "i").exec(attrs);
  return m ? decodeHtmlEntities(m[1]) : null;
}

/** 본문 → 에디터 HTML 과 첨부 목록 */
export function splitPostBody(body: string): { html: string; files: ParsedAttachment[] } {
  if (!isRichBody(body)) {
    const html = body
      .split(/\n{2,}/)
      .map((para) => para.trim())
      .filter(Boolean)
      .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br>")}</p>`)
      .join("");
    return { html, files: [] };
  }
  const m = ATTACHMENTS.exec(body);
  if (!m) return { html: body, files: [] };
  const files: ParsedAttachment[] = [];
  for (const a of m[1].matchAll(ANCHOR)) {
    const url = attr(a[1], "href");
    if (!url) continue;
    files.push({ url, name: decodeHtmlEntities(a[2].replace(/<[^>]*>/g, "")), sizeLabel: attr(a[1], "data-size") ?? "" });
  }
  return { html: body.slice(0, m.index).trimEnd(), files };
}
