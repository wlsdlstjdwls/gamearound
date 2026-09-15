// 가격 알림 서비스 (§7). Next.js는 조건 저장만 담당하고 발송은 크롤러(GH Actions)가 수행.
// 모든 변경 함수는 requireUser() 후 userId 일치(소유자) 조건을 WHERE에 포함한다.
import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { games, priceAlerts, type Platform } from "@/server/db/schema";
import { requireUser } from "@/server/services/users";
import { ownedByCurrentSession } from "@/server/auth/session";
import { AUTH_MESSAGES } from "@/lib/auth/messages";

export type AlertRow = typeof priceAlerts.$inferSelect;
export type AlertWithGame = AlertRow & { game: { id: string; slug: string; titleKo: string | null; titleEn: string; coverUrl: string | null } };

export type CreateAlertInput = { gameId: string; platform: Platform | null; minDiscountPct: number };
export type UpdateAlertPatch = Partial<{ platform: Platform | null; minDiscountPct: number; isActive: boolean }>;

/** 알림 폼 상단에 표시할 게임을 slug로 조회. 없으면 null */
export async function findGameBySlug(slug: string) {
  return getDb().query.games.findFirst({
    where: eq(games.slug, slug),
    columns: { id: true, slug: true, titleKo: true, titleEn: true, coverUrl: true },
  });
}

/**
 * 내 알림 목록(게임 정보 포함). 활성 우선, 그 다음 최근 생성 순은 id 정렬로 대체.
 *
 * 읽기 전용이라 requireUser() 대신 세션 서브질의로 소유자를 건다 — 세션 조회를 기다렸다가
 * 목록을 묻는 왕복 2회가 1회로 준다. 근거는 currentUserIdSql 주석.
 * 변경 함수(create/update/delete)는 그대로 requireUser() 를 쓴다. 액션은 화면 지연이 아니고,
 * "누가 고쳤는가" 를 사람이 읽을 수 있는 형태로 남기는 편이 낫다.
 */
export async function listAlerts(): Promise<AlertWithGame[]> {
  const owner = await ownedByCurrentSession(priceAlerts.userId);
  if (!owner) throw new Error(AUTH_MESSAGES.loginRequired);
  const rows = await getDb().query.priceAlerts.findMany({
    where: owner,
    orderBy: [desc(priceAlerts.isActive), desc(priceAlerts.id)],
    with: { game: { columns: { id: true, slug: true, titleKo: true, titleEn: true, coverUrl: true } } },
  });
  return rows;
}

export async function createAlert(input: CreateAlertInput): Promise<AlertRow> {
  const u = await requireUser();
  const db = getDb();
  const game = await db.query.games.findFirst({ where: eq(games.id, input.gameId), columns: { id: true } });
  if (!game) throw new Error("존재하지 않는 게임입니다");
  // 같은 게임, 플랫폼 조건이 이미 있으면 새로 만들지 않고 조건만 갱신(중복 알림 방지)
  const existing = await db.query.priceAlerts.findFirst({
    where: and(
      eq(priceAlerts.userId, u.id),
      eq(priceAlerts.gameId, input.gameId),
      input.platform === null ? isNull(priceAlerts.platform) : eq(priceAlerts.platform, input.platform),
    ),
  });
  if (existing) {
    const [row] = await db
      .update(priceAlerts)
      .set({ minDiscountPct: input.minDiscountPct, isActive: true })
      .where(and(eq(priceAlerts.id, existing.id), eq(priceAlerts.userId, u.id)))
      .returning();
    return row;
  }
  const [row] = await db
    .insert(priceAlerts)
    .values({ userId: u.id, gameId: input.gameId, platform: input.platform, minDiscountPct: input.minDiscountPct, isActive: true })
    .returning();
  return row;
}

export async function updateAlert(id: string, patch: UpdateAlertPatch): Promise<AlertRow> {
  const u = await requireUser();
  const [row] = await getDb()
    .update(priceAlerts)
    .set(patch)
    .where(and(eq(priceAlerts.id, id), eq(priceAlerts.userId, u.id)))
    .returning();
  if (!row) throw new Error("알림을 찾을 수 없거나 권한이 없습니다");
  return row;
}

export async function deleteAlert(id: string): Promise<void> {
  const u = await requireUser();
  const deleted = await getDb()
    .delete(priceAlerts)
    .where(and(eq(priceAlerts.id, id), eq(priceAlerts.userId, u.id)))
    .returning({ id: priceAlerts.id });
  if (deleted.length === 0) throw new Error("알림을 찾을 수 없거나 권한이 없습니다");
}

/** 활성/비활성 토글. 결과 상태 반환 */
export async function toggleAlert(id: string): Promise<{ isActive: boolean }> {
  const u = await requireUser();
  const db = getDb();
  const current = await db.query.priceAlerts.findFirst({
    where: and(eq(priceAlerts.id, id), eq(priceAlerts.userId, u.id)),
    columns: { id: true, isActive: true },
  });
  if (!current) throw new Error("알림을 찾을 수 없거나 권한이 없습니다");
  const [row] = await db
    .update(priceAlerts)
    .set({ isActive: !current.isActive })
    .where(and(eq(priceAlerts.id, id), eq(priceAlerts.userId, u.id)))
    .returning({ isActive: priceAlerts.isActive });
  return { isActive: row.isActive };
}
