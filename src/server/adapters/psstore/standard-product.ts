// 콘셉트의 기본 상품이 에디션일 때 같은 게임의 일반판을 찾는다.
//
// 왜 필요한가(2026-10-06, 사용자 지적: GTA VI 의 PS 값이 Xbox 보다 23,000원 비싸다).
// 콘셉트 상세가 주는 값은 defaultProduct 하나의 값인데, 그 기본 상품을 고르는 건 스토어다.
// GTA VI 는 기본 상품이 "얼티밋 에디션"(112,800원)이고 일반판(89,800원)은 products 목록에만 있었다.
// 다른 스토어는 본편 값을 주므로 PS 만 에디션 값으로 비교표에 섰다.
//
// "가장 싼 상품" 으로 고르지 않는 이유(2026-10-06 표본 40 콘셉트 중 상품이 둘 이상인 13건을 눈으로 봤다):
// 목록에 체험판(A Way Out Trial), 프롤로그(Alone in the Dark Prologue), **다른 게임**(Arcade Archives 와
// Arcade Archives 2), 번들이 섞인다. 싼 것을 고르면 그것들 값이 본편 값 행세를 한다.
// 그래서 "기본 상품 제목에서 에디션 꼬리를 뗀 것과 같은 제목의 다른 상품" 만 일반판으로 친다.
// 13건 중 12건은 기본 상품이 이미 일반판이었다 — 추가 요청은 드문 경우에만 나간다.
import { z } from "zod";
import { normalizeTitle } from "@/lib/slug";
import { psstoreCleanTitle } from "./parse";

/** 일반판 제목에는 없는 낱말. 실측 표본의 에디션 이름(얼티밋, 디럭스, 스페셜, 페이백, 번들)과 흔한 이름을 같이 적었다 */
const PREMIUM_WORDS = /edition|에디션|deluxe|디럭스|ultimate|얼티밋|gold|골드|premium|프리미엄|bundle|번들|complete|컴플리트|version|버전/i;

type ProductRef = { id: string; name?: string | null };

/** 다시 값을 물어야 할 일반판 상품 id. 기본 상품이 이미 일반판이거나 짝이 없으면 null */
export function psstoreStandardProductId(defaultProduct: ProductRef | null | undefined, products: ProductRef[] | null | undefined): string | null {
  const head = psstoreCleanTitle(defaultProduct?.name);
  if (!defaultProduct || !head) return null;
  const key = normalizeTitle(head);
  for (const p of products ?? []) {
    if (p.id === defaultProduct.id) continue;
    const name = psstoreCleanTitle(p.name);
    // 기본 상품이 일반판이면 짝들은 더 길다(에디션 꼬리) — 여기서 걸러져 요청이 안 나간다
    if (!name || name.length >= head.length) continue;
    // 짝도 에디션이면 안 된다 — 디럭스 기본에 골드 짝은 일반판이 아니다
    if (PREMIUM_WORDS.test(name)) continue;
    if (normalizeTitle(name) === key) return p.id;
  }
  return null;
}

const refSchema = z.object({ id: z.string(), name: z.string().nullish() });
const conceptProductsSchema = z.object({
  data: z.object({
    conceptRetrieve: z.object({ defaultProduct: refSchema.nullish(), products: z.array(refSchema).nullish() }).nullish(),
  }),
});

/** 콘셉트 상세 원문에서 바로 고른다. 모양이 안 맞으면 null — 값 보정은 덤이라 수집을 멈추지 않는다 */
export function psstoreStandardProductIdFromConcept(raw: unknown): string | null {
  const parsed = conceptProductsSchema.safeParse(raw);
  const c = parsed.success ? parsed.data.data.conceptRetrieve : null;
  return c ? psstoreStandardProductId(c.defaultProduct, c.products) : null;
}
