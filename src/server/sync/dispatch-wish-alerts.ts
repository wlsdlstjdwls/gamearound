// 찜한 게임 할인 알림(2026-10-30, 사용자: "찜해도 알림 오도록"). 목표가 알림(dispatch-alerts)과 같은 가격 변동 목록을 받는다.
//
// 찜이 곧 "할인하면 알려 줘" 다. 조건은 따로 받지 않는다 — 할인 딱지가 붙은 하락만 알린다(lib/alerts/wish-sale).
// 금액, 할인율을 고르고 싶은 사람은 그 게임에 가격 알림을 건다. 그러면 이쪽은 그 사람에게 그 게임을 보내지 않는다 —
// 같은 하락에 두 통이 오면 "왜 두 번 오지" 가 되고, 조건을 건 사람은 조건이 맞을 때만 받길 원한 것이다.
//
// 한국 행, 원화 값만 본다. 다른 나라 값은 상세에서 참고로만 보여 주는 값이라 그걸로 "할인했어요" 를 보내면 살 수 없는 값을 알린다.
// 받는 길은 알림함 + 웹푸시다. 메일은 목표가 알림의 받는 방법(channel)에만 있다 — 찜에는 고를 칸이 없다.
//
// 중복: 한 사람, 한 게임에 할인 시작은 7일에 한 번(세일 동안 값이 몇 번 내려도, 여러 스토어가 한꺼번에 내려도 한 통).
// 기록상 최저가는 그 값마다 한 번 — 세일 중에 더 내려 최저를 새로 찍으면 한 번 더 알 가치가 있다.
import { and, eq, inArray, isNull, min, ne, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { createdBy } from "@/server/db/audit";
import { gamePlatforms, games, HOME_REGION, notifications, priceAlerts, priceSnapshots, users, wishlists } from "@/server/db/schema";
import { DISPLAY_CURRENCY, formatPrice } from "@/lib/currency";
import { NOTIFICATION_MESSAGES as M } from "@/lib/notifications/messages";
import { alertPayload } from "@/lib/alerts/payload";
import { wishSaleReason, type WishSaleReason } from "@/lib/alerts/wish-sale";
import { gamePath } from "@/lib/routes";
import { markOnce } from "@/server/redis";
import type { PriceChange } from "./dispatch-alerts";
import { pushToUser } from "./push-to-user";
import { WISH_SALE_DEDUPE_TTL_SEC } from "./constants";

const SOURCE = "cron:wish-alerts" as const;

export type WishDispatchSummary = { candidates: number; recipients: number; deduped: number; inboxed: number; sent: number; failed: number };

function dedupeKey(reason: WishSaleReason, userId: string, gameId: string, price: number): string {
  return reason === "sale" ? `wishsale:${userId}:${gameId}` : `wishlow:${userId}:${gameId}:${price}`;
}

export async function dispatchWishSaleAlerts(changes: PriceChange[]): Promise<WishDispatchSummary> {
  const summary: WishDispatchSummary = { candidates: 0, recipients: 0, deduped: 0, inboxed: 0, sent: 0, failed: 0 };
  const drops = changes.filter((c) => c.previousPrice !== null && c.newPrice < c.previousPrice);
  if (drops.length === 0) return summary;
  const db = getDb();

  // 바뀐 행 정보를 한 번에 — 변동마다 묻으면 Neon 왕복이 변동 수만큼 줄을 선다
  const rows = await db
    .select({
      id: gamePlatforms.id,
      gameId: gamePlatforms.gameId,
      platform: gamePlatforms.platform,
      currency: gamePlatforms.currency,
      discountPct: gamePlatforms.discountPct,
      slug: games.slug,
      title: sql<string>`coalesce(${games.titleKo}, ${games.titleEn})`,
    })
    .from(gamePlatforms)
    .innerJoin(games, eq(games.id, gamePlatforms.gameId))
    .where(and(inArray(gamePlatforms.id, drops.map((d) => d.gamePlatformId)), eq(gamePlatforms.region, HOME_REGION), eq(gamePlatforms.currency, DISPLAY_CURRENCY)));
  const byId = new Map(rows.map((r) => [r.id, r]));

  for (const change of drops) {
    const gp = byId.get(change.gamePlatformId);
    if (!gp) continue;
    const discountPct = gp.discountPct ?? 0;
    // 할인 딱지가 없으면 최저가를 묻지도 않는다 — 판정이 어차피 null 이다
    if (discountPct <= 0) continue;

    const [low] = await db
      .select({ v: min(priceSnapshots.price) })
      .from(priceSnapshots)
      // 0 은 값을 못 읽은 회차다(ps-zero-price-snapshots) — 최저가로 세면 어떤 값도 기록을 못 깬다
      .where(and(eq(priceSnapshots.gamePlatformId, gp.id), ne(priceSnapshots.id, change.snapshotId), sql`${priceSnapshots.price} > 0`));
    const reason = wishSaleReason({ previousPrice: change.previousPrice, newPrice: change.newPrice, discountPct, priorLowest: low?.v ?? null });
    if (!reason) continue;
    summary.candidates++;

    // 찜한 사람 중 끄지 않았고, 이 게임에 켜진 가격 알림이 없는 사람
    const recipients = await db
      .select({ userId: wishlists.userId })
      .from(wishlists)
      .innerJoin(users, eq(users.id, wishlists.userId))
      .where(
        and(
          eq(wishlists.gameId, gp.gameId),
          isNull(users.wishSaleAlertsOffAt),
          sql`not exists (select 1 from ${priceAlerts} where ${priceAlerts.userId} = ${wishlists.userId} and ${priceAlerts.gameId} = ${gp.gameId} and ${priceAlerts.isActive})`,
        ),
      );
    if (recipients.length === 0) continue;

    const priceText = formatPrice(change.newPrice, gp.currency);
    const body = reason === "recordLow" ? M.wishRecordLow(gp.title, priceText) : M.wishSale(gp.title, priceText, discountPct);
    const link = gamePath(gp.slug);
    const push = { ...alertPayload({ gameTitle: gp.title, platform: gp.platform, price: change.newPrice, currency: gp.currency, discountPct }), url: link, tag: `wish:${gp.gameId}` };

    for (const { userId } of recipients) {
      if (!(await markOnce(dedupeKey(reason, userId, gp.gameId, change.newPrice), WISH_SALE_DEDUPE_TTL_SEC))) {
        summary.deduped++;
        continue;
      }
      summary.recipients++;
      // 알림함이 1차 전달 수단이다(dispatch-alerts 와 같다) — 푸시를 꺼 둔 사람도 사이트 안에서 받는다
      const inboxed = await db
        .insert(notifications)
        .values({ userId, kind: "price_drop", body, link, ...createdBy(SOURCE) })
        .then(() => true)
        .catch((e) => {
          console.warn(`[wish-alerts] 알림함 기록 실패 (user=${userId}): ${e instanceof Error ? e.message : e}`);
          return false;
        });
      if (inboxed) summary.inboxed++;
      const pushed = await pushToUser(userId, push, "wish-alerts");
      summary.sent += pushed.sent;
      summary.failed += pushed.failed;
    }
  }
  return summary;
}
