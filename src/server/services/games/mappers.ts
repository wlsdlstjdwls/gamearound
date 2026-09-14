// DB 행 → DTO 변환. 조회 로직(어떤 행을 가져올지)과 표현 로직(어떤 모양으로 줄지)을 갈라 둔다.
import { inArray } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gamePlatforms, games } from "@/server/db/schema";
import type { GameDetail, GameSummary, PlatformDto, PublicGameDto } from "./dto";

export const iso = (d: Date | string | null | undefined): string | null => {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/** 표시 제목: 한글 우선 */
export function displayTitle(g: { titleKo: string | null; titleEn: string }): string {
  return g.titleKo ?? g.titleEn;
}

export type GameRow = typeof games.$inferSelect;
export type PlatformRow = typeof gamePlatforms.$inferSelect;

export function toPlatformDto(p: PlatformRow): PlatformDto {
  return {
    platform: p.platform,
    storeUrl: p.storeUrl,
    releaseDate: p.releaseDate,
    currentVersion: p.currentVersion,
    listPrice: p.listPrice,
    currentPrice: p.currentPrice,
    discountPct: p.discountPct,
    discountStartsAt: iso(p.discountStartsAt),
    discountEndsAt: iso(p.discountEndsAt),
    discountName: p.discountName,
    metacriticScore: p.metacriticScore,
    opencriticScore: p.opencriticScore,
    lastSyncedAt: iso(p.lastSyncedAt),
    syncStatus: p.syncStatus,
  };
}

/** games ⨝ game_platforms 조인 행 목록을 게임 단위로 묶어 요약 생성. 첫 등장 플랫폼이 대표(best). */
export function groupSummaries(rows: Array<{ game: GameRow; gp: PlatformRow }>, limit: number): GameSummary[] {
  const map = new Map<string, GameSummary>();
  for (const { game, gp } of rows) {
    const existing = map.get(game.id);
    if (existing) {
      existing.platformCount += 1;
      continue;
    }
    map.set(game.id, {
      slug: game.slug,
      titleKo: game.titleKo,
      titleEn: game.titleEn,
      coverUrl: game.coverUrl,
      best: {
        platform: gp.platform,
        listPrice: gp.listPrice,
        currentPrice: gp.currentPrice,
        discountPct: gp.discountPct,
        discountEndsAt: iso(gp.discountEndsAt),
        discountName: gp.discountName,
        releaseDate: gp.releaseDate,
      },
      platformCount: 1,
    });
  }
  return [...map.values()].slice(0, limit);
}

/** 검색 결과에 붙일 플랫폼 요약: 게임별 최저가 플랫폼 */
export async function attachBestPrice(rows: GameRow[]): Promise<GameSummary[]> {
  if (rows.length === 0) return [];
  const db = getDb();
  const ids = rows.map((g) => g.id);
  const gps = await db.select().from(gamePlatforms).where(inArray(gamePlatforms.gameId, ids));
  const byGame = new Map<string, PlatformRow[]>();
  for (const gp of gps) {
    const list = byGame.get(gp.gameId) ?? [];
    list.push(gp);
    byGame.set(gp.gameId, list);
  }
  return rows.map((g) => {
    const list = byGame.get(g.id) ?? [];
    // 가격이 있는 것 중 최저가, 없으면 첫 플랫폼
    const priced = list.filter((p) => p.currentPrice !== null);
    const best =
      priced.length > 0
        ? priced.reduce((a, b) => ((b.currentPrice ?? Infinity) < (a.currentPrice ?? Infinity) ? b : a))
        : list[0];
    return {
      slug: g.slug,
      titleKo: g.titleKo,
      titleEn: g.titleEn,
      coverUrl: g.coverUrl,
      best: best
        ? {
            platform: best.platform,
            listPrice: best.listPrice,
            currentPrice: best.currentPrice,
            discountPct: best.discountPct,
            discountEndsAt: iso(best.discountEndsAt),
            discountName: best.discountName,
            releaseDate: best.releaseDate,
          }
        : null,
      platformCount: list.length,
    };
  });
}

export function toPublicGameDto(g: GameDetail): PublicGameDto {
  return {
    slug: g.slug,
    titleKo: g.titleKo,
    titleEn: g.titleEn,
    description: g.description,
    coverUrl: g.coverUrl,
    portraitUrl: g.portraitUrl,
    developer: g.developer,
    publisher: g.publisher,
    localMaxPlayers: g.localMaxPlayers,
    onlineMaxPlayers: g.onlineMaxPlayers,
    supportsSolo: g.supportsSolo,
    supportsCoop: g.supportsCoop,
    supportsPvp: g.supportsPvp,
    isRetro: g.isRetro,
    updatedAt: g.updatedAt,
    genres: g.genres,
    platforms: g.platforms,
    playtime: g.playtime,
    sourceRefs: g.sourceRefs,
    news: g.news.map(({ title, url, sourceName, thumbnailUrl, publishedAt }) => ({
      title,
      url,
      sourceName,
      thumbnailUrl,
      publishedAt,
    })),
  };
}
