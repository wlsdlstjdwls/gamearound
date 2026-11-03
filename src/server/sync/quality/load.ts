// 데이터 점검기의 읽기. 규칙(rules.ts)이 판정할 재료를 한 번에 받아 온다.
// 질의 다섯을 한 묶음(Promise.all)으로 보낸다 — 줄 세우면 Neon 왕복이 그대로 쌓인다(하루 크론의 60초 안에 든다).
import { and, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { dataCorrections, dataIssues, gamePlatforms, games, gameSourceRefs } from "@/server/db/schema";
import type { QualityGame, QualityPlatformRow, QualityRule, SharedStoreId } from "./rules";

/** 공유를 따질 연결. pending, none 은 아직 확정이 아니라 둘이 같은 id 를 쥐어도 문제가 아니다 */
const CONFIRMED_MATCHES = ["auto", "manual"];
/** 상품 번호가 갈리면 다른 상품인 스토어. 메타 소스(hltb, wikidata 등)는 한 항목을 여러 판이 나눠 써서 뺀다 */
const STORE_SOURCES = ["steam", "epic", "xbox", "psstore", "nintendo", "nintendo_jp"] as const;

export interface QualityInput {
  games: QualityGame[];
  slugOf: Map<string, string>;
  platforms: QualityPlatformRow[];
  pricedGameIds: Set<string>;
  lockedParent: Set<string>;
  shared: SharedStoreId[];
  /** 게임마다 확정된 스토어 상품 번호. 같은 제목 중복이 정말 같은 상품인지 가른다 */
  storeIds: Map<string, Record<string, string>>;
  /** 이미 남긴 판정. 열쇠는 `${rule}:${subjectKey}` */
  issues: Map<string, { id: string; status: "open" | "applied" | "dismissed" }>;
}

export const issueKey = (rule: QualityRule | string, subjectKey: string) => `${rule}:${subjectKey}`;

export async function loadQualityInput(db: Db): Promise<QualityInput> {
  const [gameRows, platformRows, lockRows, sharedRows, issueRows, refRows] = await Promise.all([
    db.select({ id: games.id, slug: games.slug, titleEn: games.titleEn, contentType: games.contentType, parentGameId: games.parentGameId }).from(games),
    db
      .select({ id: gamePlatforms.id, gameId: gamePlatforms.gameId, platform: gamePlatforms.platform, releaseDate: gamePlatforms.releaseDate, price: gamePlatforms.currentPrice })
      .from(gamePlatforms),
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
      .where(inArray(gameSourceRefs.matchedBy, CONFIRMED_MATCHES))
      .groupBy(gameSourceRefs.source, gameSourceRefs.externalId)
      .having(sql`count(distinct ${gameSourceRefs.gameId}) > 1`),
    db.select({ id: dataIssues.id, rule: dataIssues.rule, subjectKey: dataIssues.subjectKey, status: dataIssues.status }).from(dataIssues),
    db
      .select({ gameId: gameSourceRefs.gameId, source: sql<string>`${gameSourceRefs.source}::text`, externalId: gameSourceRefs.externalId })
      .from(gameSourceRefs)
      .where(and(inArray(gameSourceRefs.matchedBy, CONFIRMED_MATCHES), inArray(gameSourceRefs.source, [...STORE_SOURCES]))),
  ]);
  const storeIds = new Map<string, Record<string, string>>();
  for (const r of refRows) storeIds.set(r.gameId, { ...storeIds.get(r.gameId), [r.source]: r.externalId });
  const platforms = platformRows.map((r) => ({ id: r.id, gameId: r.gameId, platform: r.platform, releaseDate: r.releaseDate, priced: r.price !== null }));
  return {
    games: gameRows,
    slugOf: new Map(gameRows.map((g) => [g.id, g.slug])),
    platforms,
    pricedGameIds: new Set(platforms.filter((p) => p.priced).map((p) => p.gameId)),
    lockedParent: new Set(lockRows.map((r) => r.rowId)),
    shared: sharedRows,
    storeIds,
    issues: new Map(issueRows.map((r) => [issueKey(r.rule, r.subjectKey), { id: r.id, status: r.status }])),
  };
}
