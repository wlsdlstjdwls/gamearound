// 콘셉트의 기본 상품이 PS5 일 때 같은 게임의 PS4 일반판 상품을 찾는다.
//
// 왜 필요한가(2026-11-11 실측): 콘셉트 상세가 주는 값은 기본 상품 하나의 값이라, 기본이 PS5 인 콘셉트는
// PS4 행을 영영 쓰지 않았다. PS4 행 1,676게임이 09-15 값에 멈춰 있었고, 그중 406행은 두 달 전 할인을 그대로 보였다.
// PS4 상품은 콘셉트의 products 목록에 같이 온다(id 에 CUSA). 그 상품 값을 따로 물으면 PS4 가격과 할인 종료 시각이 온다.
//
// 고르는 규칙은 일반판 찾기(standard-product)와 같은 결이다 — 싼 것이나 첫 것을 고르지 않는다. 목록에 체험판, 에디션,
// 번들이 섞이기 때문이다. 기본 상품과 제목이 같은 PS4 상품을 먼저 보고, 없으면 에디션, 체험판이 아닌 PS4 상품이 하나뿐일 때만 쓴다.
//
// 같은 날 표본 8건을 실제로 물어보니 따로 된 PS4 상품은 1건뿐이었다. 나머지는 둘 중 하나였다:
// - 상품 하나를 "PS4 & PS5" 로 판다(소닉×섀도우 제너레이션즈 PS4 & PS5, id 는 PPSA). PS4 값 = 그 상품 값이다.
// - 한국 콘셉트에 PS4 상품이 아예 없다(Paper Cut Mansion: PS5 상품 하나). 우리 PS4 행은 병합 때 들어온 값이라 스토어가 확인해 줄 길이 없다.
// 셋을 갈라 돌려준다(psstorePs4Offer). 무엇을 쓸지는 sync/platform-siblings 가 정한다.
import { z } from "zod";
import { normalizeTitle } from "@/lib/slug";
import { psstoreCleanTitle } from "./parse";
import { PSSTORE_PS4_TITLE_ID, PSSTORE_PS5_TITLE_ID } from "./constants";
import { PREMIUM_WORDS } from "./standard-product";

/** 일반판이 아닌 시험 상품. 실측 표본의 이름(Trial, Demo, 체험판, Prologue)을 적었다 */
const TRIAL_WORDS = /trial|demo|체험판|prologue|프롤로그/i;

type ProductRef = { id: string; name?: string | null };

/** 값을 따로 물을 PS4 상품 id. 기본 상품이 PS5 가 아니거나 믿을 만한 PS4 짝이 없으면 null */
export function psstorePs4ProductId(defaultProduct: ProductRef | null | undefined, products: ProductRef[] | null | undefined): string | null {
  if (!defaultProduct || !PSSTORE_PS5_TITLE_ID.test(defaultProduct.id)) return null;
  const ps4 = (products ?? []).filter((p) => PSSTORE_PS4_TITLE_ID.test(p.id) && !TRIAL_WORDS.test(p.name ?? ""));
  if (ps4.length === 0) return null;
  const head = psstoreCleanTitle(defaultProduct.name);
  if (head) {
    const key = normalizeTitle(head);
    const same = ps4.find((p) => normalizeTitle(psstoreCleanTitle(p.name) ?? "") === key);
    if (same) return same.id;
  }
  const plain = ps4.filter((p) => !PREMIUM_WORDS.test(psstoreCleanTitle(p.name) ?? ""));
  return plain.length === 1 ? plain[0].id : null;
}

/** 이름에 두 기기를 함께 적은 상품("PS4 & PS5", "PS4 및 PS5", "PS4/PS5") */
const CROSS_GEN_NAME = /PS4\s*(?:&|및|\/|and|,)\s*PS5|PS5\s*(?:&|및|\/|and|,)\s*PS4/i;

export type Ps4Offer = { kind: "product"; productId: string } | { kind: "same" } | { kind: "absent" } | null;

/**
 * 기본 상품이 PS5 인 콘셉트에서 PS4 값을 어디서 얻나. 기본 상품이 PS5 가 아니면 null(콘셉트 값이 곧 그 기기 값이다).
 * 따로 된 PS4 상품이 있지만 고를 수 없으면(후보 여럿, 제목 다름) null — 모르는 것을 "없음" 으로 단정하지 않는다
 */
export function psstorePs4Offer(defaultProduct: (ProductRef & { invariantName?: string | null }) | null | undefined, products: ProductRef[] | null | undefined): Ps4Offer {
  if (!defaultProduct || !PSSTORE_PS5_TITLE_ID.test(defaultProduct.id)) return null;
  const productId = psstorePs4ProductId(defaultProduct, products);
  if (productId) return { kind: "product", productId };
  if (CROSS_GEN_NAME.test(`${defaultProduct.name ?? ""} ${defaultProduct.invariantName ?? ""}`)) return { kind: "same" };
  const anyPs4 = (products ?? []).some((p) => PSSTORE_PS4_TITLE_ID.test(p.id));
  return anyPs4 ? null : { kind: "absent" };
}

const refSchema = z.object({ id: z.string(), name: z.string().nullish() });
const conceptProductsSchema = z.object({
  data: z.object({
    conceptRetrieve: z
      .object({ defaultProduct: refSchema.extend({ invariantName: z.string().nullish() }).nullish(), products: z.array(refSchema).nullish() })
      .nullish(),
  }),
});

/** 콘셉트 상세 원문에서 바로 가른다. 모양이 안 맞으면 null — PS4 값은 덤이라 수집을 멈추지 않는다 */
export function psstorePs4OfferFromConcept(raw: unknown): Ps4Offer {
  const parsed = conceptProductsSchema.safeParse(raw);
  const c = parsed.success ? parsed.data.data.conceptRetrieve : null;
  return c ? psstorePs4Offer(c.defaultProduct, c.products) : null;
}
