// 소스 1개 동기화 실행 — 설계서 §4.4 흐름 8단계.
//  1. Redis 락  2. sync_logs INSERT  3. 대상 목록  4. fetch(재시도·간격) → 변경 시에만 반영
//  5. 가격 변동 → dispatch-alerts  6. sync_logs UPDATE  7. /api/revalidate  8. 락 해제
// 계층: adapter → sync(이 파일) → db. 어댑터는 가져오기만, DB 반영은 여기서만.
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { getDb, type Db } from "@/server/db/client";
import {
  dataCorrections,
  gameGenres,
  gamePlatforms,
  gameSourceRefs,
  games,
  genres,
  news,
  playtimes,
  priceSnapshots,
  syncLogs,
  type Platform,
  type SyncStatus,
} from "@/server/db/schema";
import { acquireLock, releaseLock } from "@/server/redis";
import {
  getMetaAdapter,
  getNewsAdapter,
  getStoreAdapter,
  isMetaSource,
  isNewsSource,
  isStoreSource,
  type MetaSource,
  type StoreSource,
} from "@/server/adapters";
import { AdapterError, CRAWLER_USER_AGENT, type MetaSnapshot, type NewsItem, type Source, type StoreSnapshot } from "@/server/adapters/types";
import { fetchSteamTopAppIds } from "@/server/adapters/steam";
import { RSS_FEEDS } from "@/server/adapters/news-rss";
import { slugify, slugWithSuffix } from "@/lib/slug";
import { dispatchPriceAlerts, type DispatchSummary, type PriceChange } from "./dispatch-alerts";

// ---- 상수 ----
export const LOCK_TTL_SEC = 3600;
export const RETRY_DELAYS_MS = [1000, 4000, 16000]; // 재시도 3회 지수 백오프
/** 소스별 배치 크기 (§4.4: 200~500, §9: 1회 5분 이내) */
export const BATCH_SIZE: Record<Source, number> = {
  steam: 300, psstore: 200, xbox: 200, nintendo: 200,
  hltb: 200, opencritic: 300, metacritic: 200,
  rss: RSS_FEEDS.length,
};
/** 스토어 소스 → 담당 플랫폼 (§11-6: PS4/PS5, Switch/Switch2 분리 유지) */
export const SOURCE_PLATFORMS: Record<StoreSource, Platform[]> = {
  steam: ["steam"], psstore: ["ps5", "ps4"], xbox: ["xbox"], nintendo: ["switch", "switch2"],
};
/** §10 파싱 검증: 성공 건 중 가격 0/null 비율이 이 값을 넘으면 반영 생략 + partial */
export const SUSPICIOUS_PRICE_RATIO = 0.5;
const SUSPICIOUS_MIN_SAMPLE = 10;
const ERROR_SAMPLE_MAX = 3;
/** 뉴스 제목 매칭 시 너무 짧은 게임 제목은 제외 (오매칭 방지) */
const NEWS_MATCH_MIN_TITLE_LEN = 4;
const REVALIDATE_TIMEOUT_MS = 15_000;

export interface RunOptions {
  /** 배치 크기 덮어쓰기 */
  limit?: number;
  /** steam 전용: 인기/할인 목록 상위 N개 appid 를 신규 시드 */
  seedTop?: number;
}

export interface RunResult {
  source: Source;
  status: SyncStatus | "skipped";
  processed: number;
  failed: number;
  changed: number;
  errorSample?: string;
  alerts?: DispatchSummary;
}

// ---- 내부 컨텍스트 ----
interface Ctx {
  db: Db;
  source: Source;
  now: Date;
  locks: Set<string>;
  processed: number;
  failed: number;
  errors: string[];
  changedSlugs: Set<string>;
  priceChanges: PriceChange[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const toSnake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

/** 재시도 3회(1s/4s/16s). retryable=false 인 AdapterError 는 즉시 실패 */
export async function fetchWithRetry<T>(fn: () => Promise<T>, delays: number[] = RETRY_DELAYS_MS): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (e instanceof AdapterError && !e.retryable) throw e;
      if (attempt < delays.length) await sleep(delays[attempt]);
    }
  }
  throw lastErr;
}

