// 할인 알림 발송 — 설계서 §7. run-source 가 감지한 가격 변동 목록을 받아 조건에 맞는 price_alerts 에 웹푸시 또는 이메일.
// 받는 방법(channel)이 이메일인데 메일 수단이 안 켜져 있으면 웹푸시로 대신 보낸다(schema 의 channel 주석).
// 알림함(notifications)에는 늘 먼저 적고, 메일이나 웹푸시는 받을 수단이 있을 때만 덧붙인다.
// 조건: is_active AND game_id 일치 AND (platform 일치 또는 null) AND 직전 스냅샷 대비 가격 하락
//   AND (discountPct >= minDiscountPct 또는 원화 값 <= targetPrice). 목표가는 2026-10-07 에 붙었다(lib/alerts/condition).
// SQL 로 후보를 좁힌 뒤 같은 판정 함수(meetsCondition)로 한 번 더 거른다 — 화면의 "지금 조건에 맞아요" 와 발송이 갈리지 않게.
// 밤(한국 22~08시, lib/notify/quiet-hours)에는 알림함에만 적고 메일, 웹푸시는 보내지 않는다. 받을 길을 알림함 줄(held_channel)에 남겨
// 아침 8시 크론(sync/morning-alerts)이 사람마다 한 통으로 모아 보낸다. 가격 회차가 한국 02, 03시에도 돌아 새벽에 기기가 울리고 있었다.
import { and, eq, or, isNull, isNotNull } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { alertDeliveries, gamePlatforms, games, notifications, priceAlerts, users } from "@/server/db/schema";
import { NOTIFICATION_MESSAGES } from "@/lib/notifications/messages";
import { mailConfigured } from "@/server/mail/send";
import { dispatchSystemMail } from "@/server/notify/mail";
import { pushNotice, webNotice } from "@/server/notify/web";
import { SYSTEM_TEMPLATES } from "@/lib/notify/system-templates";
import { SITE } from "@/lib/site";
import { markOnce } from "@/server/redis";
import { pushToUser } from "@/server/push/to-user";
import { formatPrice } from "@/lib/currency";
import { meetsCondition } from "@/lib/alerts/condition";
import { alertPayload, alertPushCode, alertVars } from "@/lib/alerts/payload";
import { isMemberSendHour } from "@/lib/notify/quiet-hours";

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
  /** 밤이라 메일, 푸시를 아침으로 미룬 수 */
  held: number;
  sent: number;
  failed: number;
  removedSubscriptions: number;
}

const DEDUPE_TTL_SEC = 7 * 24 * 60 * 60; // 7d

/** 직전 대비 하락인지 (§7). 순수 함수 */
export function isPriceDrop(previousPrice: number | null, newPrice: number): boolean {
  return previousPrice !== null && newPrice < previousPrice;
}

export async function dispatchPriceAlerts(changes: PriceChange[], now: Date = new Date()): Promise<DispatchSummary> {
  const summary: DispatchSummary = { changes: changes.length, drops: 0, alertsMatched: 0, deduped: 0, inboxed: 0, held: 0, sent: 0, failed: 0, removedSubscriptions: 0 };
  if (changes.length === 0) return summary;
  const db = getDb();
  const night = !isMemberSendHour(now);

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
    // 제목과 본문의 기본 글(메일 템플릿 값으로도 쓴다). 웹푸시 글은 웹푸시 템플릿으로 짓는다 — 미사용이면 푸시를 보내지 않는다
    const input = { gameTitle: title, platform: gp.platform, price: change.newPrice, currency: gp.currency, discountPct };
    const payload = { ...alertPayload(input), url: `/games/${gp.slug}`, tag: `price:${gp.id}` };
    const pushText = await pushNotice(alertPushCode(discountPct), alertVars(input), payload);

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
      // 문구는 웹 알림 템플릿(2026-11-02). 미사용이면 알림함에 쌓지 않고 메일, 푸시만 간다
      const priceText = formatPrice(change.newPrice, gp.currency);
      const notice = await webNotice(SYSTEM_TEMPLATES.webPriceDrop, { 게임: title, 가격: priceText }, NOTIFICATION_MESSAGES.priceDrop(title, priceText));
      // 밤이면 낮에 갔을 길을 적어 둔다: 메일로 받는 알림이고 메일이 켜져 있으면 email, 아니면 푸시 글이 있을 때 push
      const heldChannel = night ? (alert.channel === "email" && mailConfigured() ? "email" : pushText ? "push" : null) : null;
      const inboxed = !notice
        ? false
        : await db
        .insert(notifications)
        .values({ userId: alert.userId, kind: "price_drop", body: notice.body, link: payload.url, templateCode: notice.templateCode, heldChannel, createdSource: "cron:alerts", updatedSource: "cron:alerts" })
        .then(() => true)
        .catch((e) => {
          console.warn(`[alerts] 알림함 기록 실패 (alert=${alert.id}): ${e instanceof Error ? e.message : e}`);
          return false;
        });
      if (inboxed) {
        summary.inboxed++;
        await db.insert(alertDeliveries).values({ alertId: alert.id, snapshotId: change.snapshotId }).onConflictDoNothing();
      }
      // 밤에는 여기서 끝낸다. 알림함 템플릿을 꺼 둬서(notice null) 줄이 없으면 아침에 모을 근거도 없다 — 관리자가 끈 알림이라 그대로 둔다
      if (night) {
        if (inboxed && heldChannel) summary.held++;
        continue;
      }

      if (alert.channel === "email" && mailConfigured()) {
        const [u] = await db.select({ email: users.email }).from(users).where(eq(users.id, alert.userId));
        if (u) {
          // 문구는 알림템플릿관리의 템플릿(2026-11-02). 없으면 코드의 기본 한 통, 미사용이면 메일을 건너뛰고 웹푸시로 넘어간다
          const link = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}${payload.url}`;
          const r = await dispatchSystemMail(
            SYSTEM_TEMPLATES.mailPriceAlert,
            u.email,
            { 게임: title, 제목: payload.title, 내용: payload.body, 링크: link },
            {
              fallback: () => ({ to: u.email, subject: `[${SITE.name}] ${payload.title}`, text: `${payload.body}\n${link}`, html: `<p>${escapeHtml(payload.body)}</p><p><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p>` }),
              source: "cron:alerts",
            },
          );
          if (r.status === "sent") {
            summary.sent++;
            await db.insert(alertDeliveries).values({ alertId: alert.id, snapshotId: change.snapshotId }).onConflictDoNothing();
            continue;
          }
          if (r.status === "failed") {
            summary.failed++;
            console.warn(`[alerts] 메일 실패 (alert=${alert.id}): ${r.error}`);
            continue;
          }
        }
      }

      if (!pushText) continue;
      const pushed = await pushToUser(alert.userId, { ...payload, ...pushText }, `alerts:${alert.id}`);
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
