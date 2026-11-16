// 콘셉트 페이지 HTML 에서 GraphQL 응답에 없는 두 칸을 읽는다: 유통사, 상품마다 덮는 기기.
//
// 왜 HTML 인가(2026-11-16 Actions 러너 실측): 콘셉트 상세 질의(persisted query)에는 개발사, 유통사, 상품의 기기 필드가 아예 없다.
// 질의는 화이트리스트라 필드를 더할 수도 없다. 페이지에 서버 렌더링된 Apollo 캐시에는 둘 다 있다 —
//   유통사  "publisherName":"Sony Interactive Entertainment"  (4/4 표본. 개발사 칸은 페이지에도 없다)
//   기기    "Product:<id>":{"id":"<id>","__typename":"Product",...,"platforms":["PS4","PS5"]}
// 기기가 중요한 이유: 상품 하나를 PS4, PS5 둘 다로 파는데 이름에 "PS4 & PS5" 를 안 적은 게임이 많다(표본 6건 중 5건).
// 이름만 보는 판정(ps4-product 의 CROSS_GEN_NAME)은 그걸 "PS4 상품 없음" 으로 읽어 PS4 줄이 화면에서 빠졌다.
//
// add-ons.ts 처럼 script 블록을 JSON 으로 통째 파싱하지 않고 키 모양으로 집는다 — 이 칸들은 여러 캐시 블록에 되풀이되고,
// 필요한 것은 짧은 값 둘뿐이라 50만 자 페이지를 몇 번씩 JSON.parse 할 이유가 없다.
import type { Platform } from "@/server/db/schema";

export interface PsstoreConceptPage {
  publisher: string | null;
  /** 상품 id → 그 상품이 덮는 우리 기기. 페이지에 나온 상품만 있다 */
  platformsByProduct: Record<string, Platform[]>;
}

/** 스토어 기기 이름 → 우리 기기. VITA, PSPC 같은 나머지는 우리 기기가 아니라 버린다 */
const PSSTORE_PLATFORM: Record<string, Platform> = { PS4: "ps4", PS5: "ps5" };

const PUBLISHER = /"publisherName":("(?:[^"\\]|\\.)*")/;
const PRODUCT_PLATFORMS = /"Product:([^"]+)":\{"id":"[^"]+","__typename":"Product",(?:"topCategory":"[^"]*",)?"platforms":\[([^\]]*)\]/g;

/** JSON 문자열 조각을 푼다. 깨졌으면 null — 유통사는 덤이라 수집을 멈추지 않는다 */
function jsonString(raw: string): string | null {
  try {
    const v: unknown = JSON.parse(raw);
    return typeof v === "string" && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

export function parsePsstoreConceptPage(html: string): PsstoreConceptPage {
  const pub = PUBLISHER.exec(html)?.[1];
  const platformsByProduct: Record<string, Platform[]> = {};
  for (const m of html.matchAll(PRODUCT_PLATFORMS)) {
    const list = [...m[2].matchAll(/"([^"]+)"/g)].map((x) => PSSTORE_PLATFORM[x[1]]).filter((p): p is Platform => Boolean(p));
    // 같은 상품이 캐시 블록마다 되풀이된다 — 처음 본 것을 쓴다(실측상 값이 같다)
    if (!(m[1] in platformsByProduct)) platformsByProduct[m[1]] = Array.from(new Set(list));
  }
  return { publisher: pub ? jsonString(pub) : null, platformsByProduct };
}
