// 가격 알림 서비스 (§7). Next.js는 조건 저장만 담당하고 발송은 크롤러(GH Actions)가 수행.
// 모든 변경 함수는 requireUser() 후 userId 일치(소유자) 조건을 WHERE에 포함한다.
import { and, desc, eq, inArray, isNull, max, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { alertDeliveries, gamePlatforms, games, HOME_REGION, priceAlerts, type Platform } from "@/server/db/schema";
import { visiblePlatformsOnly } from "@/server/db/visibility";
import { alertStatus, type AlertStatus } from "@/lib/alerts/condition";
import { requireUser } from "@/server/services/users";
import { ownedByCurrentSession } from "@/server/auth/session";
import { AUTH_MESSAGES } from "@/lib/auth/messages";

export type AlertRow = typeof priceAlerts.$inferSelect;
export type AlertWithGame = AlertRow & { game: { id: string; slug: string; titleKo: string | null; titleEn: string; coverUrl: string | null } };

/** 조건은 둘 중 하나만 채운다(schema 의 targetPrice 주석) */
export type CreateAlertInput = { gameId: string; platform: Platform | null; minDiscountPct: number | null; targetPrice: number | null };
export type UpdateAlertPatch = Partial<{ platform: Platform | null; minDiscountPct: number | null; targetPrice: number | null; isActive: boolean }>;

/**
 * 목록 화면이 받는 알림 한 줄(2026-10-07 고도화). 행 타입을 그대로 흘리지 않는다(규약 §1) —
 * 지금 가격 상태와 마지막 발송 시각은 다른 테이블에서 와서 화면이 한 덩어리로 받아야 한다.
 */
export type AlertView = {
  id: string;
  platform: Platform | null;
  minDiscountPct: number | null;
  targetPrice: number | null;
  isActive: boolean;
  /** id 와 options 는 목록의 "수정" 이 가격 알림 팝업(M-02)을 다시 열 때 쓴다(기획서 S-26 "수정(M-02 재오픈)") */
  game: { id: string; slug: string; title: string; coverUrl: string | null };
  /** 그 게임을 파는 플랫폼과 지금 값 — 팝업이 플랫폼마다 현재가를 적는다 */
  options: Array<{ platform: Platform; currentPrice: number | null; currency: (typeof gamePlatforms.$inferSelect)["currency"] }>;
  status: AlertStatus;
  lastSentAt: Date | null;
};

/** 목록 머리의 숫자 셋. "최근" 은 발송 중복 방지 창(7일)과 같은 거리다 — 그 안이 "요즘 받은 알림" 이다 */
export type AlertsOverview = { views: AlertView[]; active: number; metNow: number; sentRecent: number };
export const ALERT_RECENT_DAYS = 7;

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

/**
 * 내 알림 + 지금 상태. 알림을 먼저 받고(소유자 서브질의 한 왕복), 그 게임들의 가격 행과 발송 기록을
 * **나란히** 받는다 — 줄 세우면 왕복이 셋이 된다.
 * 가격 행은 한국 지역, 보이는 플랫폼만 본다(목록, 상세와 같은 기준).
 */
export async function listAlertViews(): Promise<AlertsOverview> {
  const alerts = await listAlerts();
  if (alerts.length === 0) return { views: [], active: 0, metNow: 0, sentRecent: 0 };
  const db = getDb();
  const gameIds = [...new Set(alerts.map((a) => a.gameId))];
  const alertIds = alerts.map((a) => a.id);
  const [rows, sent] = await Promise.all([
    db
      .select({
        gameId: gamePlatforms.gameId,
        platform: gamePlatforms.platform,
        currentPrice: gamePlatforms.currentPrice,
        currency: gamePlatforms.currency,
        discountPct: gamePlatforms.discountPct,
      })
      .from(gamePlatforms)
      .where(and(inArray(gamePlatforms.gameId, gameIds), eq(gamePlatforms.region, HOME_REGION), visiblePlatformsOnly())),
    db
      .select({
        alertId: alertDeliveries.alertId,
        last: max(alertDeliveries.sentAt),
        // ::int — 자리표시자 값은 타입이 없어 make_interval 인자를 못 고른다(출시예정의 date + $1 과 같은 함정)
        recent: sql<number>`count(*) filter (where ${alertDeliveries.sentAt} >= now() - make_interval(days => ${ALERT_RECENT_DAYS}::int))::int`,
      })
      .from(alertDeliveries)
      .where(inArray(alertDeliveries.alertId, alertIds))
      .groupBy(alertDeliveries.alertId),
  ]);
  const lastBy = new Map(sent.map((r) => [r.alertId, r.last]));

  const views = alerts.map<AlertView>((a) => ({
    id: a.id,
    platform: a.platform,
    minDiscountPct: a.minDiscountPct,
    targetPrice: a.targetPrice,
    isActive: a.isActive,
    game: { id: a.game.id, slug: a.game.slug, title: a.game.titleKo ?? a.game.titleEn, coverUrl: a.game.coverUrl },
    options: rows.filter((r) => r.gameId === a.gameId).map((r) => ({ platform: r.platform, currentPrice: r.currentPrice, currency: r.currency })),
    status: alertStatus(
      { minDiscountPct: a.minDiscountPct, targetPrice: a.targetPrice },
      rows.filter((r) => r.gameId === a.gameId),
      a.platform,
    ),
    lastSentAt: lastBy.get(a.id) ?? null,
  }));
  return {
    views,
    active: views.filter((v) => v.isActive).length,
    metNow: views.filter((v) => v.isActive && v.status.met).length,
    sentRecent: sent.reduce((n, r) => n + Number(r.recent), 0),
  };
}

/** 이 게임에 이미 만든 알림(가장 최근 하나). 폼을 그 값으로 채워 "조건 바꾸기" 가 된다 */
export async function findMyAlertForGame(gameId: string): Promise<AlertRow | null> {
  const u = await requireUser();
  const row = await getDb().query.priceAlerts.findFirst({
    where: and(eq(priceAlerts.userId, u.id), eq(priceAlerts.gameId, gameId)),
    orderBy: [desc(priceAlerts.isActive), desc(priceAlerts.id)],
  });
  return row ?? null;
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
      .set({ minDiscountPct: input.minDiscountPct, targetPrice: input.targetPrice, isActive: true })
      .where(and(eq(priceAlerts.id, existing.id), eq(priceAlerts.userId, u.id)))
      .returning();
    return row;
  }
  const [row] = await db
    .insert(priceAlerts)
    .values({ userId: u.id, gameId: input.gameId, platform: input.platform, minDiscountPct: input.minDiscountPct, targetPrice: input.targetPrice, isActive: true })
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

/** 상세 화면 알림 팝업(M-02)이 채울 값 — 이 게임에 걸린 내 알림의 플랫폼과 받는 방법 */
export type GameAlertSetting = { platforms: Platform[]; channel: AlertChannel; active: boolean };
export type AlertChannel = (typeof priceAlerts.$inferSelect)["channel"];

/**
 * 이 게임에 걸린 내 알림을 팝업 모양으로 접는다. 플랫폼 없는 행(옛 "모든 플랫폼")은 지금 파는 플랫폼 전부로 편다 —
 * 팝업은 플랫폼을 하나하나 고르는 모양이라 "전부" 를 따로 그릴 칸이 없다.
 */
export async function getMyGameAlert(gameId: string, allPlatforms: Platform[]): Promise<GameAlertSetting | null> {
  const u = await requireUser();
  const rows = await getDb().query.priceAlerts.findMany({
    where: and(eq(priceAlerts.userId, u.id), eq(priceAlerts.gameId, gameId), eq(priceAlerts.isActive, true)),
  });
  if (rows.length === 0) return null;
  const set = new Set<Platform>();
  for (const r of rows) for (const p of r.platform === null ? allPlatforms : [r.platform]) set.add(p);
  return { platforms: allPlatforms.filter((p) => set.has(p)), channel: rows[0].channel, active: true };
}

/**
 * 팝업 저장 = 이 게임의 내 알림을 고른 플랫폼 수만큼으로 맞춘다(기획서 v2.0 6.3).
 * 조건은 "가격이 내려가면" 이라 할인 발생(minDiscountPct 1)으로 건다. 목표가, 할인율 같은 세밀한 조건은
 * 알림 화면(/alerts)의 폼이 맡는다 — 이미 그 조건이 걸린 플랫폼은 조건을 건드리지 않고 받는 방법만 바꾼다.
 * 고르지 않은 플랫폼의 행과 옛 "모든 플랫폼" 행은 지운다. 한 왕복으로 끝내려고 트랜잭션 없이 순서만 지킨다 —
 * 중간에 실패해도 남는 것은 "알림이 하나 더 있다" 라 사람이 보고 끌 수 있다.
 */
export async function saveGameAlert(gameId: string, platforms: Platform[], channel: AlertChannel): Promise<void> {
  const u = await requireUser();
  const db = getDb();
  const game = await db.query.games.findFirst({ where: eq(games.id, gameId), columns: { id: true } });
  if (!game) throw new Error("존재하지 않는 게임입니다");
  const rows = await db.query.priceAlerts.findMany({ where: and(eq(priceAlerts.userId, u.id), eq(priceAlerts.gameId, gameId)) });
  const keep = new Set(platforms);
  const stale = rows.filter((r) => r.platform === null || !keep.has(r.platform)).map((r) => r.id);
  if (stale.length > 0) await db.delete(priceAlerts).where(and(eq(priceAlerts.userId, u.id), inArray(priceAlerts.id, stale)));
  for (const platform of platforms) {
    const existing = rows.find((r) => r.platform === platform);
    if (existing) {
      await db.update(priceAlerts).set({ channel, isActive: true }).where(and(eq(priceAlerts.id, existing.id), eq(priceAlerts.userId, u.id)));
    } else {
      await db.insert(priceAlerts).values({ userId: u.id, gameId, platform, minDiscountPct: 1, targetPrice: null, channel, isActive: true });
    }
  }
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
