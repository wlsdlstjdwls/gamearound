// DB 행 → DTO 변환. 조회 로직(어떤 행을 가져올지)과 표현 로직(어떤 모양으로 줄지)을 갈라 둔다.
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gameGenres, gamePlatforms, games, genres, HOME_REGION, type Platform, type Region } from "@/server/db/schema";
import { cheapestOf, DISPLAY_CURRENCY } from "@/lib/currency";
import { PLATFORM_ORDER } from "@/lib/platform";
import type { GameDetail, GameSummary, PlatformDto, PublicGameDto, UserScoreDto } from "./dto";

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
    // 세 컬럼이 다 차 있을 때만 점수다 — 하나라도 비면 뜻을 만들 수 없다
    userScore:
      p.userScore !== null && p.userScoreKind !== null
        ? { value: p.userScore, kind: p.userScoreKind, count: p.userScoreCount ?? 0 }
        : null,
    lastSyncedAt: iso(p.lastSyncedAt),
    syncStatus: p.syncStatus,
    hasAddOns: p.hasAddOns,
    // 구독은 다른 테이블이라 행 하나로는 알 수 없다. 채우는 곳은 detail 의 조회부다
    subscriptions: [],
  };
}

/** 나라가 달라도 같은 기기는 배지 하나다(한국 스위치, 일본 스위치). 표시 순서는 PLATFORM_ORDER */
export function distinctPlatforms(list: Platform[]): Platform[] {
  return [...new Set(list)].sort((a, b) => PLATFORM_ORDER.indexOf(a) - PLATFORM_ORDER.indexOf(b));
}

/** 플랫폼 행 1개 → 카드가 쓰는 대표 가격 모양. 두 매퍼가 같은 모양을 써야 카드가 한 가지만 안다 */
function bestOf(gp: PlatformRow): NonNullable<GameSummary["best"]> {
  return {
    platform: gp.platform,
    listPrice: gp.listPrice,
    currentPrice: gp.currentPrice,
    currency: gp.currency,
    discountPct: gp.discountPct,
    discountEndsAt: iso(gp.discountEndsAt),
    discountName: gp.discountName,
    releaseDate: gp.releaseDate,
  };
}

