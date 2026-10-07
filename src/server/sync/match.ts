// 소스 간 게임 매칭 — 설계서 §4.2.
// 제목 정규화 → adapter.search(영문, 필요하면 한국어까지) → trigram 유사도 상위 후보 → 임계값에 따라 auto / pending / 미매칭.
// matched_by="manual" 행은 크롤러가 절대 덮어쓰지 않는다.
import { and, eq, inArray, isNull, lt, ne, or, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gameSourceRefs, games } from "@/server/db/schema";
import { updatedBy } from "@/server/db/audit";
import { getSearchableAdapter, getDisabledReason, isSourceEnabled, type SearchableSource } from "@/server/adapters";
import type { SearchCandidate, Source } from "@/server/adapters/types";
import { normalizeTitle, seriesConflict, trigramSimilarity } from "@/lib/slug";
import { MATCHED_FOR_SYNC } from "./constants";
import { fillMatchedMedia } from "./match-media";

export const AUTO_MATCH_THRESHOLD = 0.9;
export const PENDING_MATCH_THRESHOLD = 0.7;
/** matched_by="none" 행을 다시 검색하기까지의 최소 경과일. 소스 카탈로그에 뒤늦게 등록되는 게임을 회수한다. */
export const NONE_RETRY_DAYS = 14;
/**
 * 후보가 0건일 때 none 행에 넣는 외부 id 자리표시자.
 *
 * 기록을 남기지 않으면 그 게임은 "ref 가 없는 게임" 으로 남아 큐(createdAt 오름차순)의 선두에
 * 영원히 머문다 — 다음 실행이 같은 게임을 다시 검색하고, 또 0건을 받고, 또 기록하지 않는다.
 * 2026-09-14 실측: hltb 큐 선두 5건(Drag'n Wash, PLATiNA :: LAB, Godius Eternal War,
 * Little LUMI Model, Tree of Savior)이 전부 후보 0건이라 매 실행의 앞자리를 그대로 먹고 있었다.
 * 한국 인디, 국내 서비스 게임은 HLTB 에 아예 없어서 이 집합은 시간이 갈수록 커지기만 한다.
 *
 * 빈 문자열을 쓰는 이유: external_id 는 notNull 이고, nullable 로 바꾸면 이 컬럼을 string 으로
 * 읽는 8개 파일(store-targets, dlc-writer, run-meta, services/games/detail 등)이 함께 깨진다.
 * none 행은 수집 대상(MATCHED_FOR_SYNC)도 공개 화면 노출 대상도 아니라 이 값이 밖으로 나가지 않는다.
 *
 * 검색이 일시적으로 빈손일 때 잘못 박힐 위험은 NONE_RETRY_DAYS 가 받는다. 진짜 실패(HTTP 오류)는
 * 예외로 던져져 이 경로까지 오지 않는다 — 여기 오는 0건은 "그 카탈로그에 없다" 는 답이다.
 */
export const NO_CANDIDATE_EXTERNAL_ID = "";

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

/**
 * 후보들 중 titleEn(또는 titleKo) 과 가장 유사한 것. 후보가 없으면 null.
 *
 * 시리즈 번호가 어긋나는 후보는 유사도를 재기 전에 버린다(seriesConflict). 임계값으로 거르지 않고
 * 후보에서 아예 빼는 이유: 2편을 버리면 같은 검색 결과 안에 있던 1편이 최선 후보로 올라온다.
 * 임계값으로만 눌렀다면 1편이 있어도 2편이 자리를 차지한 채 none 으로 끝났다.
 */
export function pickBestCandidate(
  titleEn: string,
  titleKo: string | null | undefined,
  candidates: SearchCandidate[],
): BestCandidate | null {
  let best: BestCandidate | null = null;
  for (const c of candidates) {
    if (seriesConflict(titleEn, c.title) && (!titleKo || seriesConflict(titleKo, c.title))) continue;
    const simEn = trigramSimilarity(titleEn, c.title);
    const simKo = titleKo ? trigramSimilarity(titleKo, c.title) : 0;
    const similarity = Math.max(simEn, simKo);
    if (!best || similarity > best.similarity) best = { candidate: c, similarity };
  }
  return best;
}

export { findGameByTitle, type GameTitleRow } from "./match-title";

