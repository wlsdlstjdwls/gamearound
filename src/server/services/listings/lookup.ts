// 바코드로 이미 있는 상품을 찾는다 — 설계서 §4 "바코드가 실물의 자연키".
//
// 다른 매장이 만든 상품도 돌려준다. 상품은 매장끼리 공유하는 자산이고(§4.1), 같은 바코드로 올리면
// 어차피 그 상품에 붙는다(write.ts 의 findOrCreateProduct). 폼에 미리 보여 주는 것은 "이 이름으로 붙는다" 는 예고다.
import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { games, products } from "@/server/db/schema";
import { normalizeBarcode } from "@/lib/shops/listing-schemas";

/** 폼이 채울 값. Drizzle 행 타입을 화면까지 흘리지 않는다(AGENTS §1) */
export type BarcodeHitDto = {
  name: string;
  hardwareCode: string | null;
  /** 이어진 게임의 화면 이름. 없으면 매핑 배치(§5.2)가 아직 못 이은 상품이다 */
  gameTitle: string | null;
};

export async function findProductByBarcode(raw: string): Promise<BarcodeHitDto | null> {
  const barcode = normalizeBarcode(raw);
  if (!barcode) return null;
  const rows = await getDb()
    .select({ name: products.name, hardwareCode: products.hardwareCode, titleKo: games.titleKo, titleEn: games.titleEn })
    .from(products)
    .leftJoin(games, eq(games.id, products.gameId))
    .where(eq(products.barcode, barcode))
    .limit(1);
  const r = rows[0];
  if (!r) return null;
  return { name: r.name, hardwareCode: r.hardwareCode, gameTitle: r.titleKo ?? r.titleEn ?? null };
}