/** data_corrections.lock_field=true 인 (table,row_id,field) 집합. 키는 snake_case 로 정규화 */
async function loadLockedFields(db: Db): Promise<Set<string>> {
  const rows = await db
    .select({ table: dataCorrections.table, rowId: dataCorrections.rowId, field: dataCorrections.field })
    .from(dataCorrections)
    .where(eq(dataCorrections.lockField, true));
  return new Set(rows.map((r) => `${toSnake(r.table)}:${r.rowId}:${toSnake(r.field)}`));
}

function isLocked(ctx: Ctx, table: string, rowId: string, field: string): boolean {
  return ctx.locks.has(`${toSnake(table)}:${rowId}:${toSnake(field)}`);
}

function recordError(ctx: Ctx, label: string, e: unknown): void {
  ctx.failed++;
  const msg = `[${label}] ${errMsg(e)}`;
  if (ctx.errors.length < ERROR_SAMPLE_MAX) ctx.errors.push(msg);
  console.warn(`[sync:${ctx.source}] ${msg}`);
}

// =====================================================================
// 스토어 소스 (steam / psstore / xbox / nintendo)
// =====================================================================
interface StoreTarget {
  gameId: string | null; // null = 신규 시드 (Steam 전용)
  slug: string | null;
  externalId: string;
}

async function listStoreTargets(ctx: Ctx, source: StoreSource, limit: number, seedTop?: number): Promise<StoreTarget[]> {
  const { db } = ctx;
  const platforms = SOURCE_PLATFORMS[source];
  const rows = await db
    .select({ gameId: gameSourceRefs.gameId, externalId: gameSourceRefs.externalId, slug: games.slug })
    .from(gameSourceRefs)
    .innerJoin(games, eq(games.id, gameSourceRefs.gameId))
    .leftJoin(gamePlatforms, and(eq(gamePlatforms.gameId, gameSourceRefs.gameId), inArray(gamePlatforms.platform, platforms)))
    .where(and(eq(gameSourceRefs.source, source), ne(gameSourceRefs.matchedBy, "pending")))
    .orderBy(sql`${gamePlatforms.lastSyncedAt} asc nulls first`)
    .limit(limit);

  const seen = new Set<string>();
  const targets: StoreTarget[] = [];
  for (const r of rows) {
    const key = `${r.gameId}:${r.externalId}`;
    if (seen.has(key)) continue; // psstore/nintendo 는 플랫폼 2개 조인으로 중복 가능
    seen.add(key);
    targets.push({ gameId: r.gameId, slug: r.slug, externalId: r.externalId });
  }

  // Steam 신규 시드 (§4.2-1, §11-1 상위 N개)
  if (source === "steam" && seedTop && seedTop > 0) {
    const appIds = await fetchSteamTopAppIds(seedTop);
    if (appIds.length > 0) {
      const existing = await db
        .select({ externalId: gameSourceRefs.externalId })
        .from(gameSourceRefs)
        .where(and(eq(gameSourceRefs.source, "steam"), inArray(gameSourceRefs.externalId, appIds)));
      const known = new Set(existing.map((e) => e.externalId));
      for (const id of appIds) {
        if (!known.has(id) && !seen.has(`seed:${id}`)) {
          seen.add(`seed:${id}`);
          targets.unshift({ gameId: null, slug: null, externalId: id });
        }
      }
    }
  }
  return targets;
}

/** slug 충돌 처리: base → base-<externalId> → base-<externalId>-<ts> */
async function uniqueSlug(db: Db, titleEn: string, externalId: string): Promise<string> {
  const base = slugify(titleEn);
  const candidates = [base, slugWithSuffix(base, externalId), slugWithSuffix(base, `${externalId}-${Date.now()}`)];
  for (const c of candidates) {
    const hit = await db.query.games.findFirst({ where: eq(games.slug, c), columns: { id: true } });
    if (!hit) return c;
  }
  return candidates[candidates.length - 1];
}