export interface MatchResult {
  gameId: string;
  source: Source;
  decision: MatchDecision | "skipped-manual" | "no-candidates";
  externalId?: string;
  similarity?: number;
}

/** game_source_refs 에 쓸 값 한 벌. 어떤 행을 쓸지의 판단만 담는다(DB 접근 없음) */
export interface RefRow {
  externalId: string;
  url: string | null;
  matchedTitle: string | null;
  matchedBy: MatchDecision;
  confidence: string | null;
}

/**
 * 매칭 시도 1회의 결과를 행으로 옮긴다. 후보가 없으면 자리표시자 none 행이다
 * (기록해야 큐가 앞으로 나간다 — NO_CANDIDATE_EXTERNAL_ID 참고).
 */
export function refRowFor(best: BestCandidate | null): RefRow {
  if (!best) {
    return { externalId: NO_CANDIDATE_EXTERNAL_ID, url: null, matchedTitle: null, matchedBy: "none", confidence: null };
  }
  return {
    externalId: best.candidate.externalId,
    url: best.candidate.url,
    matchedTitle: best.candidate.title,
    matchedBy: classifyMatch(best.similarity),
    confidence: best.similarity.toFixed(2),
  };
}

/**
 * 그 외부 ID 를 다른 게임이 이미 쥐고 있으면 auto 를 pending 으로 내린다.
 *
 * 외부 ID 하나는 가격 하나다. 2026-09-24 실측: PS 검색 후보는 제목이 상품(번들) 이름, ID 는 그 상품의 콘셉트라
 * "Black Ops 6 - Cross-Gen Bundle" 이 1.00 으로 맞고 "Call of Duty" 허브 콘셉트를 받아 갔다(psstore 89개 번호를 229행이 공유).
 * 떼지 않고 pending 인 이유: 어느 쪽이 주인인지 제목만으로 못 가린다 — 사람이 매칭 큐에서 본다.
 */
export function guardTakenRef(row: RefRow, takenByOther: boolean): RefRow {
  return row.matchedBy === "auto" && takenByOther ? { ...row, matchedBy: "pending" } : row;
}

/**
 * 제목으로 후보를 찾는다. 영문으로 한 번, 그래도 확실하지 않으면 한국어로 한 번 더.
 *
 * 왜 두 번 묻나: 스토어 카탈로그는 그 나라 말로 적혀 있다. 한국 PS, 닌텐도 스토어에서
 * "Cyberpunk 2077" 을 찾으면 안 나오고 "사이버펑크 2077" 로는 나오는 일이 있다.
 * 영문 한 번으로 끝내면 그런 게임이 matched_by="none" 으로 박혀 14일간 다시 안 찾는다.
 *
 * 두 번째 질의는 auto 를 못 넘겼을 때만 보낸다 — 확실한 답이 이미 있으면 요청을 더 쓸 이유가 없다.
 * 두 결과 중 더 닮은 쪽을 쓴다. 제목 비교는 pickBestCandidate 가 영문, 한국어 둘 다와 재므로
 * 어느 말로 찾아왔든 판정 기준은 같다.
 */
async function searchBestCandidate(
  adapter: { search: (q: string) => Promise<SearchCandidate[]> },
  game: { titleEn: string; titleKo: string | null },
): Promise<BestCandidate | null> {
  let best: BestCandidate | null = null;
  const tried = new Set<string>();
  for (const title of [game.titleEn, game.titleKo]) {
    if (!title) continue;
    const query = normalizeTitle(title);
    if (!query || tried.has(query)) continue;
    tried.add(query);
    const hit = pickBestCandidate(game.titleEn, game.titleKo, await adapter.search(query));
    if (hit && (!best || hit.similarity > best.similarity)) best = hit;
    if (best && best.similarity >= AUTO_MATCH_THRESHOLD) break;
  }
  return best;
}

