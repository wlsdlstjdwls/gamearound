// 할인 알림 발송 — 설계서 §7. run-source 가 감지한 가격 변동 목록을 받아 조건에 맞는 price_alerts 에 웹푸시 또는 이메일.
// 받는 방법(channel)이 이메일인데 메일 수단이 안 켜져 있으면 웹푸시로 대신 보낸다(schema 의 channel 주석).
// 조건: is_active AND game_id 일치 AND (platform 일치 또는 null) AND 직전 스냅샷 대비 가격 하락
//   AND (discountPct >= minDiscountPct 또는 원화 값 <= targetPrice). 목표가는 2026-10-07 에 붙었다(lib/alerts/condition).
// SQL 로 후보를 좁힌 뒤 같은 판정 함수(meetsCondition)로 한 번 더 거른다 — 화면의 "지금 조건에 맞아요" 와 발송이 갈리지 않게.
import { and, eq, or, isNull, isNotNull } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { alertDeliveries, gamePlatforms, games, priceAlerts, pushSubscriptions, users } from "@/server/db/schema";
import { mailConfigured, sendMail } from "@/server/mail/send";
import { SITE } from "@/lib/site";
import { markOnce } from "@/server/redis";
import { sendPush } from "@/server/push/webpush";
import { PLATFORM_LABEL } from "@/lib/format";
import { formatPrice } from "@/lib/currency";
import { meetsCondition } from "@/lib/alerts/condition";

/** 메일 본문에 게임 제목(스토어가 준 문자열)을 넣으므로 태그로 읽히지 않게 막는다 */
function escapeHtml(v: string): string {
  return v.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** run-source → dispatch 로 넘기는 변동 1건 */
export interface PriceChange {
  gamePlatformId: string;
  snapshotId: number;
  previousPrice: number | null; // 직전 스냅샷(또는 직전 current_price)
  newPrice: number;
}

export interface DispatchSummary {
  changes: number;
  drops: number;
  alertsMatched: number;
  deduped: number;
  sent: number;
  failed: number;
  removedSubscriptions: number;
}

const DEDUPE_TTL_SEC = 7 * 24 * 60 * 60; // 7d

/** 직전 대비 하락인지 (§7). 순수 함수 */
export function isPriceDrop(previousPrice: number | null, newPrice: number): boolean {
  return previousPrice !== null && newPrice < previousPrice;
}

export async function dispatchPriceAlerts(changes: PriceChange[]): Promise<DispatchSummary> {
  const summary: DispatchSummary = { changes: changes.length, drops: 0, alertsMatched: 0, deduped: 0, sent: 0, failed: 0, removedSubscriptions: 0 };
  if (changes.length === 0) return summary;
  const db = getDb();

  for (const change of changes) {
    if (!isPriceDrop(change.previousPrice, change.newPrice)) continue;
    summary.drops++;

    const [gp] = await db
      .select({
        id: gamePlatforms.id,
        gameId: gamePlatforms.gameId,
        platform: gamePlatforms.platform,
        currentPrice: gamePlatforms.currentPrice,
        currency: gamePlatforms.currency,
        discountPct: gamePlatforms.discountPct,
        slug: games.slug,
        titleKo: games.titleKo,
        titleEn: games.titleEn,
      })
      .from(gamePlatforms)
      .innerJoin(games, eq(games.id, gamePlatforms.gameId))
      .where(eq(gamePlatforms.id, change.gamePlatformId));
    if (!gp) continue;

    const discountPct = gp.discountPct ?? 0;
    const alerts = await db
      .select()
      .from(priceAlerts)
      .where(
        and(
          eq(priceAlerts.gameId, gp.gameId),
          eq(priceAlerts.isActive, true),
          or(isNull(priceAlerts.platform), eq(priceAlerts.platform, gp.platform)),
          or(isNotNull(priceAlerts.minDiscountPct), isNotNull(priceAlerts.targetPrice)),
        ),
      )
      .then((list) =>
        list.filter((a) =>
          meetsCondition(
            { minDiscountPct: a.minDiscountPct, targetPrice: a.targetPrice },
            { platform: gp.platform, currentPrice: change.newPrice, currency: gp.currency, discountPct },
          ),
        ),
      );
    summary.alertsMatched += alerts.length;
    if (alerts.length === 0) continue;

    const title = gp.titleKo ?? gp.titleEn;
    const payload = {
      title: discountPct > 0 ? `${title} 할인 중` : `${title} 가격이 내려갔어요`,
      body: `${PLATFORM_LABEL[gp.platform] ?? gp.platform} ${formatPrice(change.newPrice, gp.currency)}${discountPct > 0 ? ` (${discountPct}% 할인)` : ""}`,
      url: `/games/${gp.slug}`,
      tag: `price:${gp.id}`,
    };

    for (const alert of alerts) {
      // 7일 중복 방지 (alert × snapshot)
      const fresh = await markOnce(`dedupe:${alert.id}:${change.snapshotId}`, DEDUPE_TTL_SEC);
      if (!fresh) {
        summary.deduped++;
        continue;
      }

      if (alert.channel === "email" && mailConfigured()) {
        const [u] = await db.select({ email: users.email }).from(users).where(eq(users.id, alert.userId));
        if (u) {
          try {
            const link = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}${payload.url}`;
            await sendMail({ to: u.email, subject: `[${SITE.name}] ${payload.title}`, text: `${payload.body}\n${link}`, html: `<p>${escapeHtml(payload.body)}</p><p><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p>` });
            summary.sent++;
            await db.insert(alertDeliveries).values({ alertId: alert.id, snapshotId: change.snapshotId }).onConflictDoNothing();
          } catch (e) {
            summary.failed++;
            console.warn(`[alerts] 메일 실패 (alert=${alert.id}): ${e instanceof Error ? e.message : e}`);
          }
          continue;
        }
      }

      const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, alert.userId));
      let attempted = false;
      for (const sub of subs) {
        attempted = true;
        const res = await sendPush(sub, payload);
        if (res.ok) {
          summary.sent++;
        } else {
          summary.failed++;
          if (res.gone) {
            await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
            summary.removedSubscriptions++;
          } else {
            console.warn(`[alerts] push 실패 (alert=${alert.id}, status=${res.statusCode}): ${res.error}`);
          }
        }
      }
      if (attempted) {
        await db.insert(alertDeliveries).values({ alertId: alert.id, snapshotId: change.snapshotId }).onConflictDoNothing();
      }
    }
  }
  return summary;
}
