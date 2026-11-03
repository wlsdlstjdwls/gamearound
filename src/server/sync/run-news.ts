// 뉴스 실행 — RSS 피드를 모아 제목으로 게임에 연결한다. 매칭 규칙은 lib/news/game-match 에 있다.
import { and, isNotNull, isNull, sql } from "drizzle-orm";
import { games, news } from "@/server/db/schema";
import type { Db } from "@/server/db/client";
import { updatedBy } from "@/server/db/audit";
import { getNewsAdapter } from "@/server/adapters";
import { RSS_FEEDS } from "@/server/adapters/news-rss";
import type { NewsItem } from "@/server/adapters/types";
import { sleep } from "@/lib/async";
import { matchNewsToGame, type NewsMatchTarget } from "@/lib/news/game-match";
import { NEWS_MATCH_KNOWN_HLTB, NEWS_MATCH_KNOWN_SCORE_COUNT } from "./constants";
import { recordError, type Ctx } from "./context";
import { fetchWithRetry } from "./retry";

/**
 * 매칭에 쓸 게임 목록을 한 번에 읽는다. 다시 맞추기 스크립트(scripts/rematch-news)도 같은 목록을 써야
 * 수집 때와 정리 때 판정이 갈리지 않는다.
 *
 * known 은 "이름이 알려진 게임" 이다(lib/news/game-match 머리 규칙 2). 게임에 붙는 신호(HLTB 기록 수)와
 * 스토어 행에 붙는 신호(평가 수) 중 하나라도 넘으면 알려진 것으로 본다 — 스위치, Epic 게임은 평가 수가 없고
 * 신작은 HLTB 기록이 없어서 하나만 보면 한쪽이 통째로 빠진다.
 */
export async function loadNewsMatchIndex(db: Db): Promise<NewsMatchTarget[]> {
  const rows = await db
    .select({
      id: games.id,
      slug: games.slug,
      titleEn: games.titleEn,
      titleKo: games.titleKo,
      // 하위 질의 안의 games.id 는 테이블 이름을 손으로 붙인다. Drizzle 은 테이블 하나짜리 select 에서 칸을 "id" 로만 찍고,
      // 그러면 하위 질의 안에서 game_platforms.id 로 읽혀 거의 모든 게임이 알려지지 않은 것이 된다(2026-11-03 dry-run 에서 1,595개뿐이었다)
      known: sql<boolean>`(coalesce(${games.hltbLoggedCount}, 0) >= ${NEWS_MATCH_KNOWN_HLTB}::int or exists (
        select 1 from game_platforms gp where gp.game_id = "games"."id" and gp.user_score_count >= ${NEWS_MATCH_KNOWN_SCORE_COUNT}::int
      ))`,
    })
    .from(games);
  return rows.map((g) => ({
    id: g.id,
    slug: g.slug,
    needles: [g.titleEn, g.titleKo].filter((t): t is string => Boolean(t)).map((t) => t.toLowerCase().trim()),
    known: Boolean(g.known),
  }));
}

export async function runNews(ctx: Ctx): Promise<void> {
  const adapter = getNewsAdapter("rss");
  const { db } = ctx;
  const index = await loadNewsMatchIndex(db);

  for (let i = 0; i < RSS_FEEDS.length; i++) {
    const feed = RSS_FEEDS[i];
    let items: NewsItem[];
    try {
      items = await fetchWithRetry(() => adapter.fetch(feed.name));
    } catch (e) {
      recordError(ctx, `rss:${feed.name}`, e);
      continue;
    }
    if (items.length === 0) continue;
    const values = items.map((it) => {
      const game = matchNewsToGame(it.title, index);
      if (game) ctx.changedSlugs.add(game.slug);
      return {
        gameId: game?.id ?? null,
        title: it.title,
        url: it.url,
        sourceName: it.sourceName,
        thumbnailUrl: it.thumbnailUrl ?? null,
        summary: it.summary ?? null,
        publishedAt: new Date(it.publishedAt),
      };
    });
    try {
      // 이미 있는 기사는 요약만 채운다 — 요약 칸이 생기기 전에 모은 기사가 피드에 남아 있는 동안 메워지고(2026-10-26),
      // 이미 요약이 있거나 이번에도 없으면 건드리지 않는다(§7 값이 실제로 달라질 때만 UPDATE)
      await db
        .insert(news)
        .values(values)
        .onConflictDoUpdate({
          target: news.url,
          set: { summary: sql`excluded.summary`, ...updatedBy("cron:news") },
          setWhere: and(isNull(news.summary), isNotNull(sql`excluded.summary`)),
        });
      ctx.processed += values.length;
    } catch (e) {
      recordError(ctx, `rss:${feed.name}:db`, e);
    }
    if (i < RSS_FEEDS.length - 1) await sleep(adapter.minIntervalMs);
  }
}
