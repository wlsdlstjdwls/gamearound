// 소스 간 게임 매칭 — 설계서 §4.2.
// titleEn 정규화 → adapter.search → trigram 유사도 상위 후보 → 임계값에 따라 auto / pending / 미매칭.
// matched_by="manual" 행은 크롤러가 절대 덮어쓰지 않는다.
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gameSourceRefs, games } from "@/server/db/schema";
import { getSearchableAdapter, getDisabledReason, isSourceEnabled, type SearchableSource } from "@/server/adapters";
import type { SearchCandidate, Source } from "@/server/adapters/types";
import { normalizeTitle, trigramSimilarity } from "@/lib/slug";

export const AUTO_MATCH_THRESHOLD = 0.9;
export const PENDING_MATCH_THRESHOLD = 0.7;
/** matched_by="none" 행을 다시 검색하기까지의 최소 경과일. 소스 카탈로그에 뒤늦게 등록되는 게임을 회수한다. */
export const NONE_RETRY_DAYS = 14;

/** 지금 기준 재검색 가능 시점(= now - NONE_RETRY_DAYS) */
export function noneRetryCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - NONE_RETRY_DAYS * 24 * 60 * 60 * 1000);
}

export type MatchDecision = "auto" | "pending" | "none";

/** 유사도 → 결정 (§4.2 3항). 순수 함수, 테스트 대상 */
export function classifyMatch(similarity: number): MatchDecision {
  if (similarity >= AUTO_MATCH_THRESHOLD) return "auto";
  if (similarity >= PENDING_MATCH_THRESHOLD) return "pending";
  return "none";
}

export interface BestCandidate {
  candidate: SearchCandidate;
  similarity: number;
}

/** 후보들 중 titleEn(또는 titleKo) 과 가장 유사한 것. 후보가 없으면 null */
export function pickBestCandidate(
  titleEn: string,
  titleKo: string | null | undefined,
  candidates: SearchCandidate[],
): BestCandidate | null {
  let best: BestCandidate | null = null;
  for (const c of candidates) {
    const simEn = trigramSimilarity(titleEn, c.title);
    const simKo = titleKo ? trigramSimilarity(titleKo, c.title) : 0;
    const similarity = Math.max(simEn, simKo);
    if (!best || similarity > best.similarity) best = { candidate: c, similarity };
  }
  return best;
}

export interface GameTitleRow {
  id: string;
  slug: string;
  titleEn: string;
  titleKo: string | null;
}

/**
 * 역방향 매칭: 스토어 카탈로그에서 발견한 제목이 이미 있는 게임인지 찾는다.
 * 비기준 소스(nintendo 등)에서 신규 시드를 할 때, 같은 게임이 Steam 으로 이미 들어와 있으면
 * 새 게임을 만들지 말고 그 게임에 플랫폼만 붙여야 한다. auto 임계값 미만은 별개 게임으로 본다
 * (애매한 것을 합치면 서로 다른 게임의 가격이 한 페이지에 섞인다 — 되돌리기 어려운 오염).
 */
export function findGameByTitle(title: string, rows: GameTitleRow[]): { game: GameTitleRow; similarity: number } | null {
  let best: { game: GameTitleRow; similarity: number } | null = null;
  for (const row of rows) {
    const similarity = Math.max(trigramSimilarity(title, row.titleEn), row.titleKo ? trigramSimilarity(title, row.titleKo) : 0);
    if (!best || similarity > best.similarity) best = { game: row, similarity };
  }
  return best && best.similarity >= AUTO_MATCH_THRESHOLD ? best : null;
}

export interface MatchResult {
  gameId: string;
  source: Source;
  decision: MatchDecision | "skipped-manual" | "no-candidates";
  externalId?: string;
  similarity?: number;
}