/** 같은 소스에서 이 외부 ID 로 수집되는(auto, manual) 다른 게임이 있는가 */
async function refTakenByOther(gameId: string, source: Source, externalId: string): Promise<boolean> {
  const hit = await getDb().query.gameSourceRefs.findFirst({
    where: and(eq(gameSourceRefs.source, source), eq(gameSourceRefs.externalId, externalId), ne(gameSourceRefs.gameId, gameId),
      inArray(gameSourceRefs.matchedBy, MATCHED_FOR_SYNC)),
    columns: { gameId: true },
  });
  return Boolean(hit);
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
  const best = await searchBestCandidate(adapter, game);
  const found = refRowFor(best);
  const row = guardTakenRef(found, found.matchedBy === "auto" && (await refTakenByOther(gameId, source, found.externalId)));

  // none 행은 pending 까지만 덮는다. pending 은 "사람이 판단해 달라" 는 뜻인데, 판정 규칙이 좋아져
  // 이제 후보조차 아니라고 말한다면 그 대기표는 우리가 더 이상 믿지 않는 옛 판단이다.
  // auto 는 그대로 둔다 — 한 번 붙은 매핑을 검색 결과가 잠깐 나빠졌다고 떼면 수집이 들쭉날쭉해진다.
  // manual 은 어느 경우에도 건드리지 않는다(동시 실행으로 방금 생겼을 수 있어 여기서 한 번 더 막는다).
  const setWhere =
    row.matchedBy === "none"
      ? sql`${gameSourceRefs.matchedBy} in ('none', 'pending')`
      : sql`${gameSourceRefs.matchedBy} <> 'manual'`;
  const values = { gameId, source, ...row, checkedAt: new Date() };
  await db
    .insert(gameSourceRefs)
    .values(values)
    .onConflictDoUpdate({ target: [gameSourceRefs.gameId, gameSourceRefs.source], set: values, setWhere });

  if (!best) return { gameId, source, decision: "no-candidates" };
  if (row.matchedBy === "auto") {
    await promoteShopGame(gameId, source);
    await fillMatchedMedia(gameId, source, best.candidate);
  }
  return { gameId, source, decision: row.matchedBy, externalId: row.externalId, similarity: best.similarity };
}

/**
 * 매장이 만든 임시 게임을 전체 목록으로 올린다 — 매장 설계서 §7 의 "크롤러 소스가 붙으면 승격".
 *
 * 승격 조건을 auto 하나로 둔 이유: pending 은 "사람이 판단해 달라" 는 뜻이라 아직 근거가 아니다.
 * 그 상태로 올리면 검수 큐에 선 채로 전체 목록에 나오고, 나중에 아니라고 판명되면 이미 손님이 봤다.
 *
 * `visibility` 만 올리고 `origin` 은 그대로 둔다. 누가 만들었나는 사실이고 바뀌지 않는다 —
 * 나중에 "매장이 만든 행이 얼마나 카탈로그에 흡수됐나" 를 물을 때 답이 되는 것이 그 컬럼이다.
 */
async function promoteShopGame(gameId: string, source: SearchableSource): Promise<void> {
  await getDb()
    .update(games)
    .set({ visibility: "public", ...updatedBy(`cron:match:${source}`) })
    .where(and(eq(games.id, gameId), eq(games.visibility, "shop_only")));
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
      and(
        // 본편만 줄을 선다. 2026-09-16 실측으로 이 큐의 76~80%가 DLC, 에디션, 번들, 체험판이었다
        // (steam 기준 미매칭 51,075건 중 본편은 11,301건). 그것들은 제목 검색으로 붙일 값이 아니다 —
        // DLC 는 본편을 통해 붙고(sync/dlc-writer), 에디션과 번들은 본편의 변형이다.
        // 몫이 작은데 줄이 이렇게 섞여 있으면 정작 본편이 영영 차례를 못 받는다.
        eq(games.contentType, "game"),
        // 레트로는 이 배치를 타지 않는다(매장 설계서 §5.3). 온라인 스토어에 없는 물건이라
        // 넣어 두면 매 회차 몫만 먹고 후보 0건으로 돌아온다
        eq(games.crawlExcluded, false),
        or(
          isNull(gameSourceRefs.gameId),
          and(eq(gameSourceRefs.matchedBy, "none"), lt(gameSourceRefs.checkedAt, noneRetryCutoff())),
        ),
      ),
    )
    // 매장이 만든 게임을 맨 앞에 세운다(§5.3 역방향 수집). 생성순으로만 세우면 이 행들은
    // 앞에 선 미매칭 1만여 건 뒤라 차례가 영영 안 온다 — 매장은 자기가 올린 물건에 값이
    // 언제 붙는지로 이 서비스를 판단한다. 몫이 작을수록 순서가 곧 결과다.
    .orderBy(sql`case when ${games.origin} = 'shop' then 0 else 1 end`, games.createdAt)
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
