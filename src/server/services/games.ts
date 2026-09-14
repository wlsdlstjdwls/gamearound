// games 서비스 — 홈/검색/상세 조회 (설계서 §5.1). route(page)에서만 호출, DB 접근은 여기서.
// 캐시 태그 규칙(§4.5): 상세 `game:<slug>`, 홈 `home`. 검색은 페이지 풀 라우트 캐시(revalidate=3600).
// 주의: unstable_cache 내부에서는 headers()/cookies()/auth()를 호출하지 않는다. 로그인 의존 데이터는 페이지에서 별도 조회.
import { unstable_cache } from "next/cache";
import { and, asc, desc, eq, gt, inArray, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { normalizeForSearch } from "@/lib/slug";
import { DEFAULT_GAME_SORT, type GamesQuery } from "@/lib/games-query";
import {
  gameGenres,
  gamePlatforms,
  games,
  genres,
  news,
  type Platform,
  type SyncStatus,
} from "@/server/db/schema";

// ---------- 공개 DTO (모두 JSON 직렬화 가능: Date → ISO string) ----------

export type PlatformDto = {
  platform: Platform;
  storeUrl: string | null;
  releaseDate: string | null;
  currentVersion: string | null;
  listPrice: number | null;
  currentPrice: number | null;
  discountPct: number | null;
  /** 할인 기간·행사명 (소스가 주는 만큼만. steam=종료+행사명, xbox=시작·종료) */
  discountStartsAt: string | null;
  discountEndsAt: string | null;
  discountName: string | null;
  metacriticScore: number | null;
  opencriticScore: number | null;
  lastSyncedAt: string | null;
  syncStatus: SyncStatus | null;
};

export type NewsDto = {
  id: string;
  title: string;
  url: string;
  sourceName: string;
  thumbnailUrl: string | null;
  publishedAt: string;
  /** 홈 뉴스 목록에서 연결 게임 표시용 */
  game?: { slug: string; title: string } | null;
};

export type PlaytimeDto = {
  mainStoryHours: string | null;
  mainExtraHours: string | null;
  completionistHours: string | null;
  lastSyncedAt: string | null;
};

export type SourceRefDto = {
  source: string;
  externalId: string;
  url: string | null;
};

export type GameDetail = {
  id: string;
  slug: string;
  titleKo: string | null;
  titleEn: string;
  description: string | null;
  coverUrl: string | null;
  /** 세로 아트(600×900). 없는 게임은 null → UI 가 coverUrl(가로 배너)로 폴백 */
  portraitUrl: string | null;
  developer: string | null;
  publisher: string | null;
  localMaxPlayers: number | null;
  onlineMaxPlayers: number | null;
  supportsSolo: boolean;
  supportsCoop: boolean;
  supportsPvp: boolean;
  isRetro: boolean;
  updatedAt: string;
  genres: string[];
  platforms: PlatformDto[];
  playtime: PlaytimeDto | null;
  news: NewsDto[];
  sourceRefs: SourceRefDto[];
};

/** 카드/목록용 요약. `best`는 대표 플랫폼(할인 최대 또는 최저가) */
export type GameSummary = {
  slug: string;
  titleKo: string | null;
  titleEn: string;
  coverUrl: string | null;
  best: {
    platform: Platform;
    listPrice: number | null;
    currentPrice: number | null;
    discountPct: number | null;
    discountEndsAt: string | null;
    discountName: string | null;
    releaseDate: string | null;
  } | null;
  platformCount: number;
};

export type HomeData = {
  discounts: GameSummary[];
  recentReleases: GameSummary[];
  latestNews: NewsDto[];
};

// ---------- 내부 유틸 ----------

const iso = (d: Date | string | null | undefined): string | null => {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/** 표시 제목: 한글 우선 */
export function displayTitle(g: { titleKo: string | null; titleEn: string }): string {
  return g.titleKo ?? g.titleEn;
}

type GameRow = typeof games.$inferSelect;
type PlatformRow = typeof gamePlatforms.$inferSelect;

function toPlatformDto(p: PlatformRow): PlatformDto {
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
function groupSummaries(rows: Array<{ game: GameRow; gp: PlatformRow }>, limit: number): GameSummary[] {
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

// ---------- 홈 ----------

const HOME_LIMIT = 12;
const HOME_NEWS_LIMIT = 8;

async function getHomeDataRaw(): Promise<HomeData> {
  const db = getDb();

  // 오늘의 할인: 할인율 desc. 게임당 1개로 묶기 위해 넉넉히 가져와 JS에서 dedupe
  const discountRows = await db
    .select({ game: games, gp: gamePlatforms })
    .from(gamePlatforms)
    .innerJoin(games, eq(gamePlatforms.gameId, games.id))
    .where(and(gt(gamePlatforms.discountPct, 0), isNotNull(gamePlatforms.currentPrice)))
    .orderBy(desc(gamePlatforms.discountPct), desc(gamePlatforms.lastSyncedAt))
    .limit(HOME_LIMIT * 4);

  // 최근 출시: 출시일 desc (미래 출시 제외)
  const releaseRows = await db
    .select({ game: games, gp: gamePlatforms })
    .from(gamePlatforms)
    .innerJoin(games, eq(gamePlatforms.gameId, games.id))
    .where(and(isNotNull(gamePlatforms.releaseDate), sql`${gamePlatforms.releaseDate} <= current_date`))
    .orderBy(desc(gamePlatforms.releaseDate))
    .limit(HOME_LIMIT * 4);

  const newsRows = await db
    .select({ n: news, slug: games.slug, titleKo: games.titleKo, titleEn: games.titleEn })
    .from(news)
    .leftJoin(games, eq(news.gameId, games.id))
    .orderBy(desc(news.publishedAt))
    .limit(HOME_NEWS_LIMIT);

  return {
    discounts: groupSummaries(discountRows, HOME_LIMIT),
    recentReleases: groupSummaries(releaseRows, HOME_LIMIT),
    latestNews: newsRows.map(({ n, slug, titleKo, titleEn }) => ({
      id: n.id,
      title: n.title,
      url: n.url,
      sourceName: n.sourceName,
      thumbnailUrl: n.thumbnailUrl,
      publishedAt: n.publishedAt.toISOString(),
      game: slug && titleEn ? { slug, title: titleKo ?? titleEn } : null,
    })),
  };
}

/** 홈 데이터 — 태그 `home`. 크롤러 완료 시 /api/revalidate 가 항상 무효화 */
export const getHomeData = unstable_cache(getHomeDataRaw, ["home"], { tags: ["home"], revalidate: 3600 });

// ---------- 검색 ----------

const SEARCH_DEFAULT_LIMIT = 24;
const TRGM_THRESHOLD = 0.25;

/** ILIKE 패턴 이스케이프 */
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}

/** 검색 결과에 붙일 플랫폼 요약: 게임별 최저가 플랫폼 */
async function attachBestPrice(rows: GameRow[]): Promise<GameSummary[]> {
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

/**
 * 제목 검색 조건 — 정규화 컬럼(title_en_norm/title_ko_norm)만 본다.
 * 원본 제목 대신 정규화본을 쓰므로 "엘든 링"/"엘든링", "철권8"/"철권 8" 이 같은 질의가 된다.
 * hit = 부분 문자열 포함, score = trigram 유사도(오타 허용). 호출부가 hit 먼저, score 순으로 정렬한다.
 */
function titleMatch(term: string) {
  const norm = normalizeForSearch(term);
  const pattern = `%${escapeLike(norm)}%`;
  return {
    norm,
    hit: sql<boolean>`(${games.titleEnNorm} like ${pattern} or ${games.titleKoNorm} like ${pattern})`,
    score: sql<number>`greatest(similarity(${games.titleEnNorm}, ${norm}), similarity(${games.titleKoNorm}, ${norm}))`,
  };
}

/** pg_trgm 확장이 없는 환경(undefined_function 42883) 판별 */
function isMissingTrgm(err: unknown): boolean {
  const code = (err as { code?: string; cause?: { code?: string } })?.code ?? (err as { cause?: { code?: string } })?.cause?.code;
  return code === "42883";
}

async function searchGamesRaw(q: string, limit: number): Promise<GameSummary[]> {
  const db = getDb();
  const { norm, hit, score } = titleMatch(q);
  if (!norm) return [];

  let rows: GameRow[];
  try {
    rows = await db
      .select()
      .from(games)
      .where(sql`${hit} or ${score} >= ${TRGM_THRESHOLD}`)
      .orderBy(sql`${hit} desc`, sql`${score} desc`, games.titleEn)
      .limit(limit);
  } catch (err) {
    if (!isMissingTrgm(err)) throw err;
    rows = await db.select().from(games).where(hit).orderBy(games.titleEn).limit(limit);
  }
  return attachBestPrice(rows);
}

/** 검색 — 검색어별 1시간 캐시 (§4.5 풀 라우트 캐시 보조) */
export async function searchGames(q: string, opts: { limit?: number } = {}): Promise<GameSummary[]> {
  const limit = Math.min(Math.max(opts.limit ?? SEARCH_DEFAULT_LIMIT, 1), 50);
  const key = q.trim().toLowerCase();
  if (!key) return [];
  const cached = unstable_cache(() => searchGamesRaw(key, limit), ["search", key, String(limit)], {
    tags: ["home"],
    revalidate: 3600,
  });
  return cached();
}

// ---------- 목록 (/games) ----------

export const GAMES_PAGE_SIZE = 36;

/** 정렬 키·쿼리스트링 변환은 lib/games-query (순수 유틸)에 있다 — 여기서는 조회만 한다 */
export type GameListFilter = Omit<GamesQuery, "platform"> & { platform?: Platform };

export type GameListResult = {
  items: GameSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/** 필터 UI 가 고를 수 있는 값 — 실제로 게임이 붙어 있는 것만 */
export type GameFacets = {
  platforms: Array<{ platform: Platform; count: number }>;
  genres: Array<{ name: string; count: number }>;
  total: number;
};

/**
 * 게임별 플랫폼 집계 서브쿼리. platform 필터가 있으면 그 플랫폼만 집계하므로
 * inner join 하는 것만으로 "그 플랫폼을 가진 게임"으로 좁혀진다.
 */
function platformAgg(platform?: Platform) {
  const db = getDb();
  return db
    .select({
      gameId: gamePlatforms.gameId,
      maxDiscount: sql<number>`max(coalesce(${gamePlatforms.discountPct}, 0))`.as("max_discount"),
      minPrice: sql<number | null>`min(${gamePlatforms.currentPrice})`.as("min_price"),
      maxRelease: sql<string | null>`max(${gamePlatforms.releaseDate})`.as("max_release"),
    })
    .from(gamePlatforms)
    .where(platform ? eq(gamePlatforms.platform, platform) : undefined)
    .groupBy(gamePlatforms.gameId)
    .as("agg");
}

async function listGamesRaw(filter: GameListFilter): Promise<GameListResult> {
  const db = getDb();
  const page = Math.max(filter.page ?? 1, 1);
  const sort = filter.sort ?? DEFAULT_GAME_SORT;
  const agg = platformAgg(filter.platform);

  const conds = [];
  if (filter.onSale) conds.push(sql`${agg.maxDiscount} > 0`);
  if (filter.genre) {
    conds.push(
      sql`exists (select 1 from ${gameGenres} inner join ${genres} on ${genres.id} = ${gameGenres.genreId}
                  where ${gameGenres.gameId} = ${games.id} and ${genres.name} = ${filter.genre})`,
    );
  }
  const term = filter.q ? normalizeForSearch(filter.q) : "";
  if (term) {
    const { hit, score } = titleMatch(filter.q!);
    conds.push(sql`(${hit} or ${score} >= ${TRGM_THRESHOLD})`);
  }
  const where = conds.length > 0 ? and(...conds) : undefined;

  // nulls last 로 값 없는 게임(가격 미수집·출시일 미상)이 앞을 차지하지 않게 한다
  const orderBy = {
    discount: [sql`${agg.maxDiscount} desc nulls last`, sql`${agg.minPrice} asc nulls last`],
    price: [sql`${agg.minPrice} asc nulls last`, sql`${agg.maxDiscount} desc nulls last`],
    release: [sql`${agg.maxRelease} desc nulls last`],
    title: [asc(sql`coalesce(${games.titleKo}, ${games.titleEn})`)],
  }[sort];

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(games)
    .innerJoin(agg, eq(agg.gameId, games.id))
    .where(where);

  const rows = await db
    .select({ game: games })
    .from(games)
    .innerJoin(agg, eq(agg.gameId, games.id))
    .where(where)
    // 같은 정렬값이 많을 때 페이지 경계에서 중복/누락이 나지 않도록 마지막 키는 항상 고유값(slug)
    .orderBy(...orderBy, asc(games.slug))
    .limit(GAMES_PAGE_SIZE)
    .offset((page - 1) * GAMES_PAGE_SIZE);

  return {
    items: await attachBestPrice(rows.map((r) => r.game)),
    total,
    page,
    pageSize: GAMES_PAGE_SIZE,
    totalPages: Math.max(Math.ceil(total / GAMES_PAGE_SIZE), 1),
  };
}

/** 목록 — 필터 조합별 1시간 캐시. 크롤러 완료 시 `home` 태그로 함께 무효화된다 */
export async function listGames(filter: GameListFilter): Promise<GameListResult> {
  const key = [filter.q?.trim().toLowerCase() ?? "", filter.platform ?? "", filter.genre ?? "", filter.onSale ? "sale" : "", filter.sort ?? DEFAULT_GAME_SORT, String(filter.page ?? 1)];
  const cached = unstable_cache(() => listGamesRaw(filter), ["games", ...key], { tags: ["home"], revalidate: 3600 });
  return cached();
}

async function getGameFacetsRaw(): Promise<GameFacets> {
  const db = getDb();
  const [platformRows, genreRows, [{ total }]] = await Promise.all([
    db
      .select({ platform: gamePlatforms.platform, count: sql<number>`count(distinct ${gamePlatforms.gameId})::int` })
      .from(gamePlatforms)
      .groupBy(gamePlatforms.platform),
    db
      .select({ name: genres.name, count: sql<number>`count(*)::int` })
      .from(gameGenres)
      .innerJoin(genres, eq(genres.id, gameGenres.genreId))
      .groupBy(genres.name),
    db.select({ total: sql<number>`count(*)::int` }).from(games),
  ]);
  return {
    platforms: platformRows.sort((a, b) => b.count - a.count),
    genres: genreRows.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ko")),
    total,
  };
}

/** 필터 선택지 — 게임 수가 늘어도 목록 페이지마다 다시 세지 않게 별도 캐시 */
export const getGameFacets = unstable_cache(getGameFacetsRaw, ["game-facets"], { tags: ["home"], revalidate: 3600 });

// ---------- 상세 ----------

const DETAIL_NEWS_LIMIT = 5;

export async function getGameBySlug(slug: string): Promise<GameDetail | null> {
  const db = getDb();
  const row = await db.query.games.findFirst({
    where: eq(games.slug, slug),
    with: {
      platforms: true,
      playtime: true,
      genres: { with: { genre: true } },
      news: { orderBy: desc(news.publishedAt), limit: DETAIL_NEWS_LIMIT },
      sourceRefs: true,
    },
  });
  if (!row) return null;

  const platformOrder: Platform[] = ["steam", "ps5", "ps4", "xbox", "switch", "switch2"];
  const platforms = [...row.platforms]
    .sort((a, b) => platformOrder.indexOf(a.platform) - platformOrder.indexOf(b.platform))
    .map(toPlatformDto);

  return {
    id: row.id,
    slug: row.slug,
    titleKo: row.titleKo,
    titleEn: row.titleEn,
    description: row.description,
    coverUrl: row.coverUrl,
    portraitUrl: row.portraitUrl,
    developer: row.developer,
    publisher: row.publisher,
    localMaxPlayers: row.localMaxPlayers,
    onlineMaxPlayers: row.onlineMaxPlayers,
    supportsSolo: row.supportsSolo ?? true,
    supportsCoop: row.supportsCoop ?? false,
    supportsPvp: row.supportsPvp ?? false,
    isRetro: row.isRetro ?? false,
    updatedAt: row.updatedAt.toISOString(),
    genres: row.genres.map((gg) => gg.genre.name).sort(),
    platforms,
    playtime: row.playtime
      ? {
          mainStoryHours: row.playtime.mainStoryHours,
          mainExtraHours: row.playtime.mainExtraHours,
          completionistHours: row.playtime.completionistHours,
          lastSyncedAt: iso(row.playtime.lastSyncedAt),
        }
      : null,
    news: row.news.map((n) => ({
      id: n.id,
      title: n.title,
      url: n.url,
      sourceName: n.sourceName,
      thumbnailUrl: n.thumbnailUrl,
      publishedAt: n.publishedAt.toISOString(),
    })),
    // 공개 화면 "정보 출처"는 확정된 매핑(auto/manual)만. pending(검수 대기)·none(미매칭 기록)은 노출하지 않는다
    sourceRefs: row.sourceRefs
      .filter((r) => r.matchedBy === "auto" || r.matchedBy === "manual")
      .map((r) => ({ source: r.source, externalId: r.externalId, url: r.url })),
  };
}

/** 상세 — 태그 `game:<slug>` (§4.5). 크롤러가 해당 게임 갱신 후 revalidateTag 호출 */
export async function getGameBySlugCached(slug: string): Promise<GameDetail | null> {
  const cached = unstable_cache(() => getGameBySlug(slug), ["game", slug], { tags: [`game:${slug}`] });
  return cached();
}

/** 공개 API(/api/v1) 용 DTO — 내부 id 제외 */
export type PublicGameDto = Omit<GameDetail, "id" | "news"> & {
  news: Array<Omit<NewsDto, "id" | "game">>;
};

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
