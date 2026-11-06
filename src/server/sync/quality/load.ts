// 데이터 점검기의 읽기. 규칙(rules.ts)이 판정할 재료를 받아 온다.
// 질의를 한 묶음(Promise.all)으로 보낸다 — 줄 세우면 Neon 왕복이 그대로 쌓인다(하루 크론의 60초 안에 든다).
//
// 규칙이 실제로 볼 행만 묻는다(2026-11-06). 카탈로그 전체(게임 8만, 플랫폼 행 12만, 연결 9만)를 통째로 받으면
// 한 회차가 31MB 였다 — Neon HTTP 응답은 압축되지 않아 하루 크론 하나가 월 1GB 꼴을 먹고, 무료 전송량은 월 5GB 다.
// 거르는 조건은 규칙의 조건보다 늘 넓게 잡는다(판정은 규칙이 다시 한다). 좁게 잡으면 판정이 소리 없이 빠진다.
//   게임        제목, 갈래, 부모는 전부 받는다. 부모 옮기기, 같은 제목 중복, 섞인 정체가 카탈로그 전체 제목과 견준다. slug 만 뺐다
//   플랫폼 행    빈 출시일이 있는 파는 행 + 출시가 최근인 게임의 행만(findReleaseDateGaps 의 조건)
//   값 붙은 게임  부모로 쓰이는 게임만(findParentMoreSpecific 이 부모만 묻는다)
//   스토어 번호, slug  같은 제목 본편 두 줄의 게임만(findDuplicateTitles). 그래서 이 둘은 첫 묶음 뒤에 한 번 더 묻는다
//   제목 남은 연결  그런 연결이 둘 이상이고 자동 연결이 끼어 있는 게임만(findMixedIdentity 는 하나뿐이면 보지 않는다)
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { dataCorrections, dataIssues, gamePlatforms, games, gameSourceRefs } from "@/server/db/schema";
import { RELEASE_RECENT_DAYS, type QualityGame, type QualityPlatformRow, type QualityRule, type SharedStoreId } from "./rules";
import type { QualityRef } from "./rules-identity";
import { duplicateTitlePairs } from "./rules-structure";

/** 공유를 따질 연결. pending, none 은 아직 확정이 아니라 둘이 같은 id 를 쥐어도 문제가 아니다 */
const CONFIRMED_MATCHES = ["auto", "manual"];
/** 상품 번호가 갈리면 다른 상품인 스토어. 메타 소스(hltb, wikidata 등)는 한 항목을 여러 판이 나눠 써서 뺀다 */
const STORE_SOURCES = ["steam", "epic", "xbox", "psstore", "nintendo", "nintendo_jp"] as const;
/** 섞인 정체 규칙이 보는 최소 연결 수(rules-identity 의 `list.length < 2`) */
const MIXED_MIN_REFS = 2;
/** 최근 출시 거르기의 여유 날수. 규칙은 지금 시각으로 날수를 재고 SQL 은 날짜로 자른다 — 하루 넓게 잡아 경계 행을 놓치지 않는다 */
const RECENT_SLACK_DAYS = 1;
const DAY_MS = 86_400_000;

export interface QualityInput {
  games: QualityGame[];
  platforms: QualityPlatformRow[];
  /** 값 붙은 플랫폼이 있는 게임. 부모로 쓰이는 게임만 담는다 */
  pricedGameIds: Set<string>;
  lockedParent: Set<string>;
  shared: SharedStoreId[];
  /** 같은 제목 본편 두 줄 게임의 확정 스토어 상품 번호. 정말 같은 상품인지 가른다 */
  storeIds: Map<string, Record<string, string>>;
  /** 확정 연결 중 후보 제목이 남은 것. 한 행에 다른 게임 연결이 섞였는지 가른다(rules-identity) */
  titledRefs: QualityRef[];
  /** 이미 남긴 판정. 열쇠는 `${rule}:${subjectKey}` */
  issues: Map<string, { id: string; status: "open" | "applied" | "dismissed" }>;
}

export const issueKey = (rule: QualityRule | string, subjectKey: string) => `${rule}:${subjectKey}`;

/** 출시일 규칙이 볼 수 있는 가장 이른 날(YYYY-MM-DD) */
export function recentReleaseCutoff(now: Date): string {
  return new Date(now.getTime() - (RELEASE_RECENT_DAYS + RECENT_SLACK_DAYS) * DAY_MS).toISOString().slice(0, 10);
}

