// 소스 간 게임 매칭 — 설계서 §4.2.
// titleEn 정규화 → adapter.search → trigram 유사도 상위 후보 → 임계값에 따라 auto / pending / 미매칭.
// matched_by="manual" 행은 크롤러가 절대 덮어쓰지 않는다.
import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gameSourceRefs, games } from "@/server/db/schema";
import { DISABLED_SOURCES, getAdapter, isSourceEnabled } from "@/server/adapters";
import type { SearchCandidate, Source } from "@/server/adapters/types";
import { normalizeTitle, trigramSimilarity } from "@/lib/slug";

export const AUTO_MATCH_THRESHOLD = 0.9;
export const PENDING_MATCH_THRESHOLD = 0.7;

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

export interface MatchResult {
  gameId: string;
  source: Source;
  decision: MatchDecision | "skipped-manual" | "no-candidates";
  externalId?: string;
  similarity?: number;
}

/** 게임 1개를 소스 1개에 매칭 시도. manual 이면 건너뜀. DB 에 upsert 까지 수행 */
export async function matchGameToSource(gameId: string, source: Source): Promise<MatchResult> {
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

  const adapter = getAdapter(source);
  const query = normalizeTitle(game.titleEn);
  const candidates = query ? await adapter.search(query) : [];
  const best = pickBestCandidate(game.titleEn, game.titleKo, candidates);
  if (!best) return { gameId, source, decision: "no-candidates" };

  const decision = classifyMatch(best.similarity);
  if (decision === "none") return { gameId, source, decision, externalId: best.candidate.externalId, similarity: best.similarity };

  const confidence = best.similarity.toFixed(2);
  await db
    .insert(gameSourceRefs)
    .values({ gameId, source, externalId: best.candidate.externalId, url: best.candidate.url, matchedBy: decision, confidence })
    .onConflictDoUpdate({
      target: [gameSourceRefs.gameId, gameSourceRefs.source],
      set: { externalId: best.candidate.externalId, url: best.candidate.url, matchedBy: decision, confidence },
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

/** 해당 소스에 ref 가 없는 게임을 limit 개까지 매칭. 소스별 minIntervalMs 대기 */
export async function matchUnmatchedGames(source: Source, limit: number): Promise<MatchSummary> {
  if (!isSourceEnabled(source)) throw new Error(`${source} 비활성 소스: ${DISABLED_SOURCES[source]}`);
  const db = getDb();
  const adapter = getAdapter(source);
  const rows = await db
    .select({ id: games.id })
    .from(games)
    .leftJoin(gameSourceRefs, and(eq(gameSourceRefs.gameId, games.id), eq(gameSourceRefs.source, source)))
    .where(isNull(gameSourceRefs.gameId))
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
