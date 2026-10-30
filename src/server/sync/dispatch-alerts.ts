// 할인 알림 발송 — 설계서 §7. run-source 가 감지한 가격 변동 목록을 받아 조건에 맞는 price_alerts 에 웹푸시 또는 이메일.
// 받는 방법(channel)이 이메일인데 메일 수단이 안 켜져 있으면 웹푸시로 대신 보낸다(schema 의 channel 주석).
// 알림함(notifications)에는 늘 먼저 적고, 메일이나 웹푸시는 받을 수단이 있을 때만 덧붙인다.
// 조건: is_active AND game_id 일치 AND (platform 일치 또는 null) AND 직전 스냅샷 대비 가격 하락
//   AND (discountPct >= minDiscountPct 또는 원화 값 <= targetPrice). 목표가는 2026-10-07 에 붙었다(lib/alerts/condition).
// SQL 로 후보를 좁힌 뒤 같은 판정 함수(meetsCondition)로 한 번 더 거른다 — 화면의 "지금 조건에 맞아요" 와 발송이 갈리지 않게.
import { and, eq, or, isNull, isNotNull } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { alertDeliveries, gamePlatforms, games, notifications, priceAlerts, users } from "@/server/db/schema";
import { NOTIFICATION_MESSAGES } from "@/lib/notifications/messages";
import { mailConfigured, sendMail } from "@/server/mail/send";
import { SITE } from "@/lib/site";
import { markOnce } from "@/server/redis";
import { pushToUser } from "./push-to-user";
import { formatPrice } from "@/lib/currency";
import { meetsCondition } from "@/lib/alerts/condition";
import { alertPayload } from "@/lib/alerts/payload";

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
  /** 알림함에 적은 수 — 푸시 구독이 없어도 센다 */
  inboxed: number;
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
  const summary: DispatchSummary = { changes: changes.length, drops: 0, alertsMatched: 0, deduped: 0, inboxed: 0, sent: 0, failed: 0, removedSubscriptions: 0 };
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
    // 제목과 본문은 가격 알림 화면의 미리보기와 같은 함수로 짓는다(lib/alerts/payload)
    const payload = {
      ...alertPayload({ gameTitle: title, platform: gp.platform, price: change.newPrice, currency: gp.currency, discountPct }),
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

      // 알림함(헤더 종)에도 한 줄 남긴다 — 푸시를 못 받은 기기에서도 사이트 안에서 다시 읽힌다.
      // services/notifications 를 부르지 않고 바로 넣는 이유: 그 파일은 세션(쿠키)을 읽어서 수집 실행(tsx)에서 import 할 수 없다
      // 알림함이 1차 전달 수단이다 — 푸시를 꺼 둔 사람도 여기로 받으니, 적은 순간 발송 기록(alert_deliveries)을 찍는다.
      // 안 찍으면 알림 화면이 "조건 충족 1, 보낸 알림 0" 으로 남는다. 푸시, 메일은 이 위에 덧붙는다
      const inboxed = await db
        .insert(notifications)
        .values({ userId: alert.userId, kind: "price_drop", body: NOTIFICATION_MESSAGES.priceDrop(title, formatPrice(change.newPrice, gp.currency)), link: payload.url, createdSource: "cron:alerts", updatedSource: "cron:alerts" })
        .then(() => true)
        .catch((e) => {
          console.warn(`[alerts] 알림함 기록 실패 (alert=${alert.id}): ${e instanceof Error ? e.message : e}`);
          return false;
        });
      if (inboxed) {
        summary.inboxed++;
        await db.insert(alertDeliveries).values({ alertId: alert.id, snapshotId: change.snapshotId }).onConflictDoNothing();
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

      const pushed = await pushToUser(alert.userId, payload, `alerts:${alert.id}`);
      summary.sent += pushed.sent;
      summary.failed += pushed.failed;
      summary.removedSubscriptions += pushed.removed;
      if (pushed.attempted) {
        await db.insert(alertDeliveries).values({ alertId: alert.id, snapshotId: change.snapshotId }).onConflictDoNothing();
      }
    }
  }
  return summary;
}
