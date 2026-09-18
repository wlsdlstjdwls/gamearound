// 공개 매장 화면(/shops, /shops/[slug])이 쓰는 조회.
//
// 관리자, 매장주 화면과 모양을 나눈 이유는 ShopPublic 주석에 있다 — 공개 화면에 status 를 흘리지 않는다.
import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { shops } from "@/server/db/schema";
import { SHOPS_PAGE_SIZE } from "@/lib/shops/constants";
import { findShopBySlug, type ShopRow } from "./core";

/**
 * 공개 매장 화면(/shops, /shops/[slug])이 쓰는 모양.
 *
 * ShopSummary 와 따로 두는 이유: 그쪽은 관리자, 매장주 화면이 쓰는 값이라 status 를 들고 다닌다.
 * 공개 화면에 status 를 흘리면 "이 매장은 왜 안 보이나" 를 손님이 읽게 된다 — 거를 일은 질의가 한다.
 */
export type ShopPublic = {
  slug: string;
  name: string;
  shopType: ShopRow["shopType"];
  addressType: ShopRow["addressType"];
  address: string | null;
  addressDetail: string | null;
  phone: string | null;
  hours: string | null;
  description: string | null;
};

function toPublic(row: ShopRow): ShopPublic {
  return {
    slug: row.slug,
    name: row.name,
    shopType: row.shopType,
    addressType: row.addressType,
    address: row.address,
    addressDetail: row.addressDetail,
    phone: row.phone,
    hours: row.hours,
    description: row.description,
  };
}

/**
 * 매장 찾기 목록. 승인된 매장만 센다.
 *
 * 캐시를 걸지 않는다 — 매장 수가 적고, 바뀌는 계기가 크롤이 아니라 **관리자의 승인 한 번**이다.
 * 캐시를 걸면 승인 직후 매장주가 자기 페이지 링크를 눌렀을 때 목록에 없는 화면을 본다.
 * 두 질의는 한 왕복으로 묶는다(neon-http 왕복 1회가 220ms — lib/cache 주석과 같은 이유).
 */
export async function listActiveShops(
  q: string | undefined,
  page: number,
): Promise<{ items: ShopPublic[]; total: number; page: number; totalPages: number }> {
  const db = getDb();
  const term = q?.trim();
  // like 앞에 백슬래시를 두면 Neon 드라이버가 먹는다 — 사용자 입력의 %, _ 는 escape 하지 않고
  // 그냥 찾는 말로 쓴다. 매장 이름에 그 글자가 들어가는 일이 드물고, 틀려도 결과가 넓어질 뿐이다
  const where = term
    ? and(eq(shops.status, "active"), sql`(${shops.name} ilike ${"%" + term + "%"} or ${shops.address} ilike ${"%" + term + "%"})`)
    : eq(shops.status, "active");

  const [counted, rows] = await db.batch([
    db.select({ total: sql<number>`count(*)::int` }).from(shops).where(where),
    db
      .select()
      .from(shops)
      .where(where)
      .orderBy(asc(shops.name))
      .limit(SHOPS_PAGE_SIZE)
      .offset((page - 1) * SHOPS_PAGE_SIZE),
  ]);
  const total = counted[0]?.total ?? 0;
  return {
    items: rows.map(toPublic),
    total,
    page,
    totalPages: Math.max(Math.ceil(total / SHOPS_PAGE_SIZE), 1),
  };
}

/**
 * 공개 매장 페이지가 쓰는 조회. 심사 중(pending)은 없는 것으로 본다 —
 * 신청만 하고 주소를 뿌리면 승인 전에 매장 페이지가 도는 길이 열린다.
 * 정지(suspended)는 보여 주되 화면이 쉬는 중이라고 말한다(설계서 §3 — 행을 지우지 않는다).
 */
export async function findPublicShopBySlug(
  slug: string,
): Promise<{ shopId: string; shop: ShopPublic; suspended: boolean } | null> {
  const row = await findShopBySlug(slug);
  if (!row || row.status === "pending") return null;
  // id 는 ShopPublic 에 넣지 않고 따로 돌려준다 — 화면이 아니라 다음 질의(판매 목록)가 쓰는 값이다
  return { shopId: row.id, shop: toPublic(row), suspended: row.status === "suspended" };
}
