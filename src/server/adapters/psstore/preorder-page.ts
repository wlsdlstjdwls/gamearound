// 콘셉트 페이지 HTML 에서 기본 상품의 긴 소개(LONG)를 꺼낸다 — 예약 특전 읽기(psstore/preorder)의 입력.
//
// 왜 페이지인가(2026-11-19 실측, 한국 예약 PS5 줄 28건): GraphQL 콘셉트, 상품 질의에는 소개 칸이 없고 질의가 화이트리스트라
// 더할 수도 없다. 페이지에 서버 렌더링된 Apollo 캐시(<script id="env:..."> 의 cache)에는 있다:
//   Concept:<id>.defaultProduct → { __ref: "Product:<상품 id>" }  →  그 Product 의 descriptions[type=LONG].value
// 콘셉트 자신의 LONG 은 읽지 않는다 — 게임 소개라 특전이 없고, 예약과 무관한 "…특전" 이 섞여 있다
// (FF7 리버레이션: 앞 작품 저장 데이터 특전). 특전은 28건 모두 기본 상품 소개 맨 위에 있었다.
// 캐시가 블록 여러 개로 나뉘어 와서(한 블록엔 defaultProduct, 다른 블록엔 descriptions) 블록을 합쳐 본다.
//
// 소개 값은 HTML 조각이다(<br/> 로 줄을 가른다). 줄 구조가 특전 읽기의 단서라 <br> 를 줄바꿈으로 바꾸고 나머지 태그는 걷는다.
// concept-page.ts 와 나눈 이유: 저쪽은 짧은 값 둘을 키 모양으로 집고(매 회차 모든 PS 수집이 부른다), 이쪽은 캐시 JSON 을 푼다(예약 상품만).
import { z } from "zod";

/** 소개를 읽어 온 콘셉트 하나. 제목은 콘셉트 이름(상품 이름은 뒤에 지원 언어 괄호가 붙는다) */
export type PsstoreDescription = { title: string | null; description: string | null };

const ENV_SCRIPT = /<script id="env:[^"]+" type="application\/json">([\s\S]*?)<\/script>/g;
/** 줄을 가르는 태그. 소개는 <br/> 만 쓰지만 문단 태그가 와도 줄로 읽는다 */
const LINE_TAG = /<br\s*\/?>|<\/(?:p|div|li)>/gi;
const ANY_TAG = /<[^>]+>/g;
/** 소개에 올 만한 이름 붙은 문자 참조. 숫자 참조는 따로 푼다 */
const NAMED_ENTITY: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

const conceptEntry = z.object({
  name: z.string().nullish(),
  defaultProduct: z.object({ __ref: z.string() }).nullish(),
});
const productEntry = z.object({
  name: z.string().nullish(),
  descriptions: z.array(z.object({ type: z.string().nullish(), value: z.string().nullish() })).nullish(),
});

/** 소개 HTML 조각 → 줄 있는 글. 줄 끝 공백만 정리하고 빈 줄은 남긴다(빈 줄이 특전 마디의 끝을 말한다) */
export function psstoreDescriptionText(html: string): string {
  return html
    .replace(LINE_TAG, "\n")
    .replace(ANY_TAG, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
      if (code[0] !== "#") return NAMED_ENTITY[code.toLowerCase()] ?? whole;
      const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      return Number.isFinite(n) && n > 0 ? String.fromCodePoint(n) : whole;
    });
}

/**
 * 콘셉트 페이지 HTML → 기본 상품의 긴 소개. 캐시를 못 찾거나, 기본 상품이 없거나(아직 살 수 없는 콘셉트), 그 상품에
 * 소개 칸이 없으면 null — 부르는 쪽이 "모름" 으로 다룬다. 소개 칸은 있는데 LONG 이 없으면 description 이 null 이다("특전 없음").
 * 블록 하나의 JSON 이 깨져도 다른 블록에서 찾을 수 있어 그 블록만 건너뛴다.
 */
export function parsePsstoreDescription(html: string): PsstoreDescription | null {
  const cache: Record<string, Record<string, unknown>> = {};
  for (const m of html.matchAll(ENV_SCRIPT)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(m[1]);
    } catch {
      continue;
    }
    const block = (parsed as { cache?: unknown } | null)?.cache;
    if (!block || typeof block !== "object") continue;
    for (const [key, value] of Object.entries(block as Record<string, unknown>)) {
      if (!value || typeof value !== "object") continue;
      if (key.startsWith("Concept:") || key.startsWith("Product:")) cache[key] = { ...cache[key], ...(value as Record<string, unknown>) };
    }
  }
  for (const [key, value] of Object.entries(cache)) {
    if (!key.startsWith("Concept:")) continue;
    const concept = conceptEntry.safeParse(value);
    const ref = concept.success ? concept.data.defaultProduct?.__ref : undefined;
    if (!concept.success || !ref) continue;
    const product = productEntry.safeParse(cache[ref] ?? {});
    // 소개 칸 자체가 없으면 "모름" 이다 — 마크업이 바뀌어 칸을 놓쳤을 때 이미 담은 특전을 "빠짐" 으로 지우지 않게
    const descriptions = product.success ? product.data.descriptions : null;
    if (!descriptions) continue;
    const long = descriptions.find((d) => d.type === "LONG")?.value;
    const title = concept.data.name?.trim() || product.data?.name?.trim() || null;
    return { title, description: long ? psstoreDescriptionText(long) : null };
  }
  return null;
}
