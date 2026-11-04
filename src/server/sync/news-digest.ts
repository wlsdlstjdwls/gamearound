// 주간 맞춤 소식 — 설정에서 켠 회원에게 한 주에 한 번, 찜한 게임과 고른 플랫폼, 장르에 맞는 기사를 묶어 보낸다(2026-11-03).
// 고르는 규칙은 lib/news/digest, 재료 읽기는 services/news-digest, 메일 기사 카드는 lib/news/digest-mail. 여기는 "누구에게, 언제, 어디로" 와 번역을 맡는다.
//
// 언제: 아침 크론(api/cron/morning, 한국 08시)이 매일 부르고, **이번 주(한국 월요일 0시부터) 아직 안 받은 사람** 에게 보낸다.
//   요일 하루만 보내면 그날 크론이 실패한 주가 통째로 빠진다. 이 방식이면 다음 날 메워진다. 중간에 켠 사람은 다음 날 아침에 첫 묶음을 받는다.
//   처음에는 하루 크론(cron/daily, 한국 03시)에 얹었다가 새벽 3시에 메일이 가는 것을 사용자가 잡았다 — 시각은 크론과 isMemberSendHour(lib/notify/quiet-hours) 두 겹으로 막는다.
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
import { digestSections, kstWeekStart, NEWS_DIGEST_MAIL_ITEMS } from "@/lib/news/digest";
import { digestMailBlock, type DigestMailItem } from "@/lib/news/digest-mail";
import { withEmailBlocks, wrapEmailHtml, type EmailBlock } from "@/lib/notify/email";
import { isMemberSendHour } from "@/lib/notify/quiet-hours";
import { NOTIFICATION_MESSAGES as M } from "@/lib/notifications/messages";
import { SYSTEM_TEMPLATES } from "@/lib/notify/system-templates";
import { escapeHtml } from "@/lib/html-entities";
import { errorMessage } from "@/lib/errors";
import { gameNewsPath, ROUTES } from "@/lib/routes";
import { newsThumbnailSrc } from "@/lib/news/thumbnail";
import { SITE } from "@/lib/site";

const SOURCE = "cron:news-digest" as const;
const HANGUL = /\p{Script=Hangul}/u;
/** 메일 템플릿에서 기사 카드가 들어갈 자리(0104 시드의 {목록}). 글자 변수가 아니라 덩어리로 채운다(lib/notify/email 의 EmailBlock) */
const LIST_VAR = "목록";

export type NewsDigestSummary = { readers: number; inboxed: number; mailed: number; translated: number; skippedEmpty: number; failed: number; skippedHour: boolean };

const shownTitle = (n: DigestNews) => n.titleKo ?? n.title;

/**
 * 메일 속 썸네일은 사이트와 같은 중계(lib/news/thumbnail 의 newsThumbnailSrc)를 거친다. 매체 CDN 을 바로 걸면 막는 곳이 있다 —
 * 2026-11-04 실측 Nintendo Life 403, 큰 카드 자리가 빈 칸으로 떴다. 중계 주소는 상대 경로라 사이트 주소를 붙인다. 막힌 매체면 그림 없이 간다
 */
function mailThumbnail(url: string | null, base: string): string | null {
  const src = url ? newsThumbnailSrc(url) : null;
  if (!src) return null;
  return src.startsWith("/") ? (base ? `${base}${src}` : null) : src;
}

/** 카드 재료로. summaryKo 는 이번 회차에 옮긴 요약(저장하지 않는다, translateSummaries) */
function mailItem(n: DigestNews, base: string, summaryKo: ReadonlyMap<string, string>): DigestMailItem {
  return {
    title: shownTitle(n),
    link: `${base}${gameNewsPath(n.game.slug)}`,
    sourceName: n.sourceName,
    thumbnailUrl: mailThumbnail(n.thumbnailUrl, base),
    summary: summaryKo.get(n.newsId) ?? n.summary,
    gameTitle: n.game.title,
    publishedAt: n.publishedAt,
  };
}

/** 템플릿 표를 못 읽거나 메일 템플릿이 없을 때 나가는 기본 한 통. 카드는 템플릿 메일과 같다 */
function fallbackMail(to: string, count: number, block: EmailBlock, link: string, settingsLink: string) {
  return {
    to,
    subject: `[${SITE.name}] ${M.newsDigestSubject(count)}`,
    html: wrapEmailHtml(
      withEmailBlocks([`<b>${escapeHtml(M.newsDigest(count))}</b>`, `{${LIST_VAR}}`, `<a href="${escapeHtml(link)}">${escapeHtml(link)}</a>`, `<a href="${escapeHtml(settingsLink)}">${escapeHtml(settingsLink)}</a>`].join("\n"), { [LIST_VAR]: block }),
    ),
    text: [M.newsDigest(count), block.text, link, settingsLink].join("\n\n"),
  };
}

/**
 * 실릴 기사의 영문 요약을 이번 회차 안에서만 옮긴다. 제목과 달리 저장하지 않는다 — 요약은 메일 카드에만 쓰이고,
 * 칸을 늘리면(news.summary_ko) 마이그레이션이 하나 더 는다. 한 기사는 받는 사람이 한 번만 보므로(지난 묶음 뒤부터 고른다) 같은 요약을 주마다 다시 옮길 일이 드물다.
 */
async function translateSummaries(items: readonly DigestNews[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!translationConfigured()) return out;
  const todo = [...new Map(items.filter((n) => n.summary && !HANGUL.test(n.summary)).map((n) => [n.newsId, n])).values()];
  if (todo.length === 0) return out;
  const ko = await translateToKorean(todo.map((n) => n.summary ?? ""));
  todo.forEach((n, i) => {
    const t = ko[i];
    if (t) out.set(n.newsId, t);
  });
  return out;
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
  if (!isMemberSendHour(now)) {
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
    const sections = digestSections(candidates.filter((c) => c.publishedAt > since), r.taste, NEWS_DIGEST_MAIL_ITEMS);
    return { reader: r, sections, items: [...sections.picks, ...sections.trending] };
  });
  const shown = picks.flatMap((p) => p.items);
  summary.translated = await translateTitles(db, shown);
  const summaryKo = await translateSummaries(shown);

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const link = `${base}${ROUTES.newsMine}`;
  const settingsLink = `${base}${ROUTES.settings}`;
  const canMail = mailConfigured();

  for (const { reader: r, sections, items } of picks) {
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
    const toItem = (n: DigestNews) => mailItem(n, base, summaryKo);
    const block = digestMailBlock(sections.picks.map(toItem), sections.trending.map(toItem));
    const res = await dispatchSystemMail(
      SYSTEM_TEMPLATES.mailNewsDigest,
      r.email,
      { 건수: count, 링크: link, 설정링크: settingsLink },
      { fallback: () => fallbackMail(r.email, items.length, block, link, settingsLink), source: SOURCE, blocks: { [LIST_VAR]: block } },
    );
    if (res.status === "sent") summary.mailed++;
    else if (res.status === "failed") {
      summary.failed++;
      console.warn(`[news-digest] 메일 실패 (user=${r.userId}): ${res.error}`);
    }
  }
  return summary;
}
