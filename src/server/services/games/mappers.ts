// DB 행 → DTO 변환. 조회 로직(어떤 행을 가져올지)과 표현 로직(어떤 모양으로 줄지)을 갈라 둔다.
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gamePlatforms, games, HOME_REGION, type Platform, type Region } from "@/server/db/schema";
import { cheapestOf } from "@/lib/currency";
import { PLATFORM_ORDER } from "@/lib/platform";
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

export function byPlatformOrder(a: { platform: Platform }, b: { platform: Platform }): number {
  return PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform);
}

/** 한국 스토어 행이 늘 먼저다 — 기준 통화의 값이 대표가 돼야 한다 */
export function byRegionThenPlatform(a: { platform: Platform; region: Region }, b: { platform: Platform; region: Region }): number {
  if (a.region !== b.region) return a.region === HOME_REGION ? -1 : 1;
  return byPlatformOrder(a, b);
}

export type GameRow = typeof games.$inferSelect;
export type PlatformRow = typeof gamePlatforms.$inferSelect;

export function toPlatformDto(p: PlatformRow): PlatformDto {
  return {
    platform: p.platform,
    region: p.region,
    storeUrl: p.storeUrl,
    releaseDate: p.releaseDate,
    currentVersion: p.currentVersion,
    listPrice: p.listPrice,
    currentPrice: p.currentPrice,
    currency: p.currency,
    discountPct: p.discountPct,
    discountStartsAt: iso(p.discountStartsAt),
    discountEndsAt: iso(p.discountEndsAt),
    discountName: p.discountName,
    metacriticScore: p.metacriticScore,
    opencriticScore: p.opencriticScore,
    lastSyncedAt: iso(p.lastSyncedAt),
    syncStatus: p.syncStatus,
    hasAddOns: p.hasAddOns,
  };
}

/** 나라가 달라도 같은 기기는 배지 하나다(한국 스위치, 일본 스위치). 표시 순서는 PLATFORM_ORDER */
export function distinctPlatforms(list: Platform[]): Platform[] {
  return [...new Set(list)].sort((a, b) => PLATFORM_ORDER.indexOf(a) - PLATFORM_ORDER.indexOf(b));
}

/** games ⨝ game_platforms 조인 행 목록을 게임 단위로 묶어 요약 생성. 첫 등장 플랫폼이 대표(best). */
export function groupSummaries(rows: Array<{ game: GameRow; gp: PlatformRow }>, limit: number): GameSummary[] {
  const map = new Map<string, GameSummary>();
  for (const { game, gp } of rows) {
    const existing = map.get(game.id);
    if (existing) {
      if (!existing.platforms.includes(gp.platform)) existing.platforms.push(gp.platform);
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
        currency: gp.currency,
        discountPct: gp.discountPct,
        discountEndsAt: iso(gp.discountEndsAt),
        discountName: gp.discountName,
        releaseDate: gp.releaseDate,
      },
      platforms: [gp.platform],
    });
  }
  const out = [...map.values()].slice(0, limit);
  for (const item of out) item.platforms = distinctPlatforms(item.platforms);
  return out;
}

/**
 * 요약 목록의 플랫폼 배지를 게임 단위로 다시 채운다.
 *
 * 홈은 조인 행을 잘라서 가져온다(상위 N행). 그 행만 보면 같은 게임의 다른 플랫폼이 잘려 나가
 * 배지가 실제보다 적게 뜬다 — "외 N개" 일 때는 숫자 하나가 틀리는 정도였지만, 배지로 바꾼 뒤에는
 * 있는 스토어가 통째로 안 보이는 일이 된다. 그래서 목록을 자른 뒤 한 번 더 묻는다.
 */
export async function fillPlatforms(items: GameSummary[]): Promise<GameSummary[]> {
  if (items.length === 0) return items;
  const rows = await getDb()
    .select({ slug: games.slug, platform: gamePlatforms.platform })
    .from(gamePlatforms)
    .innerJoin(games, eq(games.id, gamePlatforms.gameId))
    .where(inArray(games.slug, items.map((i) => i.slug)));
  const bySlug = new Map<string, Platform[]>();
  for (const r of rows) {
    const list = bySlug.get(r.slug) ?? [];
    list.push(r.platform);
    bySlug.set(r.slug, list);
  }
  for (const item of items) {
    const list = bySlug.get(item.slug);
    if (list) item.platforms = distinctPlatforms(list);
  }
  return items;
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
    const best = cheapestOf(list) ?? list[0];
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
            currency: best.currency,
            discountPct: best.discountPct,
            discountEndsAt: iso(best.discountEndsAt),
            discountName: best.discountName,
            releaseDate: best.releaseDate,
          }
        : null,
      platforms: distinctPlatforms(list.map((p) => p.platform)),
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
    companies: g.companies,
    dlcs: g.dlcs,
    subscriptions: g.subscriptions,
    upgrades: g.upgrades,
    news: g.news.map(({ title, url, sourceName, thumbnailUrl, publishedAt }) => ({
      title,
      url,
      sourceName,
      thumbnailUrl,
      publishedAt,
    })),
  };
}

/**
 * 현재가가 가장 싼 플랫폼. 통화가 섞였을 때의 규칙은 lib/currency 의 cheapestOf 가 갖는다.
 * 상세 화면과 공유 이미지가 같은 기준으로 "최저가"를 말해야 해서 여기로 올렸다.
 */
export function cheapestPlatform(platforms: PlatformDto[]): PlatformDto | null {
  return cheapestOf(platforms);
}

/**
 * 대표 평점 — OpenCritic 우선, 없으면 메타크리틱. 어느 쪽을 썼는지 함께 돌려준다.
 * 상세 화면과 공유 이미지가 같은 점수를 말해야 해서 여기로 올렸다.
 */
export function bestScore(platforms: PlatformDto[]): { value: number; note: string } | null {
  const oc = platforms.map((p) => p.opencriticScore).find((v): v is number => typeof v === "number");
  const mc = platforms.map((p) => p.metacriticScore).find((v): v is number => typeof v === "number");
  if (oc !== undefined) return { value: oc, note: mc !== undefined ? `OpenCritic | 메타 ${mc}` : "OpenCritic" };
  if (mc !== undefined) return { value: mc, note: "메타크리틱" };
  return null;
}