async function linkGenres(db: Db, gameId: string, names: string[]): Promise<void> {
  const clean = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean)));
  if (clean.length === 0) return;
  await db.insert(genres).values(clean.map((name) => ({ name }))).onConflictDoNothing();
  const rows = await db.select({ id: genres.id }).from(genres).where(inArray(genres.name, clean));
  if (rows.length === 0) return;
  await db.insert(gameGenres).values(rows.map((g) => ({ gameId, genreId: g.id }))).onConflictDoNothing();
}

/** Steam 스냅샷의 meta 로 games 신규 생성 + refs 등록 */
async function createGameFromSnapshot(ctx: Ctx, snapshot: StoreSnapshot): Promise<{ id: string; slug: string }> {
  const meta = snapshot.meta;
  if (!meta?.titleEn) throw new AdapterError(`appid ${snapshot.storeExternalId}: meta.titleEn 없음 — 게임 생성 불가`, ctx.source, false);
  const { db } = ctx;
  const slug = await uniqueSlug(db, meta.titleEn, snapshot.storeExternalId);
  const mp = meta.multiplayer;
  const [game] = await db
    .insert(games)
    .values({
      slug,
      titleEn: meta.titleEn,
      titleKo: meta.titleKo ?? null,
      description: meta.description ?? null,
      coverUrl: meta.coverUrl ?? null,
      developer: meta.developer ?? null,
      publisher: meta.publisher ?? null,
      supportsSolo: mp?.solo ?? true,
      supportsCoop: mp?.coop ?? false,
      supportsPvp: mp?.pvp ?? false,
      localMaxPlayers: mp?.localMax ?? null,
      onlineMaxPlayers: mp?.onlineMax ?? null,
      createdAt: ctx.now,
      updatedAt: ctx.now,
    })
    .returning({ id: games.id, slug: games.slug });
  await db
    .insert(gameSourceRefs)
    .values({ gameId: game.id, source: ctx.source, externalId: snapshot.storeExternalId, url: snapshot.storeUrl, matchedBy: "auto", confidence: "1.00" })
    .onConflictDoNothing();
  await linkGenres(db, game.id, meta.genres ?? []);
  return game;
}

/** 기존 게임의 마스터 정보 갱신 (Steam 기준 소스). 값 변경 시에만, null 로 덮지 않음, 잠긴 필드 제외 */
async function updateGameMeta(ctx: Ctx, gameId: string, slug: string, meta: NonNullable<StoreSnapshot["meta"]>): Promise<void> {
  const { db } = ctx;
  const cur = await db.query.games.findFirst({ where: eq(games.id, gameId) });
  if (!cur) return;
  const set: Partial<typeof games.$inferInsert> = {};
  const consider = <K extends keyof typeof games.$inferInsert>(field: K, value: (typeof games.$inferInsert)[K] | null | undefined) => {
    if (value === null || value === undefined) return;
    if (isLocked(ctx, "games", gameId, field)) return;
    if (cur[field as keyof typeof cur] !== value) set[field] = value;
  };
  consider("titleEn", meta.titleEn);
  consider("titleKo", meta.titleKo);
  consider("description", meta.description);
  consider("coverUrl", meta.coverUrl);
  consider("developer", meta.developer);
  consider("publisher", meta.publisher);
  if (meta.multiplayer) {
    consider("supportsSolo", meta.multiplayer.solo);
    consider("supportsCoop", meta.multiplayer.coop);
    consider("supportsPvp", meta.multiplayer.pvp);
    consider("localMaxPlayers", meta.multiplayer.localMax);
    consider("onlineMaxPlayers", meta.multiplayer.onlineMax);
  }
  if (Object.keys(set).length === 0) return;
  await db.update(games).set({ ...set, updatedAt: ctx.now }).where(eq(games.id, gameId));
  ctx.changedSlugs.add(slug);
}

const PLATFORM_FIELDS = ["storeExternalId", "storeUrl", "releaseDate", "currentVersion", "listPrice", "currentPrice", "discountPct"] as const;
const PRICE_FIELDS = new Set<string>(["listPrice", "currentPrice", "discountPct"]);

