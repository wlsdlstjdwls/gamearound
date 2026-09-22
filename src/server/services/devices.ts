// 내 기기 서비스 — 설계 문서 §4. route(page/action)는 이 파일로만 들어온다.
//
// 비회원의 기기는 여기 없다. 브라우저에 두고 판정도 브라우저에서 한다(components/compat-section) —
// 로그인을 요구하면 이 기능을 아무도 안 쓴다는 것이 설계의 전제다.
// 그래서 이 서비스는 "로그인한 사람이 여러 대를 관리하는" 쪽만 맡는다.
import { cache } from "react";
import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { userDevices, type OsFamily } from "@/server/db/schema";
import { requireUser } from "@/server/services/users";
import { createdBy, updatedBy } from "@/server/db/audit";
import { DEVICE_LIMIT } from "@/lib/hardware/device-schemas";

/** 화면이 받는 기기 한 대. DB 행을 그대로 흘리지 않는다 */
export type DeviceDto = {
  id: string;
  label: string;
  osFamily: OsFamily;
  cpuModelKey: string | null;
  gpuModelKey: string | null;
  ramMb: number | null;
  storageFreeMb: number | null;
  isPrimary: boolean;
};

export type DeviceInput = Omit<DeviceDto, "id" | "isPrimary"> & { isPrimary?: boolean };

function toDto(r: typeof userDevices.$inferSelect): DeviceDto {
  return {
    id: r.id,
    label: r.label,
    osFamily: r.osFamily,
    cpuModelKey: r.cpuModelKey,
    gpuModelKey: r.gpuModelKey,
    ramMb: r.ramMb,
    storageFreeMb: r.storageFreeMb,
    isPrimary: r.isPrimary,
  };
}

/**
 * 내 기기 목록. 기본 기기가 먼저, 그다음 만든 순이다 — 화면이 첫 줄을 그대로 골라도 맞는 순서.
 *
 * 요청 하나 안에서 캐시한다(2026-09-22). 같은 화면이 이 목록을 두 자리에서 읽는 일이 실제로 있었고
 * (그때는 Neon 왕복 220ms 가 두 번이었다), 지금은 한 자리지만 캐시를 도로 걷지 않는다 —
 * 읽는 자리가 느는 것은 흔하고, 이 감쌈은 비용이 없다. getCurrentUser 와 같은 방식이다.
 */
export const listMyDevices = cache(async (): Promise<DeviceDto[]> => {
  const u = await requireUser();
  const rows = await getDb()
    .select()
    .from(userDevices)
    .where(eq(userDevices.userId, u.id))
    .orderBy(desc(userDevices.isPrimary), asc(userDevices.createdAt));
  return rows.map(toDto);
});

/**
 * 기기를 더한다. 첫 기기는 자동으로 기본 기기다 — 한 대뿐인데 "기본으로 지정" 을 누르게 하지 않는다.
 * 상한을 두는 이유는 화면이다: 기기가 열 대를 넘으면 고르는 일 자체가 일이 된다.
 */
export async function addDevice(input: DeviceInput): Promise<DeviceDto> {
  const u = await requireUser();
  const db = getDb();
  const mine = await db.select({ id: userDevices.id }).from(userDevices).where(eq(userDevices.userId, u.id));
  if (mine.length >= DEVICE_LIMIT) throw new Error(`기기는 ${DEVICE_LIMIT}대까지 등록할 수 있어요.`);

  const isPrimary = input.isPrimary ?? mine.length === 0;
  if (isPrimary) await clearPrimary(u.id);
  const [row] = await db
    .insert(userDevices)
    .values({ userId: u.id, ...input, isPrimary, ...createdBy("user", u.id) })
    .returning();
  return toDto(row);
}

/** 기기를 고친다. 소유자 조건이 WHERE 에 있어 남의 행은 건드릴 수 없다(wishlist 와 같은 규칙) */
export async function updateDevice(id: string, input: DeviceInput): Promise<void> {
  const u = await requireUser();
  const db = getDb();
  if (input.isPrimary) await clearPrimary(u.id);
  await db
    .update(userDevices)
    .set({ ...input, isPrimary: input.isPrimary ?? false, ...updatedBy("user", u.id) })
    .where(and(eq(userDevices.id, id), eq(userDevices.userId, u.id)));
}

export async function deleteDevice(id: string): Promise<void> {
  const u = await requireUser();
  await getDb().delete(userDevices).where(and(eq(userDevices.id, id), eq(userDevices.userId, u.id)));
}

/** 기본 기기를 이 기기로 옮긴다 */
export async function setPrimaryDevice(id: string): Promise<void> {
  const u = await requireUser();
  await clearPrimary(u.id);
  await getDb()
    .update(userDevices)
    .set({ isPrimary: true, ...updatedBy("user", u.id) })
    .where(and(eq(userDevices.id, id), eq(userDevices.userId, u.id)));
}

/** 기본 기기는 한 대뿐이다. 새로 지정하기 전에 기존 것을 내린다 */
async function clearPrimary(userId: string): Promise<void> {
  await getDb()
    .update(userDevices)
    .set({ isPrimary: false, ...updatedBy("user", userId) })
    .where(and(eq(userDevices.userId, userId), eq(userDevices.isPrimary, true)));
}
