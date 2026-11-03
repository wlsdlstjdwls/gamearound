// 주간 맞춤 소식 — 설정에서 켠 회원에게 한 주에 한 번, 찜한 게임과 고른 플랫폼, 장르에 맞는 기사를 묶어 보낸다(2026-11-03).
// 고르는 규칙은 lib/news/digest, 재료 읽기는 services/news-digest. 여기는 "누구에게, 언제, 어디로" 와 제목 번역을 맡는다.
//
// 언제: 전용 크론(api/cron/news-digest, 한국 09:10)이 매일 부르고, **이번 주(한국 월요일 0시부터) 아직 안 받은 사람** 에게 보낸다.
//   요일 하루만 보내면 그날 크론이 실패한 주가 통째로 빠진다. 이 방식이면 다음 날 메워진다. 중간에 켠 사람은 다음 날 아침에 첫 묶음을 받는다.
//   처음에는 하루 크론(cron/daily, 한국 03시)에 얹었다가 새벽 3시에 메일이 가는 것을 사용자가 잡았다 — 시각은 크론과 isDigestSendHour 두 겹으로 막는다.
// 어디로: 알림함 한 줄 + 메일. 설정 스위치가 그 둘을 약속했다(lib/news/messages 의 NEWS_DIGEST_MESSAGES.on). 웹푸시는 보내지 않는다.
// 빈 묶음은 보내지 않는다. 고를 근거(찜, 취향)가 없거나 맞는 기사가 없으면 건너뛰고, 다음 날 다시 본다 — 그 사이 기사가 쌓이면 그때 간다.
//
// 번역: 묶음에 실릴 영문 제목만 보내기 직전에 번역해 news.title_ko 에 남긴다(adapters/translate). 키가 없거나 한도를 다 쓰면 원문으로 간다.
import { sql } from "drizzle-orm";
import { createdBy } from "@/server/db/audit";
import { getDb, type Db } from "@/server/db/client";
import { notifications } from "@/server/db/schema";
import { webNotice } from "@/server/notify/web";
import { dispatchSystemMail } from "@/server/notify/mail";
import { mailConfigured } from "@/server/mail/send";
import { translateToKorean, translationConfigured } from "@/server/adapters/translate";
import { digestSince, loadDigestCandidates, loadDigestReaders, type DigestNews } from "@/server/services/news-digest";
import { isDigestSendHour, kstWeekStart, NEWS_DIGEST_MAIL_ITEMS, pickDigest } from "@/lib/news/digest";
import { NOTIFICATION_MESSAGES as M } from "@/lib/notifications/messages";
import { SYSTEM_TEMPLATES } from "@/lib/notify/system-templates";
import { escapeHtml } from "@/lib/html-entities";
import { errorMessage } from "@/lib/errors";
import { ROUTES } from "@/lib/routes";
import { SITE } from "@/lib/site";

const SOURCE = "cron:news-digest" as const;
const HANGUL = /\p{Script=Hangul}/u;

export type NewsDigestSummary = { readers: number; inboxed: number; mailed: number; translated: number; skippedEmpty: number; failed: number; skippedHour: boolean };

const shownTitle = (n: DigestNews) => n.titleKo ?? n.title;

/** 메일의 {목록}. 변수 값은 글자로 들어가 링크를 못 건다(0104 시드 주석) — 제목과 매체, 게임 이름만 적는다 */
export function digestListText(items: readonly DigestNews[]): string {
  return items.map((n) => `- ${shownTitle(n)} (${n.sourceName}, ${n.game.title})`).join("\n");
}