/** 게임 1개를 소스 1개에 매칭 시도. manual 이면 건너뜀. DB 에 upsert 까지 수행 */
export async function matchGameToSource(gameId: string, source: SearchableSource): Promise<MatchResult> {
  const db = getDb();
  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId),
    columns: { id: true, titleEn: true, titleKo: true },
  });
  if (!game) throw new Error(`게임 없음: ${gameId}`);

  const existing = await db.query.gameSourceRefs.findFirst({
    where: and(eq(gameSourceRefs.gameId, gameId), eq(gameSourceRefs.source, source)),
  });
  if (existing?.matchedBy === "manual") return { gameId, source, decision: "skipped-manual" };

  const adapter = getSearchableAdapter(source);
  const query = normalizeTitle(game.titleEn);
  const candidates = query ? await adapter.search(query) : [];
  const best = pickBestCandidate(game.titleEn, game.titleKo, candidates);
  const decision: MatchDecision = best ? classifyMatch(best.similarity) : "none";

  if (!best) return { gameId, source, decision: "no-candidates" }; // 후보 0건은 검색 실패일 수 있어 기록하지 않음(다음 실행에 재시도)
  if (decision === "none") {
    // 후보는 있었지만 유사도 미달 → matched_by="none" 기록해 당분간 같은 게임을 다시 검색하지 않는다(워커 시간 절약).
    // checked_at 을 갱신해 NONE_RETRY_DAYS 경과 후에만 재검색되게 한다. auto/manual/pending 행은 덮지 않는다.
    await db
      .insert(gameSourceRefs)
      .values({ gameId, source, externalId: best.candidate.externalId, url: best.candidate.url, matchedBy: "none", confidence: best.similarity.toFixed(2), checkedAt: new Date() })
      .onConflictDoUpdate({
        target: [gameSourceRefs.gameId, gameSourceRefs.source],
        set: { externalId: best.candidate.externalId, url: best.candidate.url, confidence: best.similarity.toFixed(2), checkedAt: new Date() },
        setWhere: sql`${gameSourceRefs.matchedBy} = 'none'`,
      });
    return { gameId, source, decision, externalId: best.candidate.externalId, similarity: best.similarity };
  }

  const confidence = best.similarity.toFixed(2);
  await db
    .insert(gameSourceRefs)
    .values({ gameId, source, externalId: best.candidate.externalId, url: best.candidate.url, matchedBy: decision, confidence, checkedAt: new Date() })
    .onConflictDoUpdate({
      target: [gameSourceRefs.gameId, gameSourceRefs.source],
      set: { externalId: best.candidate.externalId, url: best.candidate.url, matchedBy: decision, confidence, checkedAt: new Date() },
      // 동시 실행으로 manual 이 생겼을 수 있으므로 한 번 더 방어
      setWhere: sql`${gameSourceRefs.matchedBy} <> 'manual'`,
    });

  return { gameId, source, decision, externalId: best.candidate.externalId, similarity: best.similarity };
}

export interface MatchSummary {
  attempted: number;
  auto: number;
  pending: number;
  unmatched: number;
  errors: number;
}

/**
 * 해당 소스에 ref 가 없는 게임 + matched_by="none" 으로 기록된 지 NONE_RETRY_DAYS 지난 게임을
 * limit 개까지 매칭. 소스별 minIntervalMs 대기.
 */
export async function matchUnmatchedGames(source: SearchableSource, limit: number): Promise<MatchSummary> {
  if (!isSourceEnabled(source)) throw new Error(`${source} 비활성 소스: ${getDisabledReason(source)}`);
  const db = getDb();
  const adapter = getSearchableAdapter(source);
  const rows = await db
    .select({ id: games.id })
    .from(games)
    .leftJoin(gameSourceRefs, and(eq(gameSourceRefs.gameId, games.id), eq(gameSourceRefs.source, source)))
    .where(
      or(
        isNull(gameSourceRefs.gameId),
        and(eq(gameSourceRefs.matchedBy, "none"), lt(gameSourceRefs.checkedAt, noneRetryCutoff())),
      ),
    )
    .orderBy(games.createdAt)
    .limit(limit);

  const summary: MatchSummary = { attempted: 0, auto: 0, pending: 0, unmatched: 0, errors: 0 };
  for (const row of rows) {
    summary.attempted++;
    try {
      const r = await matchGameToSource(row.id, source);
      if (r.decision === "auto") summary.auto++;
      else if (r.decision === "pending") summary.pending++;
      else summary.unmatched++;
    } catch (e) {
      summary.errors++;
      console.warn(`[match:${source}] ${row.id} 실패: ${e instanceof Error ? e.message : String(e)}`);
    }
    await new Promise((r) => setTimeout(r, adapter.minIntervalMs));
  }
  return summary;
}
