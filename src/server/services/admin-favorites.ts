// 관리자 메뉴 즐겨찾기 읽기, 쓰기(schema-admin 의 admin_favorites 주석).
//
// 돌려주는 것은 주소 목록뿐이다 — 이름표와 그림은 메뉴 표(admin-nav-items)가 가진다. 행을 그대로 넘기면
// 메뉴 이름이 바뀔 때 DB 와 화면이 다른 말을 하게 된다.
// 쓰기는 결과 목록을 다시 읽어 돌려주지 않는다. 화면이 누른 순간 먼저 바꾸고(AGENTS §6) 실패할 때만 되돌리므로,
// 다시 읽는 왕복(Neon 1회)은 성공 때마다 버려진다.
import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { createdBy } from "@/server/db/audit";
import { adminFavorites } from "@/server/db/schema";

/** 이 관리자의 즐겨찾기 주소, 추가한 차례대로 */
export async function listAdminFavorites(userId: string): Promise<string[]> {
  const rows = await getDb()
    .select({ href: adminFavorites.href })
    .from(adminFavorites)
    .where(eq(adminFavorites.userId, userId))
    .orderBy(asc(adminFavorites.sortOrder), asc(adminFavorites.createdAt));
  return rows.map((r) => r.href);
}

/**
 * 켜거나 끈다. 이미 그 상태면 아무 일도 없다(같은 단추를 두 번 눌러 요청이 겹쳐도 결과가 같다).
 * 순서 번호는 지금 끝 번호 + 1 을 한 문장 안에서 매긴다 — 읽고 쓰는 왕복을 둘로 나누지 않는다.
 */
export async function setAdminFavorite(userId: string, href: string, on: boolean): Promise<void> {
  const db = getDb();
  if (!on) {
    await db.delete(adminFavorites).where(and(eq(adminFavorites.userId, userId), eq(adminFavorites.href, href)));
    return;
  }
  await db
    .insert(adminFavorites)
    .values({
      userId,
      href,
      // 바인딩 값은 text 로 추론될 수 있어 uuid 로 못 박는다(sql-param-type-cast)
      sortOrder: sql`(select coalesce(max(${adminFavorites.sortOrder}), 0) + 1 from ${adminFavorites} where ${adminFavorites.userId} = ${userId}::uuid)`,
      ...createdBy("admin", userId),
    })
    .onConflictDoNothing();
}