/** games ⨝ game_platforms 조인 행 목록을 게임 단위로 묶어 요약 생성. 대표(best)는 기준 통화 우선. */
export function groupSummaries(rows: Array<{ game: GameRow; gp: PlatformRow }>, limit: number): GameSummary[] {
  const map = new Map<string, GameSummary>();
  for (const { game, gp } of rows) {
    const existing = map.get(game.id);
    if (existing) {
      if (!existing.platforms.includes(gp.platform)) existing.platforms.push(gp.platform);
      // 대표 가격은 기준 통화가 이긴다. 먼저 온 행이 엔화고 뒤에 원화 행이 오면 갈아 끼운다 —
      // 한국에서 볼 화면이라 "₩2,100" 이 "¥799" 보다 언제나 나은 답이다(환산은 하지 않는다).
      if (existing.best && existing.best.currency !== DISPLAY_CURRENCY && gp.currency === DISPLAY_CURRENCY) {
        existing.best = bestOf(gp);
      }
      continue;
    }
    map.set(game.id, {
      slug: game.slug,
      titleKo: game.titleKo,
      titleEn: game.titleEn,
      coverUrl: game.coverUrl,
      best: bestOf(gp),
      platforms: [gp.platform],
      genres: [],
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

/**
 * 카드 한 장이 달 장르 수. 세 개를 넘기면 칩이 줄을 바꿔 카드 높이가 제각각이 된다 —
 * 격자에서 높이가 흔들리면 훑는 눈이 매번 다시 자리를 잡아야 한다.
 */
export const CARD_GENRE_MAX = 3;

/**
 * 요약 목록에 장르를 채운다. fillPlatforms 와 같은 이유로 조회를 따로 한다 —
 * 가격 조인에 장르를 같이 걸면 게임 하나가 (플랫폼 × 장르) 배로 불어나 페이지 경계가 틀어진다.
 */
export async function fillGenres(items: GameSummary[]): Promise<GameSummary[]> {
  if (items.length === 0) return items;
  return applyGenres(items, await fetchGenresBySlug(items.map((i) => i.slug)));
}

/**
 * 슬러그별 장르 목록만 가져온다. 조회와 적용을 가른 이유: 부르는 쪽이 이 왕복을
 * 다른 조회와 나란히 띄울 수 있어야 한다 — Neon 은 us-east-1 이라 한 번에 200ms 가 넘는다.
 */
async function fetchGenresBySlug(slugs: string[]): Promise<Map<string, string[]>> {
  const bySlug = new Map<string, string[]>();
  if (slugs.length === 0) return bySlug;
  const rows = await getDb()
    .select({ slug: games.slug, name: genres.name })
    .from(gameGenres)
    .innerJoin(games, eq(games.id, gameGenres.gameId))
    .innerJoin(genres, eq(genres.id, gameGenres.genreId))
    .where(inArray(games.slug, slugs));
  for (const r of rows) {
    const list = bySlug.get(r.slug) ?? [];
    list.push(r.name);
    bySlug.set(r.slug, list);
  }
  return bySlug;
}

function applyGenres(items: GameSummary[], bySlug: Map<string, string[]>): GameSummary[] {
  for (const item of items) {
    // 가나다순으로 자른다 — 순서가 조회마다 흔들리면 같은 게임의 칩이 화면마다 달라진다
    item.genres = [...new Set(bySlug.get(item.slug) ?? [])].sort((a, b) => a.localeCompare(b, "ko")).slice(0, CARD_GENRE_MAX);
  }
  return items;
}

/** 검색 결과에 붙일 플랫폼 요약: 게임별 최저가 플랫폼 */
export async function attachBestPrice(rows: GameRow[]): Promise<GameSummary[]> {
  if (rows.length === 0) return [];
  const db = getDb();
  const ids = rows.map((g) => g.id);
  // 가격과 장르는 서로를 기다릴 이유가 없다. 직렬로 두면 왕복 한 번(200ms 대)이 그대로 목록 지연이 된다
  const [gps, genresBySlug] = await Promise.all([
    db.select().from(gamePlatforms).where(inArray(gamePlatforms.gameId, ids)),
    fetchGenresBySlug(rows.map((g) => g.slug)),
  ]);
  const byGame = new Map<string, PlatformRow[]>();
  for (const gp of gps) {
    const list = byGame.get(gp.gameId) ?? [];
    list.push(gp);
    byGame.set(gp.gameId, list);
  }
  // 장르는 여기서 같이 채운다 — attachBestPrice 를 쓰는 화면(목록, 검색, 회사)은 전부 카드를 그린다
  return applyGenres(rows.map((g) => {
    const list = byGame.get(g.id) ?? [];
    const best = cheapestOf(list) ?? list[0];
    return {
      slug: g.slug,
      titleKo: g.titleKo,
      titleEn: g.titleEn,
      coverUrl: g.coverUrl,
      best: best ? bestOf(best) : null,
      platforms: distinctPlatforms(list.map((p) => p.platform)),
      genres: [],
    };
  }), genresBySlug);
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

/**
 * 대표 유저 점수 — 표본이 가장 큰 스토어의 것. 평균을 내지 않는 이유:
 * Steam 의 "긍정 94%" 와 Xbox 의 "평균 3.9점" 은 재는 방식이 달라 더하면 아무 뜻도 아닌 값이 된다.
 * 어느 스토어의 값인지 함께 돌려주고, 화면이 그 이름을 같이 적는다.
 */
export function bestUserScore(platforms: PlatformDto[]): { score: UserScoreDto; platform: Platform } | null {
  const rated = platforms.filter((p): p is PlatformDto & { userScore: UserScoreDto } => p.userScore !== null);
  if (rated.length === 0) return null;
  const top = rated.reduce((a, b) => (b.userScore.count > a.userScore.count ? b : a));
  return { score: top.userScore, platform: top.platform };
}
