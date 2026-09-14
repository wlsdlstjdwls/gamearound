// 세대 간 업그레이드의 관리자 입력 — 기획서 F6.
//
// 닌텐도 한국 스토어가 503 이라 Switch 2 Edition 업그레이드를 수집할 수 없다(2026-09-14 재확인).
// 대상 타이틀이 수십 종 규모라 수동 입력으로 먼저 열고, 어댑터는 나중에 같은 테이블을 채운다.
// 그때를 위해 편집할 때마다 data_corrections 에 lock_field 로 기록한다 —
// 어댑터가 붙는 날 크롤러가 사람이 넣은 값을 덮어쓰지 않게 하는 장치다.
import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { dataCorrections, upgrades, type Platform, type UpgradeKind } from "@/server/db/schema";
import { requireAdmin } from "@/server/services/users";

export type UpgradeRow = typeof upgrades.$inferSelect;

/** 이 테이블 이름은 data_corrections.table 값으로도 쓰인다 — sync 의 잠금 조회와 철자가 같아야 한다 */
export const UPGRADES_TABLE = "upgrades";

export async function listUpgrades(gameId: string): Promise<UpgradeRow[]> {
  return getDb().select().from(upgrades).where(eq(upgrades.gameId, gameId));
}

export type UpsertUpgradeInput = {
  gameId: string;
  fromPlatform: Platform;
  toPlatform: Platform;
  kind: UpgradeKind;
  price: number | null;
  storeExternalId: string | null;
  storeUrl: string | null;
  note: string | null;
};

/**
 * 업그레이드 한 건을 넣거나 고친다. (gameId, from, to) 가 같으면 같은 행이다.
 * 무료인데 가격이 들어오면 가격을 버린다 — 화면이 "무료"라고 말하면서 금액을 함께 보여주면 안 된다.
 */
export async function upsertUpgrade(input: UpsertUpgradeInput): Promise<{ created: boolean }> {
  const admin = await requireAdmin();
  const db = getDb();
  if (input.fromPlatform === input.toPlatform) throw new Error("업그레이드 전후 플랫폼이 같습니다");

  const price = input.kind === "paid" ? input.price : null;
  const existing = await db.query.upgrades.findFirst({
    where: and(
      eq(upgrades.gameId, input.gameId),
      eq(upgrades.fromPlatform, input.fromPlatform),
      eq(upgrades.toPlatform, input.toPlatform),
    ),
  });

  const values = {
    gameId: input.gameId,
    fromPlatform: input.fromPlatform,
    toPlatform: input.toPlatform,
    kind: input.kind,
    price,
    storeExternalId: input.storeExternalId,
    storeUrl: input.storeUrl,
    note: input.note,
    updatedAt: new Date(),
  };

  let rowId: string;
  let created: boolean;
  if (existing) {
    await db.update(upgrades).set(values).where(eq(upgrades.id, existing.id));
    rowId = String(existing.id);
    created = false;
  } else {
    const [row] = await db.insert(upgrades).values(values).returning({ id: upgrades.id });
    rowId = String(row.id);
    created = true;
  }

  await db.insert(dataCorrections).values({
    adminUserId: admin.id,
    table: UPGRADES_TABLE,
    rowId,
    field: "kind",
    before: existing ? existing.kind : null,
    after: input.kind,
    lockField: true,
  });
  return { created };
}

/** 잘못 넣은 업그레이드를 지운다. 잠금 기록도 함께 지워 크롤러가 다시 채울 수 있게 한다 */
export async function deleteUpgrade(id: number): Promise<void> {
  await requireAdmin();
  const db = getDb();
  await db.delete(upgrades).where(eq(upgrades.id, id));
  await db
    .delete(dataCorrections)
    .where(and(eq(dataCorrections.table, UPGRADES_TABLE), eq(dataCorrections.rowId, String(id))));
}
