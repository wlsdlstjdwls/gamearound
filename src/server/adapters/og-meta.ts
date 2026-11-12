// 웹 페이지 머리의 공유용 태그(og:title, og:description, og:image)를 읽는 순수 함수. 네트워크, DB 를 모른다.
//
// 왜 본문이 아니라 이 태그인가(2026-11-12 사용자 지시): 이벤트, 소식 카드는 "긁어온 제목, 설명을 그대로 보여주고
// 원문으로 보낸다" 로 정했다. AI 요약을 하지 않고, 페이지마다 다른 본문 구조를 파싱하지도 않는다.
// 이 태그는 사이트가 링크 미리보기용으로 직접 내놓는 값이라 페이지 디자인이 바뀌어도 거의 안 바뀐다.
// og 가 없으면 <title>, <meta name="description"> 으로 물러선다.
import { decodeHtmlEntities } from "@/lib/html-entities";

export type PageMeta = { title: string | null; description: string | null; imageUrl: string | null };

/** 태그 하나의 속성들. 따옴표는 "" 와 '' 둘 다 받는다 */
const META_TAG = /<meta\b[^>]*>/gi;
const ATTR = /([a-zA-Z:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
const TITLE_TAG = /<title[^>]*>([\s\S]*?)<\/title>/i;

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(ATTR)) out[m[1].toLowerCase()] = m[3] ?? m[4] ?? "";
  return out;
}

function clean(v: string | undefined): string | null {
  if (!v) return null;
  const s = decodeHtmlEntities(v).replace(/\s+/g, " ").trim();
  return s.length > 0 ? s : null;
}

/** 머리 태그를 읽는다. 상대 주소 이미지는 pageUrl 기준으로 절대 주소로 바꾼다 */
export function parsePageMeta(html: string, pageUrl: string): PageMeta {
  const byKey = new Map<string, string>();
  for (const m of html.matchAll(META_TAG)) {
    const a = attrs(m[0]);
    const key = (a.property ?? a.name)?.toLowerCase();
    if (key && a.content !== undefined && !byKey.has(key)) byKey.set(key, a.content);
  }
  const image = clean(byKey.get("og:image") ?? byKey.get("twitter:image"));
  let imageUrl: string | null = null;
  if (image) {
    try {
      imageUrl = new URL(image, pageUrl).toString();
    } catch {
      imageUrl = null;
    }
  }
  return {
    title: clean(byKey.get("og:title")) ?? clean(TITLE_TAG.exec(html)?.[1]),
    description: clean(byKey.get("og:description") ?? byKey.get("description")),
    imageUrl,
  };
}