/** game_platforms upsert + 변경 시 price_snapshots INSERT. 가격 변동은 ctx.priceChanges 에 기록 */
async function upsertPlatform(ctx: Ctx, gameId: string, slug: string, snapshot: StoreSnapshot): Promise<void> {
  const { db } = ctx;
  const existing = await db.query.gamePlatforms.findFirst({
    where: and(eq(gamePlatforms.gameId, gameId), eq(gamePlatforms.platform, snapshot.platform)),
  });

  if (!existing) {
    const [row] = await db
      .insert(gamePlatforms)
      .values({
        gameId,
        platform: snapshot.platform,
        storeExternalId: snapshot.storeExternalId,
        storeUrl: snapshot.storeUrl,
        releaseDate: snapshot.releaseDate ?? null,
        currentVersion: snapshot.currentVersion ?? null,
        listPrice: snapshot.listPrice,
        currentPrice: snapshot.currentPrice,
        discountPct: snapshot.discountPct,
        lastSyncedAt: ctx.now,
        syncStatus: "ok",
      })
      .returning({ id: gamePlatforms.id });
    if (snapshot.currentPrice !== null) {
      const [snap] = await db
        .insert(priceSnapshots)
        .values({ gamePlatformId: row.id, price: snapshot.currentPrice, discountPct: snapshot.discountPct ?? 0, capturedAt: ctx.now })
        .returning({ id: priceSnapshots.id });
      ctx.priceChanges.push({ gamePlatformId: row.id, snapshotId: snap.id, previousPrice: null, newPrice: snapshot.currentPrice });
    }
    ctx.changedSlugs.add(slug);
    return;
  }

  const set: Partial<typeof gamePlatforms.$inferInsert> = {};
  for (const field of PLATFORM_FIELDS) {
    const value = snapshot[field];
    if (value === null || value === undefined) continue; // 절대 null 로 덮지 않음
    if (isLocked(ctx, "game_platforms", existing.id, field)) continue;
    if (existing[field] !== value) (set as Record<string, unknown>)[field] = value;
  }
  const priceChanged = Object.keys(set).some((k) => PRICE_FIELDS.has(k));

  await db
    .update(gamePlatforms)
    .set({ ...set, lastSyncedAt: ctx.now, syncStatus: "ok" })
    .where(eq(gamePlatforms.id, existing.id));

  if (priceChanged) {
    const newPrice = set.currentPrice ?? existing.currentPrice;
    if (newPrice !== null && newPrice !== undefined) {
      const [snap] = await db
        .insert(priceSnapshots)
        .values({ gamePlatformId: existing.id, price: newPrice, discountPct: set.discountPct ?? existing.discountPct ?? 0, capturedAt: ctx.now })
        .returning({ id: priceSnapshots.id });
      if (set.currentPrice !== undefined) {
        ctx.priceChanges.push({ gamePlatformId: existing.id, snapshotId: snap.id, previousPrice: existing.currentPrice, newPrice });
      }
    }
  }
  if (Object.keys(set).length > 0) ctx.changedSlugs.add(slug);
}

/** 항목 실패 시 해당 플랫폼 행을 failed 로 표시 (값은 유지, §4.6 신선도 경고용) */
async function markPlatformFailed(ctx: Ctx, gameId: string, platforms: Platform[]): Promise<void> {
  await ctx.db
    .update(gamePlatforms)
    .set({ syncStatus: "failed" })
    .where(and(eq(gamePlatforms.gameId, gameId), inArray(gamePlatforms.platform, platforms)));
}

