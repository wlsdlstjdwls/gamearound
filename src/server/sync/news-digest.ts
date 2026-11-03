// 주간 맞춤 소식 — 설정에서 켠 회원에게 한 주에 한 번, 찜한 게임과 고른 플랫폼, 장르에 맞는 기사를 묶어 보낸다(2026-11-03).
// 고르는 규칙은 lib/news/digest, 재료 읽기는 services/news-digest. 여기는 "누구에게, 언제, 어디로" 만 정한다.
//
// 언제: 매일 크론(cron/daily, 한국 03시)이 부르고, **이번 주(한국 월요일 0시부터) 아직 안 받은 사람** 에게 보낸다.
//   요일 하루만 보내면 그날 크론이 실패한 주가 통째로 빠진다. 이 방식이면 다음 날 메워진다. 중간에 켠 사람은 다음 크론에 첫 묶음을 받는다.
// 어디로: 알림함 한 줄 + 메일. 웹푸시는 보내지 않는다 — 크론이 한국 새벽 3시에 돌아서 휴대폰을 깨운다. 알림함과 메일은 아침에 읽힌다.
// 빈 묶음은 보내지 않는다. 고를 근거(찜, 취향)가 없거나 맞는 기사가 없으면 건너뛰고, 다음 날 다시 본다 — 그 사이 기사가 쌓이면 그때 간다.
import { createdBy } from "@/server/db/audit";
import { getDb } from "@/server/db/client";
import { notifications } from "@/server/db/schema";
import { webNotice } from "@/server/notify/web";
import { dispatchSystemMail } from "@/server/notify/mail";
import { mailConfigured } from "@/server/mail/send";
import { digestSince, loadDigestCandidates, loadDigestReaders, type DigestNews } from "@/server/services/news-digest";
import { kstWeekStart, NEWS_DIGEST_MAIL_ITEMS, pickDigest } from "@/lib/news/digest";
import { NOTIFICATION_MESSAGES as M } from "@/lib/notifications/messages";
import { SYSTEM_TEMPLATES } from "@/lib/notify/system-templates";
import { escapeHtml } from "@/lib/html-entities";
import { errorMessage } from "@/lib/errors";
import { ROUTES } from "@/lib/routes";
import { SITE } from "@/lib/site";

const SOURCE = "cron:news-digest" as const;

export type NewsDigestSummary = { readers: number; inboxed: number; mailed: number; skippedEmpty: number; failed: number };

/** 메일의 {목록}. 변수 값은 글자로 들어가 링크를 못 건다(0104 시드 주석) — 제목과 매체만 적고, 영문 제목에는 게임 이름을 덧붙인다 */
export function digestListText(items: readonly DigestNews[]): string {
  return items.map((n) => `- ${n.title} (${n.sourceName}, ${n.game.title})`).join("\n");
}

/** 템플릿 표를 못 읽거나 메일 템플릿이 없을 때 나가는 기본 한 통 */
function fallbackMail(to: string, items: readonly DigestNews[], link: string, settingsLink: string) {
  const subject = `[${SITE.name}] ${M.newsDigestSubject(items.length)}`;
  const list = items.map((n) => `<li><a href="${escapeHtml(n.url)}">${escapeHtml(n.title)}</a> (${escapeHtml(n.sourceName)})</li>`).join("");
  return {
    to,
    subject,
    html: `<p>${escapeHtml(M.newsDigest(items.length))}</p><ul>${list}</ul><p><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p><p><a href="${escapeHtml(settingsLink)}">${escapeHtml(settingsLink)}</a></p>`,
    text: `${M.newsDigest(items.length)}\n\n${digestListText(items)}\n\n${link}\n${settingsLink}`,
  };
}

export async function dispatchNewsDigest(now: Date = new Date()): Promise<NewsDigestSummary> {
  const summary: NewsDigestSummary = { readers: 0, inboxed: 0, mailed: 0, skippedEmpty: 0, failed: 0 };
  const db = getDb();
  const weekStart = kstWeekStart(now);
  const readers = (await loadDigestReaders(db, "opted-in")).filter((r) => !r.lastDigestAt || r.lastDigestAt < weekStart);
  summary.readers = readers.length;
  if (readers.length === 0) return summary;

  // 후보는 가장 이른 시작점부터 한 번만 읽고 회원마다 시작점으로 거른다
  const sinceOf = new Map(readers.map((r) => [r.userId, digestSince(now, r.lastDigestAt)]));
  const earliest = new Date(Math.min(...[...sinceOf.values()].map((d) => d.getTime())));
  const candidates = await loadDigestCandidates(db, earliest);

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const link = `${base}${ROUTES.newsMine}`;
  const settingsLink = `${base}${ROUTES.settings}`;
  const canMail = mailConfigured();

  for (const r of readers) {
    const since = sinceOf.get(r.userId) ?? earliest;
    const items = pickDigest(candidates.filter((c) => c.publishedAt > since), r.taste, NEWS_DIGEST_MAIL_ITEMS);
    if (items.length === 0) {
      summary.skippedEmpty++;
      continue;
    }
    const count = String(items.length);
    try {
      // 알림함 줄이 "이번 주에 받았다" 의 기록이다. 템플릿이 미사용이어도(notice null) 기록은 남겨야 같은 주에 메일이 다시 가지 않는다 — 기본 글로 쌓는다
      const notice = await webNotice(SYSTEM_TEMPLATES.webNewsDigest, { 건수: count }, M.newsDigest(items.length));
      await db.insert(notifications).values({
        userId: r.userId,
        kind: "news",
        body: notice?.body ?? M.newsDigest(items.length),
        link: ROUTES.newsMine,
        templateCode: notice?.templateCode ?? null,
        ...createdBy(SOURCE),
      });
      summary.inboxed++;
    } catch (e) {
      // 기록을 못 남기면 메일도 보내지 않는다 — 보내 놓고 기록이 없으면 다음 날 같은 묶음이 또 간다
      summary.failed++;
      console.warn(`[news-digest] 알림함 기록 실패 (user=${r.userId}): ${errorMessage(e)}`);
      continue;
    }
    if (!canMail) continue;
    const res = await dispatchSystemMail(
      SYSTEM_TEMPLATES.mailNewsDigest,
      r.email,
      { 건수: count, 목록: digestListText(items), 링크: link, 설정링크: settingsLink },
      { fallback: () => fallbackMail(r.email, items, link, settingsLink), source: SOURCE },
    );
    if (res.status === "sent") summary.mailed++;
    else if (res.status === "failed") {
      summary.failed++;
      console.warn(`[news-digest] 메일 실패 (user=${r.userId}): ${res.error}`);
    }
  }
  return summary;
}