/** 템플릿 표를 못 읽거나 메일 템플릿이 없을 때 나가는 기본 한 통 */
function fallbackMail(to: string, items: readonly DigestNews[], link: string, settingsLink: string) {
  const subject = `[${SITE.name}] ${M.newsDigestSubject(items.length)}`;
  const list = items.map((n) => `<li><a href="${escapeHtml(n.url)}">${escapeHtml(shownTitle(n))}</a> (${escapeHtml(n.sourceName)})</li>`).join("");
  return {
    to,
    subject,
    html: `<p>${escapeHtml(M.newsDigest(items.length))}</p><ul>${list}</ul><p><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p><p><a href="${escapeHtml(settingsLink)}">${escapeHtml(settingsLink)}</a></p>`,
    text: `${M.newsDigest(items.length)}\n\n${digestListText(items)}\n\n${link}\n${settingsLink}`,
  };
}

/**
 * 실릴 기사 중 아직 번역이 없는 영문 제목을 번역해 기사 객체와 DB 에 채운다. 돌려주는 값은 새로 번역한 수.
 * 회원마다 따로 부르지 않고 그 회차 묶음 전체를 한 번에 — 같은 기사가 여러 사람 묶음에 실리면 한 번만 번역한다.
 */
async function translateTitles(db: Db, items: readonly DigestNews[]): Promise<number> {
  if (!translationConfigured()) return 0;
  const todo = [...new Map(items.filter((n) => !n.titleKo && !HANGUL.test(n.title)).map((n) => [n.newsId, n])).values()];
  if (todo.length === 0) return 0;
  const out = await translateToKorean(todo.map((n) => n.title));
  const done: Array<{ id: string; titleKo: string }> = [];
  todo.forEach((n, i) => {
    const ko = out[i];
    if (!ko) return;
    done.push({ id: n.newsId, titleKo: ko });
    // 같은 기사를 가리키는 객체가 여러 묶음에 있어 newsId 로 다 채운다
    for (const m of items) if (m.newsId === n.newsId) m.titleKo = ko;
  });
  if (done.length === 0) return 0;
  try {
    const values = sql.join(done.map((d) => sql`(${d.id}::uuid, ${d.titleKo})`), sql`, `);
    await db.execute(sql`
      update news set title_ko = v.title_ko, updated_source = ${SOURCE}, updated_by = null, updated_at = now()
      from (values ${values}) as v(id, title_ko)
      where news.id = v.id and news.title_ko is null`);
  } catch (e) {
    // 저장을 못 해도 이번 메일은 번역으로 간다. 다음 회차에 다시 번역한다
    console.warn(`[news-digest] 번역 저장 실패: ${errorMessage(e)}`);
  }
  return done.length;
}

export async function dispatchNewsDigest(now: Date = new Date()): Promise<NewsDigestSummary> {
  const summary: NewsDigestSummary = { readers: 0, inboxed: 0, mailed: 0, translated: 0, skippedEmpty: 0, failed: 0, skippedHour: false };
  if (!isDigestSendHour(now)) {
    summary.skippedHour = true;
    return summary;
  }
  const db = getDb();
  const weekStart = kstWeekStart(now);
  const readers = (await loadDigestReaders(db, "opted-in")).filter((r) => !r.lastDigestAt || r.lastDigestAt < weekStart);
  summary.readers = readers.length;
  if (readers.length === 0) return summary;

  // 후보는 가장 이른 시작점부터 한 번만 읽고 회원마다 시작점으로 거른다
  const sinceOf = new Map(readers.map((r) => [r.userId, digestSince(now, r.lastDigestAt)]));
  const earliest = new Date(Math.min(...[...sinceOf.values()].map((d) => d.getTime())));
  const candidates = await loadDigestCandidates(db, earliest);

  const picks = readers.map((r) => {
    const since = sinceOf.get(r.userId) ?? earliest;
    return { reader: r, items: pickDigest(candidates.filter((c) => c.publishedAt > since), r.taste, NEWS_DIGEST_MAIL_ITEMS) };
  });
  summary.translated = await translateTitles(db, picks.flatMap((p) => p.items));

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const link = `${base}${ROUTES.newsMine}`;
  const settingsLink = `${base}${ROUTES.settings}`;
  const canMail = mailConfigured();

  for (const { reader: r, items } of picks) {
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