async function runStore(ctx: Ctx, source: StoreSource, opts: RunOptions): Promise<void> {
  const adapter = getStoreAdapter(source);
  const targets = await listStoreTargets(ctx, source, opts.limit ?? BATCH_SIZE[source], opts.seedTop);
  console.log(`[sync:${source}] 대상 ${targets.length}건 (신규 시드 ${targets.filter((t) => t.gameId === null).length})`);

  // 1단계: 수집 (검증을 위해 반영 전에 전부 모은다)
  const fetched: Array<{ target: StoreTarget; snapshot: StoreSnapshot }> = [];
  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    try {
      const snapshot = await fetchWithRetry(() => adapter.fetch(target.externalId));
      fetched.push({ target, snapshot });
    } catch (e) {
      recordError(ctx, `${source}:${target.externalId}`, e);
      if (target.gameId) await markPlatformFailed(ctx, target.gameId, SOURCE_PLATFORMS[source]);
    }
    if (i < targets.length - 1) await sleep(adapter.minIntervalMs);
  }

  // 2단계: §10 파싱 검증 — 가격 0/null 급증 시 반영 생략
  const suspicious = fetched.filter((f) => f.snapshot.currentPrice === null || f.snapshot.currentPrice === 0).length;
  if (fetched.length >= SUSPICIOUS_MIN_SAMPLE && suspicious / fetched.length > SUSPICIOUS_PRICE_RATIO) {
    const msg = `가격 검증 실패: ${fetched.length}건 중 ${suspicious}건이 0원/null — 반영 생략 (마크업/응답 변경 의심)`;
    ctx.errors.unshift(msg);
    ctx.failed += fetched.length;
    console.warn(`[sync:${source}] ${msg}`);
    return;
  }

  // 3단계: 반영
  for (const { target, snapshot } of fetched) {
    try {
      let gameId = target.gameId;
      let slug = target.slug;
      if (!gameId || !slug) {
        const created = await createGameFromSnapshot(ctx, snapshot);
        gameId = created.id;
        slug = created.slug;
        ctx.changedSlugs.add(slug);
      } else if (source === "steam" && snapshot.meta) {
        await updateGameMeta(ctx, gameId, slug, snapshot.meta);
      }
      await upsertPlatform(ctx, gameId, slug, snapshot);
      ctx.processed++;
    } catch (e) {
      recordError(ctx, `${source}:${target.externalId}:db`, e);
    }
  }
}

// =====================================================================
// 메타 소스 (hltb / opencritic / metacritic)
// =====================================================================
interface MetaTarget {
  gameId: string;
  slug: string;
  externalId: string;
}

async function listMetaTargets(ctx: Ctx, source: MetaSource, limit: number): Promise<MetaTarget[]> {
  const { db } = ctx;
  const base = db
    .select({ gameId: gameSourceRefs.gameId, externalId: gameSourceRefs.externalId, slug: games.slug })
    .from(gameSourceRefs)
    .innerJoin(games, eq(games.id, gameSourceRefs.gameId));
  if (source === "hltb") {
    return base
      .leftJoin(playtimes, eq(playtimes.gameId, gameSourceRefs.gameId))
      .where(and(eq(gameSourceRefs.source, source), ne(gameSourceRefs.matchedBy, "pending")))
      .orderBy(sql`${playtimes.lastSyncedAt} asc nulls first`)
      .limit(limit);
  }
  // 평점 소스는 소스별 동기화 시각이 없어 games.updated_at 오래된 순
  return base
    .where(and(eq(gameSourceRefs.source, source), ne(gameSourceRefs.matchedBy, "pending")))
    .orderBy(games.updatedAt)
    .limit(limit);
}

const hoursToNumeric = (h: number) => h.toFixed(1);

async function applyPlaytime(ctx: Ctx, target: MetaTarget, snapshot: MetaSnapshot): Promise<void> {
  const pt = snapshot.playtime;
  if (!pt) return;
  const { db } = ctx;
  const existing = await db.query.playtimes.findFirst({ where: eq(playtimes.gameId, target.gameId) });
  const fields = [
    ["mainStoryHours", pt.main],
    ["mainExtraHours", pt.extra],
    ["completionistHours", pt.completionist],
  ] as const;
  const set: Partial<typeof playtimes.$inferInsert> = {};
  for (const [field, value] of fields) {
    if (value === null || value === undefined) continue;
    if (isLocked(ctx, "playtimes", target.gameId, field)) continue;
    const next = hoursToNumeric(value);
    const cur = existing?.[field];
    if (cur === null || cur === undefined || Number(cur) !== Number(next)) set[field] = next;
  }
  if (!existing) {
    await db.insert(playtimes).values({ gameId: target.gameId, ...set, lastSyncedAt: ctx.now }).onConflictDoNothing();
    ctx.changedSlugs.add(target.slug);
    return;
  }
  await db.update(playtimes).set({ ...set, lastSyncedAt: ctx.now }).where(eq(playtimes.gameId, target.gameId));
  if (Object.keys(set).length > 0) ctx.changedSlugs.add(target.slug);
}

