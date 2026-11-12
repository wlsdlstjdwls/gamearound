// 한국닌텐도 뉴스에서 이벤트 카드를 고른다 — 이벤트, 체험판, 무료 업데이트 글과 공식 소개 페이지(바깥 링크 글).
//
// 게임은 페이지에 적힌 한국 eShop 본편 번호(7001)로만 잇는다. 특전 수집처럼 제목으로 어림하지 않는다 —
// 이벤트 글은 이미 발매된 게임이 대부분이라 번호로 거의 다 잡히고(2026-11-12 실측: 피크민 이벤트 글, 소개 페이지 둘 다 번호가 있다),
// 틀리면 남의 게임에 카드가 붙는다. 못 이은 글은 담지 않고 다음 회차에 다시 본다(1쪽 24건이라 비용이 작다).
//
// 번호만으로는 모자라다: 글 아래쪽에 다른 게임 홍보 링크가 붙어 와서, 첫 실측에서 스타폭스 업데이트 글이 젤다와 파이어 엠블렘에도,
// 스플래툰 3 대회 글이 스플래툰 레이더스에도 붙었다(2026-11-12). 그래서 번호로 잡은 게임 중 **글 제목과 이름이 맞는** 게임만 남긴다(titleMatches).
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gamePlatforms, games, HOME_REGION } from "@/server/db/schema";
import {
  EVENT_MAX_GAMES,
  eventKindOf,
  fetchEventPage,
  fetchNewsList,
  NEWS_INTERVAL_MS,
  newsArticleUrl,
  NINTENDO_KR_NEWS_SOURCE,
  OFFICIAL_PAGE_LINK,
  type NewsListItem,
} from "@/server/adapters/nintendo-kr-news";
import { sleep } from "@/lib/async";
import { titleNeedle } from "@/server/sync/preorder-bonuses";
import { knownKeys, upsertEvents, type EventRow } from "./write";
import type { EventRunPart } from "./types";

const ACTOR = `cron:${NINTENDO_KR_NEWS_SOURCE}-events` as const;

/** og:title 의 사이트 꼬리(" | Nintendo Switch 2 | 닌텐도", " | News | 한국닌텐도주식회사")를 뗀다 */
export function stripSiteSuffix(title: string): string {
  return title.split(" | ")[0].trim();
}

type Candidate = { item: NewsListItem; kind: string; url: string };

/** 목록 글 하나를 카드 후보로. 공식 소개 페이지가 먼저다 — 제목이 "공개되었습니다" 라 제목 규칙에는 안 걸린다 */
export function toCandidate(item: NewsListItem): Candidate | null {
  if (item.link && OFFICIAL_PAGE_LINK.test(item.link)) return { item, kind: "page", url: item.link };
  if (item.external) return null;
  const kind = eventKindOf(item.title);
  return kind ? { item, kind, url: newsArticleUrl(item.slug) } : null;
}

/** 게임 이름 바늘이 이보다 짧으면 글 제목 안에 우연히 들어 있을 수 있어 "포함" 으로 치지 않는다 */
const MIN_NEEDLE = 3;
/** 글 제목의 게임 이름 괄호. 「」 는 행사, 매장 이름에 쓰여(「피크민 in 청량리」) 넣지 않는다 */
const GAME_BRACKET = /[『｢]([^』｣]+)[』｣]/g;

/**
 * 글 제목과 게임 이름이 맞나. 제목 속 『이름』 이 게임 이름 안에 있거나(『모여봐요 동물의 숲』 과 그 스위치2 에디션),
 * 게임 이름이 제목 안에 통째로 있으면 맞다고 본다. 비슷한 이름으로 어림하지 않는다.
 */
export function titleMatches(postTitle: string, gameNeedles: string[]): boolean {
  const names = gameNeedles.filter((n) => n.length >= MIN_NEEDLE);
  const post = titleNeedle(postTitle);
  const brackets = [...postTitle.matchAll(GAME_BRACKET)].map((m) => titleNeedle(m[1])).filter((n) => n.length >= MIN_NEEDLE);
  return names.some((n) => post.includes(n) || brackets.some((b) => n.includes(b)));
}

/** 번호들이 가리키는 본편 중 글 제목과 이름이 맞는 것. DLC, 에디션 번호면 그 부모를 쓴다 */
async function gamesForPost(nsuids: string[], postTitle: string): Promise<string[]> {
  if (nsuids.length === 0) return [];
  const rows = await getDb()
    .select({ id: games.id, contentType: games.contentType, parentId: games.parentGameId })
    .from(gamePlatforms)
    .innerJoin(games, eq(games.id, gamePlatforms.gameId))
    .where(and(inArray(gamePlatforms.platform, ["switch", "switch2"]), eq(gamePlatforms.region, HOME_REGION), inArray(gamePlatforms.storeExternalId, nsuids)));
  const ids = [...new Set(rows.map((r) => (r.contentType === "game" ? r.id : r.parentId)).filter((id): id is string => !!id))];
  if (ids.length === 0) return [];
  const named = await getDb().select({ id: games.id, ko: games.titleKoNorm, en: games.titleEnNorm }).from(games).where(inArray(games.id, ids));
  return named.filter((g) => titleMatches(postTitle, [g.ko, g.en].filter((n): n is string => !!n))).map((g) => g.id);
}

/** 공유 설명이 제목을 되풀이할 뿐이면 버린다 — 닌텐도 글은 og:description 이 제목과 같다(2026-11-12 실측) */
export function usefulDescription(description: string | null, title: string): string | null {
  if (!description) return null;
  const d = titleNeedle(description);
  const t = titleNeedle(title);
  return d.length === 0 || t.startsWith(d) || d.startsWith(t) ? null : description;
}

export async function collectNintendoEvents(pages: number, part: EventRunPart): Promise<void> {
  const candidates: Candidate[] = [];
  for (let p = 1; p <= pages; p++) {
    try {
      for (const item of await fetchNewsList(p)) {
        const c = toCandidate(item);
        if (c) candidates.push(c);
      }
    } catch (e) {
      part.fail(`nintendo list p${p}`, e);
    }
    if (p < pages) await sleep(NEWS_INTERVAL_MS);
  }
  part.candidates += candidates.length;
  const known = await knownKeys(NINTENDO_KR_NEWS_SOURCE, candidates.map((c) => c.item.slug));

  for (const c of candidates.filter((x) => !known.has(x.item.slug))) {
    try {
      const page = await fetchEventPage(c.url);
      const gameIds = await gamesForPost(page.nsuids, c.item.title);
      // 묶음 글(Direct 정리, 세일 특집)이거나 우리 카탈로그에 아직 없는 게임이다
      if (gameIds.length === 0 || gameIds.length > EVENT_MAX_GAMES) {
        part.skipped++;
        continue;
      }
      const title = c.kind === "page" && page.meta.title ? stripSiteSuffix(page.meta.title) : c.item.title;
      const rows: EventRow[] = gameIds.map((gameId) => ({
        gameId,
        source: NINTENDO_KR_NEWS_SOURCE,
        sourceKey: c.item.slug,
        kind: c.kind,
        url: c.url,
        title,
        description: usefulDescription(page.meta.description, title),
        imageUrl: page.meta.imageUrl,
        publishedAt: new Date(c.item.publishedAt),
        startsAt: null,
        endsAt: null,
      }));
      part.written += await upsertEvents(rows, ACTOR);
    } catch (e) {
      part.fail(c.item.slug, e);
    }
    await sleep(NEWS_INTERVAL_MS);
  }
}
