// 글 본문 HTML 거르기 — 서버에서만 부른다(저장 전 services/community/posts, 그리기 전 components/community/post-body).
// 규칙의 이유는 lib/community/rich-text 머리 주석. 허용 목록 방식이다 — 막을 것을 나열하면 빠지는 것이 생긴다.
// server-only 를 붙이지 않은 이유: 테스트(vitest)가 이 파일을 직접 읽는다. 클라이언트 파일에서 import 하지 않는다.
import sanitizeHtml from "sanitize-html";
import { isPostMediaUrl } from "@/lib/community/media";

/** 에디터가 내는 태그만. 표, 글꼴, 색은 받지 않는다 — 게시판 글이 제각각 꾸며지면 목록과 화면이 어지러워진다 */
const ALLOWED_TAGS = ["p", "br", "strong", "em", "s", "u", "code", "pre", "h2", "h3", "ul", "ol", "li", "blockquote", "hr", "a", "img", "div"];

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    // target, rel, loading, decoding 은 아래 transformTags 가 늘 덮어쓴다 — 거르기가 변환 뒤에 돌아서 허용 목록에 있어야 남는다
    a: ["href", "data-file", "data-size", "target", "rel"],
    img: ["src", "alt", "width", "height", "loading", "decoding"],
    // 첨부 묶음(에디터 아래 파일 목록). 이 속성 하나로 CSS 가 파일 카드 모양을 입힌다
    div: ["data-attachments"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["https"] },
  allowProtocolRelative: false,
  // 남의 서버 그림은 걷는다 — 우리 저장소에 올린 그림만 본문에 선다(추적 픽셀, 핫링크 차단 그림이 섞이지 않게)
  exclusiveFilter: (frame) => frame.tag === "img" && !isPostMediaUrl(frame.attribs.src ?? ""),
  transformTags: {
    // 본문 링크는 새 창, 검색 엔진에 점수를 넘기지 않는다(스팸 홍보 글이 노리는 것이 그 점수다)
    a: (tagName, attribs) => ({ tagName, attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer nofollow ugc" } }),
    img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: "lazy", decoding: "async" } }),
  },
  allowedSchemesAppliedToAttributes: ["href", "src"],
};

export function sanitizePostHtml(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}
