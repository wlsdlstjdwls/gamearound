// 주간 맞춤 소식 고르기(순수 함수). 매주 메일(sync/news-digest)과 사이트의 맞춤 소식 화면(/news/mine)이 같은 함수로 고른다 —
// 메일에서 "전체 보기" 를 누르면 같은 목록이 이어져야 한다.
//
// 무엇을 넣나(앞일수록 먼저):
//   1. 찜한 게임 소식. 찜은 그 게임을 지켜본다는 뜻이라 취향 칸과 상관없이 넣는다.
//   2. 고른 장르에 맞고, 고른 플랫폼에서 나오는 게임 소식.
//   3. 장르를 안 고른 사람만: 고른 플랫폼에서 나오는 게임 소식.
// 장르를 고른 사람에게 플랫폼만 맞는 소식(3)을 넣지 않는 이유: PC 를 고른 사람에게는 거의 모든 기사가 맞아 묶음이 "최신 뉴스" 와 같아진다.
// 게임과 이어지지 않은 기사(업계 소식)는 넣지 않는다 — 무엇에 맞는지 말할 근거가 없다.
//
// 한 게임에는 한 건만. 큰 게임은 한 주에 기사가 열 건씩 나와(콜 오브 듀티) 묶음 하나를 다 먹는다.
// 그 한 건은 한국어 제목을 먼저 고른다 — 매체 대부분이 영문이라(2026-11-03 실측 30일 3,408건 중 한글 774건),
// 같은 소식이 국내 매체에도 났으면 그걸 보여 주는 편이 번역보다 낫다. 같은 말이면 최신 기사.
import type { Platform } from "@/server/db/schema";

/** 메일 한 통에 싣는 기사 수. 받은편지함에서 한 번 훑고 끝날 만큼. 더 보려면 "전체 보기" 로 사이트에 온다 */
export const NEWS_DIGEST_MAIL_ITEMS = 8;
/** 맞춤 소식 화면에 펴는 기사 수. 뉴스 목록 한 쪽(services/games/news 의 NEWS_PAGE_SIZE)과 같다 */
export const NEWS_DIGEST_PAGE_ITEMS = 30;
/** 거슬러 보는 날 수. 주간 묶음이라 한 주다. 지난 묶음 뒤로 처음 보내는 사람도 이보다 옛 기사는 받지 않는다 */
export const NEWS_DIGEST_WINDOW_DAYS = 7;

export interface DigestCandidate {
  newsId: string;
  title: string;
  publishedAt: Date;
  gameId: string;
  /** 그 게임이 나오는 플랫폼(보이는 것만) */
  platforms: readonly Platform[];
  genreIds: readonly number[];
}

export interface DigestTaste {
  /** 고른 플랫폼. null 이나 빈 배열이면 안 고른 것이다(개인화 동의가 없거나 꺼 둔 사람도 여기서 null 이다) */
  platforms: readonly Platform[] | null;
  genreIds: readonly number[] | null;
  wishedGameIds: ReadonlySet<string>;
}

/** 이 사람에게 고를 근거가 있는가. 없으면 묶음을 만들지 않는다 — 아무 기사나 보내면 "맞춤" 이 아니다 */
export function hasDigestTaste(t: DigestTaste): boolean {
  return t.wishedGameIds.size > 0 || Boolean(t.platforms?.length) || Boolean(t.genreIds?.length);
}

const HANGUL = /\p{Script=Hangul}/u;

/** 0 이면 넣지 않는다. 클수록 앞에 선다(파일 머리의 1, 2, 3) */
function rank(c: DigestCandidate, t: DigestTaste): number {
  if (t.wishedGameIds.has(c.gameId)) return 3;
  const platformOk = !t.platforms?.length || c.platforms.some((p) => t.platforms?.includes(p));
  if (!platformOk) return 0;
  if (t.genreIds?.length) return c.genreIds.some((g) => t.genreIds?.includes(g)) ? 2 : 0;
  return t.platforms?.length ? 1 : 0;
}

/** 같은 게임의 두 기사 중 무엇을 남기나: 한국어 제목, 그다음 최신 */
function better(a: DigestCandidate, b: DigestCandidate): boolean {
  const ka = HANGUL.test(a.title), kb = HANGUL.test(b.title);
  if (ka !== kb) return ka;
  return a.publishedAt.getTime() > b.publishedAt.getTime();
}

/** 이 사람에게 보일 기사를 앞에서부터 limit 개. 고를 근거가 없으면 빈 배열 */
export function pickDigest<T extends DigestCandidate>(candidates: readonly T[], taste: DigestTaste, limit: number): T[] {
  if (!hasDigestTaste(taste)) return [];
  const best = new Map<string, { c: T; r: number }>();
  for (const c of candidates) {
    const r = rank(c, taste);
    if (r === 0) continue;
    const cur = best.get(c.gameId);
    if (!cur || better(c, cur.c)) best.set(c.gameId, { c, r });
  }
  return [...best.values()]
    .sort((a, b) => b.r - a.r || b.c.publishedAt.getTime() - a.c.publishedAt.getTime())
    .slice(0, limit)
    .map((x) => x.c);
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 이번 주 월요일 0시(한국 시각)를 UTC 시각으로. 묶음은 "이번 주에 아직 안 받은 사람" 에게 간다 —
 * 요일 하루만 보내게 하면 그날 크론이 실패한 주는 통째로 빠진다(cron/daily 의 명예의 전당과 같은 사정).
 */
export function kstWeekStart(now: Date): Date {
  const kst = new Date(now.getTime() + KST_OFFSET_MS);
  const sinceMonday = (kst.getUTCDay() + 6) % 7;
  const mondayKst = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()) - sinceMonday * DAY_MS;
  return new Date(mondayKst - KST_OFFSET_MS);
}
