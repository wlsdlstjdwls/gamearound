// 예약 특전 수집 — 한국닌텐도 뉴스 목록에서 새 특전 글을 찾아 글과 특전 줄을 DB 에 담는다.
//
// 이미 담은 글(어떤 상태든)은 다시 받지 않는다. 숨긴 글을 되살리지 않기 위해서고, 특전 글은 한 번 나오면
// 거의 고쳐지지 않는다(판매처가 늘어나면 새 글이 따로 나온다). 틀이 바뀌어 다시 뽑아야 하면 parse_version 으로 골라 지운다.
//
// 게임은 글이 준 한국 eShop 본편 번호(7001)로 먼저 잇는다. 그런데 특전 글은 발매 전 게임이라 우리 한국 카탈로그에
// 아직 없는 경우가 대부분이다(2026-10-07 실측, 번호 9개 중 0개). 그래서 둘째로 글 제목의 『…』 와 **정확히 같은** 이름
// (제목, 별칭)을 가진 스위치 본편이 **딱 하나**일 때만 잇는다. 둘 이상이면 잇지 않는다 — 리메이크, 스위치2 에디션처럼
// 이름이 겹치는 게임이 흔해 틀리면 남의 게임에 특전이 붙는다. 비슷한 이름으로 어림하지 않는다. 못 이으면 review 로 관리자가 잇는다.
// 이름으로 이을 때는 **한국 스토어 링크가 있는 스위치 행**을 가진 게임만 본다. 처음엔 기기만 봤더니 공개 6건 중 5건이
// 일본 전용 행이나 링크 없는 psprices 껍데기에 붙었다(2026-10-07 실측) — 그런 게임은 목록, 상세에서 빠져 특전이 안 보인다.
// review 글은 회차마다 다시 이어 본다. 발매 전 게임은 발견이 나중에 한국 카탈로그에 들여오므로, 한 번 못 이었다고 끝이 아니다.
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { createdBy, updatedBy } from "@/server/db/audit";
import { gameAliases, gamePlatforms, games, HOME_REGION, preorderBonuses, preorderBonusPosts, type PreorderPostStatus } from "@/server/db/schema";
import {
  fetchBonusArticle,
  fetchNewsList,
  isBonusTitle,
  NEWS_INTERVAL_MS,
  TITLE_BRACKET,
  newsArticleUrl,
  NINTENDO_KR_NEWS_SOURCE,
  PREORDER_PARSE_VERSION,
  type NewsListItem,
  type ParsedArticle,
} from "@/server/adapters/nintendo-kr-news";
import { PREORDER_MESSAGES } from "@/lib/preorder/messages";
import { sleep } from "@/lib/async";
import { errorMessage } from "@/lib/errors";
import { ERROR_SAMPLE_MAX, PREORDER_PAGES_DEFAULT, PREORDER_PAGES_MAX } from "./constants";

const SOURCE = `cron:${NINTENDO_KR_NEWS_SOURCE}` as const;

export type PreorderRunResult = {
  pages: number;
  candidates: number;
  added: number;
  published: number;
  review: number;
  /** 앞 회차에 못 이었다가 이번에 이어 공개한 글 */
  relinked: number;
  failed: number;
  errors: string[];
};

/**
 * games.title_*_norm, game_aliases.alias_norm 과 같은 정규화(소문자, 글자와 숫자만).
 * DB 의 [[:alnum:]] 가 한글을 글자로 친다는 것을 실측했다("시드 마이어의 문명 VII" 가 "시드마이어의문명vii").
 */
export function titleNeedle(title: string): string {
  return title.replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase();
}

/** 글 제목의 『…』 와 이름이 정확히 같은 스위치 본편. 딱 하나일 때만 */
async function findGameByTitle(postTitle: string): Promise<{ id: string; slug: string } | null> {
  const name = TITLE_BRACKET.exec(postTitle)?.[1];
  if (!name) return null;
  const needle = titleNeedle(name);
  if (!needle) return null;
  const rows = await getDb()
    .selectDistinct({ id: games.id, slug: games.slug })
    .from(games)
    .leftJoin(gameAliases, eq(gameAliases.gameId, games.id))
    .where(
      and(
        eq(games.contentType, "game"),
        isNull(games.parentGameId),
        or(eq(games.titleKoNorm, needle), eq(games.titleEnNorm, needle), eq(gameAliases.aliasNorm, needle)),
        sql`exists (select 1 from ${gamePlatforms} gp where gp.game_id = ${games.id} and gp.platform in ('switch', 'switch2')
          and gp.region = ${HOME_REGION} and gp.store_url is not null)`,
      ),
    );
  return rows.length === 1 ? rows[0] : null;
}

/** 글이 가리키는 번호들에서 본편 하나. 본편 행이 없고 DLC, 에디션만 잡히면 그 부모를 쓴다 */
async function findGameByNsuid(nsuids: readonly string[]): Promise<{ id: string; slug: string } | null> {
  if (nsuids.length === 0) return null;
  const rows = await getDb()
    .select({ id: games.id, slug: games.slug, contentType: games.contentType, parentId: games.parentGameId })
    .from(gamePlatforms)
    .innerJoin(games, eq(games.id, gamePlatforms.gameId))
    .where(and(inArray(gamePlatforms.platform, ["switch", "switch2"]), eq(gamePlatforms.region, HOME_REGION), inArray(gamePlatforms.storeExternalId, [...nsuids])));
  const main = rows.find((r) => r.contentType === "game");
  if (main) return { id: main.id, slug: main.slug };
  const parentId = rows.find((r) => r.parentId)?.parentId;
  if (!parentId) return null;
  const [parent] = await getDb().select({ id: games.id, slug: games.slug }).from(games).where(eq(games.id, parentId)).limit(1);
  return parent ?? null;
}