export async function loadQualityInput(db: Db, now: Date = new Date()): Promise<QualityInput> {
  const confirmed = inArray(gameSourceRefs.matchedBy, CONFIRMED_MATCHES);
  const [gameRows, platformRows, pricedRows, lockRows, sharedRows, issueRows, titledRows] = await Promise.all([
    db.select({ id: games.id, titleEn: games.titleEn, contentType: games.contentType, parentGameId: games.parentGameId }).from(games),
    db
      .select({ id: gamePlatforms.id, gameId: gamePlatforms.gameId, platform: gamePlatforms.platform, releaseDate: gamePlatforms.releaseDate, price: gamePlatforms.currentPrice })
      .from(gamePlatforms)
      .where(
        sql`${gamePlatforms.gameId} in (
          select gp.game_id from game_platforms gp group by gp.game_id
          having bool_or(gp.release_date is null and gp.current_price is not null)
             and min(gp.release_date) >= ${recentReleaseCutoff(now)}::date)`,
      ),
    db
      .selectDistinct({ gameId: gamePlatforms.gameId })
      .from(gamePlatforms)
      .where(
        and(
          isNotNull(gamePlatforms.currentPrice),
          sql`exists (select 1 from games c where c.parent_game_id = ${gamePlatforms.gameId})`,
        ),
      ),
    db
      .select({ rowId: dataCorrections.rowId })
      .from(dataCorrections)
      .where(and(eq(dataCorrections.lockField, true), eq(dataCorrections.table, "games"), eq(dataCorrections.field, "parentGameId"))),
    db
      .select({
        source: sql<string>`${gameSourceRefs.source}::text`,
        externalId: gameSourceRefs.externalId,
        gameIds: sql<string[]>`array_agg(distinct ${gameSourceRefs.gameId}::text)`,
      })
      .from(gameSourceRefs)
      .where(confirmed)
      .groupBy(gameSourceRefs.source, gameSourceRefs.externalId)
      .having(sql`count(distinct ${gameSourceRefs.gameId}) > 1`),
    db.select({ id: dataIssues.id, rule: dataIssues.rule, subjectKey: dataIssues.subjectKey, status: dataIssues.status }).from(dataIssues),
    db
      .select({
        gameId: gameSourceRefs.gameId,
        source: sql<string>`${gameSourceRefs.source}::text`,
        externalId: gameSourceRefs.externalId,
        matchedTitle: sql<string>`${gameSourceRefs.matchedTitle}`,
        matchedBy: sql<"auto" | "manual">`${gameSourceRefs.matchedBy}::text`,
      })
      .from(gameSourceRefs)
      .where(
        and(
          confirmed,
          isNotNull(gameSourceRefs.matchedTitle),
          sql`${gameSourceRefs.gameId} in (
            select r.game_id from game_source_refs r
            where r.matched_by in ('auto', 'manual') and r.matched_title is not null
            group by r.game_id
            having count(*) >= ${MIXED_MIN_REFS}::int and bool_or(r.matched_by = 'auto'))`,
        ),
      ),
  ]);

  const pairIds = duplicateTitlePairs(gameRows).flat().map((g) => g.id);
  const [refRows, slugRows] =
    pairIds.length === 0
      ? [[], []]
      : await Promise.all([
          db
            .select({ gameId: gameSourceRefs.gameId, source: sql<string>`${gameSourceRefs.source}::text`, externalId: gameSourceRefs.externalId })
            .from(gameSourceRefs)
            .where(and(confirmed, inArray(gameSourceRefs.source, [...STORE_SOURCES]), inArray(gameSourceRefs.gameId, pairIds))),
          loadGameSlugRows(db, pairIds),
        ]);
  const storeIds = new Map<string, Record<string, string>>();
  for (const r of refRows) storeIds.set(r.gameId, { ...storeIds.get(r.gameId), [r.source]: r.externalId });
  const slugOf = new Map(slugRows.map((r) => [r.id, r.slug]));

  const typeOf = new Map(gameRows.map((g) => [g.id, g.contentType]));
  const platforms = platformRows.map((r) => ({
    id: r.id,
    gameId: r.gameId,
    platform: r.platform,
    releaseDate: r.releaseDate,
    priced: r.price !== null,
    addon: (typeOf.get(r.gameId) ?? "game") !== "game",
  }));
  return {
    games: gameRows.map((g) => (slugOf.has(g.id) ? { ...g, slug: slugOf.get(g.id) } : g)),
    platforms,
    pricedGameIds: new Set(pricedRows.map((r) => r.gameId)),
    lockedParent: new Set(lockRows.map((r) => r.rowId)),
    shared: sharedRows,
    storeIds,
    titledRefs: titledRows,
    issues: new Map(issueRows.map((r) => [issueKey(r.rule, r.subjectKey), { id: r.id, status: r.status }])),
  };
}

const loadGameSlugRows = (db: Db, ids: readonly string[]) =>
  db.select({ id: games.id, slug: games.slug }).from(games).where(inArray(games.id, [...ids]));

/** 고친 게임의 slug(캐시 무효화 열쇠). 회차가 고친 게임만 묻는다 */
export async function loadGameSlugs(db: Db, ids: readonly string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  return (await loadGameSlugRows(db, ids)).map((r) => r.slug).filter((s): s is string => Boolean(s));
}