async function applyScore(ctx: Ctx, target: MetaTarget, field: "opencriticScore" | "metacriticScore", score: number | null | undefined): Promise<void> {
  if (score === null || score === undefined) return; // 점수 없음 → 기존 값 유지
  const { db } = ctx;
  const rows = await db
    .select({ id: gamePlatforms.id, current: gamePlatforms[field] })
    .from(gamePlatforms)
    .where(eq(gamePlatforms.gameId, target.gameId));
  let changed = false;
  for (const row of rows) {
    if (row.current === score) continue;
    if (isLocked(ctx, "game_platforms", row.id, field)) continue;
    await db.update(gamePlatforms).set({ [field]: score }).where(eq(gamePlatforms.id, row.id));
    changed = true;
  }
  // 다음 배치 순서를 위해 games.updated_at 갱신
  await db.update(games).set({ updatedAt: ctx.now }).where(eq(games.id, target.gameId));
  if (changed) ctx.changedSlugs.add(target.slug);
}

async function runMeta(ctx: Ctx, source: MetaSource, opts: RunOptions): Promise<void> {
  const adapter = getMetaAdapter(source);
  const targets = await listMetaTargets(ctx, source, opts.limit ?? BATCH_SIZE[source]);
  console.log(`[sync:${source}] 대상 ${targets.length}건`);
  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    try {
      const snapshot = await fetchWithRetry(() => adapter.fetch(target.externalId));
      if (source === "hltb") await applyPlaytime(ctx, target, snapshot);
      else if (source === "opencritic") await applyScore(ctx, target, "opencriticScore", snapshot.scores?.opencritic);
      else await applyScore(ctx, target, "metacriticScore", snapshot.scores?.metacritic);
      ctx.processed++;
    } catch (e) {
      recordError(ctx, `${source}:${target.externalId}`, e);
    }
    if (i < targets.length - 1) await sleep(adapter.minIntervalMs);
  }
}

// =====================================================================
// 뉴스 (rss)
// =====================================================================
interface TitleIndex {
  id: string;
  slug: string;
  needles: string[]; // 소문자 제목들
}

/** 뉴스 제목에 games.title_en / title_ko 가 포함되면 연결. 가장 긴 제목이 매칭된 게임 우선. 없으면 null */
export function matchNewsToGame(title: string, index: TitleIndex[]): TitleIndex | null {
  const hay = title.toLowerCase();
  let best: { game: TitleIndex; len: number } | null = null;
  for (const g of index) {
    for (const needle of g.needles) {
      if (needle.length < NEWS_MATCH_MIN_TITLE_LEN) continue;
      if (hay.includes(needle) && (!best || needle.length > best.len)) best = { game: g, len: needle.length };
    }
  }
  return best?.game ?? null;
}

async function runNews(ctx: Ctx): Promise<void> {
  const adapter = getNewsAdapter("rss");
  const { db } = ctx;
  const titleRows = await db.select({ id: games.id, slug: games.slug, titleEn: games.titleEn, titleKo: games.titleKo }).from(games);
  const index: TitleIndex[] = titleRows.map((g) => ({
    id: g.id,
    slug: g.slug,
    needles: [g.titleEn, g.titleKo].filter((t): t is string => Boolean(t)).map((t) => t.toLowerCase()),
  }));

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
        publishedAt: new Date(it.publishedAt),
      };
    });
    try {
      await db.insert(news).values(values).onConflictDoNothing({ target: news.url });
      ctx.processed += values.length;
    } catch (e) {
      recordError(ctx, `rss:${feed.name}:db`, e);
    }
    if (i < RSS_FEEDS.length - 1) await sleep(adapter.minIntervalMs);
  }
}

