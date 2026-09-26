// CSV 한 파일을 판매 목록에 반영한다 — 설계서 §8.
//
// 같은 물건을 찾는 열쇠는 둘이다. 바코드가 있으면 (바코드, 상태), 없으면 **이 매장 안에서** (이름, 상태).
// 이름으로 찾는 범위를 우리 매장으로 좁히는 이유: 상품(products)은 매장끼리 공유하는 자산이고, 이름이 같다고
// 남의 매장이 만든 상품에 붙이면 기종도 에디션도 다른 물건이 한 상품이 된다(write.ts 의 findOrCreateProduct 주석).
//
// 찾으면 값, 수량, 공개만 고친다. 상품 이름, 기종, 게임은 안 건드린다 — 상품은 다른 매장도 쓰고 있다.
// 이미 있는 값을 파일 값으로 덮는 것은 의도다: 이 파일은 매장이 **자기 손으로** 올린 것이다.
// 설계서 §8 의 "연동이 사람이 고친 값을 덮지 않는다" 는 기계가 밀어 넣는 연동(api, pos) 몫의 규칙이다.
//
// 한 줄의 실패가 파일 전체를 멈추지 않는다(AGENTS §7 과 같은 규칙). 실패는 줄 번호와 함께 표본만 남긴다.
import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { products, shopListings, shopStockEvents, type ListingCondition } from "@/server/db/schema";
import { createdBy, updatedBy, type AuditSource } from "@/server/db/audit";
import { LISTING_CSV_ERROR_SAMPLE } from "@/lib/shops/constants";
import type { ListingCsvInput, ListingCsvRow } from "@/lib/shops/listing-csv";
import { createListing } from "./write";

export type ListingImportResult = {
  created: number;
  updated: number;
  unchanged: number;
  failed: number;
  /** 앞에서부터 LISTING_CSV_ERROR_SAMPLE 줄까지 */
  errors: Array<{ line: number; error: string }>;
};

type Existing = { id: string; barcode: string | null; onHand: number; priceMinor: number; status: ListingCsvInput["status"] };

/** 이름 비교는 공백과 대소문자를 무시한다 — 엑셀에서 옮기며 띄어쓰기 하나가 바뀌면 새 줄이 생긴다 */
function nameKey(name: string, condition: ListingCondition): string {
  return `n:${name.replace(/\s+/g, "").toLowerCase()}|${condition}`;
}

function barcodeKey(barcode: string, condition: ListingCondition): string {
  return `b:${barcode}|${condition}`;
}

function rowKey(v: ListingCsvInput): string {
  return v.barcode ? barcodeKey(v.barcode, v.condition) : nameKey(v.name, v.condition);
}

/** 이 매장이 이미 파는 줄을 한 번에 읽어 둔다 — 줄마다 묻으면 500줄에 왕복이 500번 는다 */
async function loadExisting(shopId: string): Promise<Map<string, Existing>> {
  const rows = await getDb()
    .select({
      id: shopListings.id,
      condition: shopListings.condition,
      onHand: shopListings.onHand,
      priceMinor: shopListings.priceMinor,
      status: shopListings.status,
      name: products.name,
      barcode: products.barcode,
    })
    .from(shopListings)
    .innerJoin(products, eq(products.id, shopListings.productId))
    .where(eq(shopListings.shopId, shopId));

  const map = new Map<string, Existing>();
  for (const r of rows) {
    const cur = { id: r.id, barcode: r.barcode, onHand: r.onHand, priceMinor: r.priceMinor, status: r.status };
    if (r.barcode) map.set(barcodeKey(r.barcode, r.condition), cur);
    // 바코드가 있는 상품도 이름으로 걸리게 둔다 — 손으로 바코드를 넣어 올린 물건을 파일에서는 바코드 없이 적는 일이 흔하다
    map.set(nameKey(r.name, r.condition), cur);
  }
  return map;
}

/** 있는 줄을 고친다. 값이 실제로 달라질 때만 쓴다(AGENTS §7). 달라진 것이 없으면 false */
async function updateExisting(cur: Existing, v: ListingCsvInput, actor: { source: AuditSource; userId?: string }): Promise<boolean> {
  const stockChanged = cur.onHand !== v.onHand;
  if (!stockChanged && cur.priceMinor === v.priceMinor && cur.status === v.status) return false;

  const db = getDb();
  const update = db
    .update(shopListings)
    .set({
      priceMinor: v.priceMinor,
      onHand: v.onHand,
      status: v.status,
      source: "csv",
      ...(stockChanged ? { stockUpdatedAt: new Date() } : {}),
      ...updatedBy(actor.source, actor.userId),
    })
    .where(eq(shopListings.id, cur.id));

  if (stockChanged) {
    // 재고 이력은 수량이 움직였을 때만 남긴다 — 값만 바뀐 줄에 before=after 이력을 쌓지 않는다
    await db.batch([
      update,
      db.insert(shopStockEvents).values({
        listingId: cur.id,
        beforeQty: cur.onHand,
        afterQty: v.onHand,
        reason: "csv",
        ...createdBy(actor.source, actor.userId),
      }),
    ]);
  } else {
    await update;
  }
  return true;
}

export async function importListingsCsv(
  shopId: string,
  rows: ListingCsvRow[],
  actor: { source: AuditSource; userId?: string },
): Promise<ListingImportResult> {
  const result: ListingImportResult = { created: 0, updated: 0, unchanged: 0, failed: 0, errors: [] };
  const fail = (line: number, error: string) => {
    result.failed++;
    if (result.errors.length < LISTING_CSV_ERROR_SAMPLE) result.errors.push({ line, error });
  };

  const existing = await loadExisting(shopId);

  for (const row of rows) {
    if (!row.ok) {
      fail(row.line, row.error);
      continue;
    }
    const v = row.value;
    try {
      // 바코드가 있는 줄이 이름으로 붙는 것은 상대에게 바코드가 **없을 때만**이다 — 이름이 같아도 바코드가 다르면
      // 다른 에디션이다(일반판과 한정판이 이름을 나눠 쓴다)
      const byName = v.barcode ? existing.get(nameKey(v.name, v.condition)) : undefined;
      const cur = existing.get(rowKey(v)) ?? (byName && !byName.barcode ? byName : undefined);
      if (cur) {
        const changed = await updateExisting(cur, v, actor);
        if (changed) result.updated++;
        else result.unchanged++;
        Object.assign(cur, { onHand: v.onHand, priceMinor: v.priceMinor, status: v.status });
        continue;
      }
      const id = await createListing({ ...v, shopId }, actor, "csv");
      // 같은 파일 안에서 같은 물건이 다시 나오면 새로 만들지 않고 이 줄을 고친다(뒤 줄이 이긴다)
      const made = { id, barcode: v.barcode || null, onHand: v.onHand, priceMinor: v.priceMinor, status: v.status };
      existing.set(rowKey(v), made);
      existing.set(nameKey(v.name, v.condition), made);
      result.created++;
    } catch (e) {
      fail(row.line, e instanceof Error ? e.message : String(e));
    }
  }
  return result;
}