/** 상태와 사유. 특전이 없으면 게임을 이었어도 공개하지 않는다 — 빈 마디가 상세에 선다 */
export function decideStatus(article: ParsedArticle, gameFound: boolean): { status: PreorderPostStatus; reason: string | null } {
  if (article.bonuses.length === 0) return { status: "review", reason: PREORDER_MESSAGES.reason.noBonus };
  if (!gameFound) return { status: "review", reason: PREORDER_MESSAGES.reason.noGame(article.nsuids) };
  return { status: "published", reason: null };
}

async function savePost(item: NewsListItem, article: ParsedArticle): Promise<PreorderPostStatus> {
  const db = getDb();
  const game = (await findGameByNsuid(article.nsuids)) ?? (await findGameByTitle(item.title));
  const { status, reason } = decideStatus(article, game !== null);
  const [post] = await db
    .insert(preorderBonusPosts)
    .values({
      source: NINTENDO_KR_NEWS_SOURCE,
      sourceSlug: item.slug,
      url: newsArticleUrl(item.slug),
      title: item.title,
      publishedAt: new Date(item.publishedAt),
      nsuids: article.nsuids,
      gameId: game?.id ?? null,
      status,
      statusReason: reason,
      parseVersion: PREORDER_PARSE_VERSION,
      ...createdBy(SOURCE),
    })
    .returning({ id: preorderBonusPosts.id });
  if (article.bonuses.length === 0) return status;
  try {
    await db.insert(preorderBonuses).values(
      article.bonuses.map((b, i) => ({ postId: post.id, ...b, sortOrder: i, ...createdBy(SOURCE) })),
    );
  } catch (e) {
    // 글만 남고 특전이 빠지면 "받았다" 로 쳐져 다시 받지 않는다 — 글째 지워 다음 회차에 다시 받게 한다
    await db.delete(preorderBonusPosts).where(eq(preorderBonusPosts.id, post.id));
    throw e;
  }
  return status;
}

/**
 * 게임을 못 이어 review 에 남은 글을 다시 이어 본다. 관리자가 사유를 지운 글(직접 판정한 것)과 특전이 없는 글은 건드리지 않는다.
 * 글 수가 월 1건 안팎이라 전부 훑어도 질의 몇 번이다.
 */
async function relinkReviewPosts(): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ id: preorderBonusPosts.id, title: preorderBonusPosts.title, nsuids: preorderBonusPosts.nsuids })
    .from(preorderBonusPosts)
    .where(
      and(
        eq(preorderBonusPosts.status, "review"),
        isNull(preorderBonusPosts.gameId),
        sql`exists (select 1 from ${preorderBonuses} b where b.post_id = ${preorderBonusPosts.id})`,
      ),
    );
  let linked = 0;
  for (const r of rows) {
    const game = (await findGameByNsuid(r.nsuids)) ?? (await findGameByTitle(r.title));
    if (!game) continue;
    await db
      .update(preorderBonusPosts)
      .set({ gameId: game.id, status: "published", statusReason: null, ...updatedBy(SOURCE) })
      .where(and(eq(preorderBonusPosts.id, r.id), eq(preorderBonusPosts.status, "review")));
    linked++;
  }
  return linked;
}

export async function runPreorderBonuses(opts: { pages?: number } = {}): Promise<PreorderRunResult> {
  const pages = Math.min(Math.max(1, opts.pages ?? PREORDER_PAGES_DEFAULT), PREORDER_PAGES_MAX);
  const result: PreorderRunResult = { pages, candidates: 0, added: 0, published: 0, review: 0, relinked: 0, failed: 0, errors: [] };
  const fail = (label: string, e: unknown) => {
    result.failed++;
    if (result.errors.length < ERROR_SAMPLE_MAX) result.errors.push(`[${label}] ${errorMessage(e)}`);
  };
  try {
    result.relinked = await relinkReviewPosts();
  } catch (e) {
    fail("relink", e);
  }

  const candidates: NewsListItem[] = [];
  for (let p = 1; p <= pages; p++) {
    try {
      candidates.push(...(await fetchNewsList(p)).filter((i) => !i.external && isBonusTitle(i.title)));
    } catch (e) {
      fail(`list p${p}`, e);
    }
    if (p < pages) await sleep(NEWS_INTERVAL_MS);
  }
  result.candidates = candidates.length;
  if (candidates.length === 0) return result;

  const known = new Set(
    (
      await getDb()
        .select({ slug: preorderBonusPosts.sourceSlug })
        .from(preorderBonusPosts)
        .where(and(eq(preorderBonusPosts.source, NINTENDO_KR_NEWS_SOURCE), inArray(preorderBonusPosts.sourceSlug, candidates.map((c) => c.slug))))
    ).map((r) => r.slug),
  );

  for (const item of candidates.filter((c) => !known.has(c.slug))) {
    try {
      const status = await savePost(item, await fetchBonusArticle(item.slug));
      result.added++;
      if (status === "published") result.published++;
      else result.review++;
    } catch (e) {
      fail(item.slug, e);
    }
    await sleep(NEWS_INTERVAL_MS);
  }
  return result;
}