// =====================================================================
// revalidate (§4.4-7, §4.5)
// =====================================================================
async function revalidateGameTags(slugs: string[]): Promise<void> {
  if (slugs.length === 0) return;
  const base = process.env.NEXT_PUBLIC_APP_URL;
  const secret = process.env.CRAWL_SECRET;
  if (!base || !secret) {
    console.warn("[sync] NEXT_PUBLIC_APP_URL / CRAWL_SECRET 없음 — revalidate 생략");
    return;
  }
  const tags = slugs.map((s) => `game:${s}`);
  const res = await fetch(`${base.replace(/\/$/, "")}/api/revalidate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-crawl-secret": secret, "User-Agent": CRAWLER_USER_AGENT },
    body: JSON.stringify({ tags }),
    signal: AbortSignal.timeout(REVALIDATE_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`revalidate HTTP ${res.status}`);
}

// =====================================================================
// 진입점
// =====================================================================
export async function runSource(source: Source, opts: RunOptions = {}): Promise<RunResult> {
  const lockKey = `lock:${source}`;
  if (!(await acquireLock(lockKey, LOCK_TTL_SEC))) {
    console.log(`[sync:${source}] 이미 실행 중 (락 존재) — 종료`);
    return { source, status: "skipped", processed: 0, failed: 0, changed: 0 };
  }

  const db = getDb();
  const now = new Date();
  let logId: number | null = null;
  try {
    const [log] = await db.insert(syncLogs).values({ source, status: "ok", startedAt: now }).returning({ id: syncLogs.id });
    logId = log.id;

    const ctx: Ctx = {
      db, source, now,
      locks: await loadLockedFields(db),
      processed: 0, failed: 0, errors: [],
      changedSlugs: new Set(), priceChanges: [],
    };

    if (isStoreSource(source)) await runStore(ctx, source, opts);
    else if (isMetaSource(source)) await runMeta(ctx, source, opts);
    else if (isNewsSource(source)) await runNews(ctx);

    // 5. 알림 (§7) — 실패해도 동기화 결과는 유지
    let alerts: DispatchSummary | undefined;
    if (ctx.priceChanges.length > 0) {
      try {
        alerts = await dispatchPriceAlerts(ctx.priceChanges);
        console.log(`[sync:${source}] 알림: ${JSON.stringify(alerts)}`);
      } catch (e) {
        recordError(ctx, "alerts", e);
      }
    }

    // 7. 캐시 무효화 — 실패는 partial 사유로만 기록
    try {
      await revalidateGameTags(Array.from(ctx.changedSlugs));
    } catch (e) {
      recordError(ctx, "revalidate", e);
    }

    const status: SyncStatus = ctx.failed === 0 ? "ok" : ctx.processed === 0 ? "failed" : "partial";
    const errorSample = ctx.errors.length ? ctx.errors.join("\n").slice(0, 1000) : null;
    await db
      .update(syncLogs)
      .set({ status, processed: ctx.processed, failed: ctx.failed, errorSample, finishedAt: new Date() })
      .where(eq(syncLogs.id, logId));

    return { source, status, processed: ctx.processed, failed: ctx.failed, changed: ctx.changedSlugs.size, errorSample: errorSample ?? undefined, alerts };
  } catch (e) {
    const message = errMsg(e);
    console.error(`[sync:${source}] 치명적 오류: ${message}`);
    if (logId !== null) {
      await db
        .update(syncLogs)
        .set({ status: "failed", errorSample: message.slice(0, 1000), finishedAt: new Date() })
        .where(eq(syncLogs.id, logId))
        .catch(() => undefined);
    }
    return { source, status: "failed", processed: 0, failed: 0, changed: 0, errorSample: message };
  } finally {
    await releaseLock(lockKey).catch((e) => console.warn(`[sync:${source}] 락 해제 실패: ${errMsg(e)}`));
  }
}
