// 제목 검색 조건 — 검색 화면과 목록 필터가 같은 규칙을 써야 결과가 어긋나지 않는다.
import { sql, type SQL } from "drizzle-orm";
import { gameAliases, games } from "@/server/db/schema";
import { normalizeForSearch } from "@/lib/slug";

export const TRGM_THRESHOLD = 0.25;

/** ILIKE 패턴 이스케이프 */
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}

/**
 * 제목 검색 조건 — 정규화 컬럼(title_en_norm/title_ko_norm)과 검색 별칭(game_aliases)을 본다.
 * 원본 제목 대신 정규화본을 쓰므로 "엘든 링"/"엘든링", "철권8"/"철권 8" 이 같은 질의가 된다.
 * hit = 부분 문자열 포함, score = trigram 유사도(오타 허용). 호출부가 hit 먼저, score 순으로 정렬한다.
 *
 * 별칭을 같은 hit, score 에 접는 이유: 호출부(목록 필터, 검색)의 계약을 그대로 두기 위해서다.
 * 별칭을 따로 돌려주면 두 호출부가 각자 정렬을 다시 짜야 하고, 그 순간 둘이 어긋난다.
 * 상관 EXISTS 로 쓴 것도 의도다 — 플래너가 작은 별칭 테이블을 먼저 훑고 준조인으로 붙일 수 있다.
 */
export function titleMatch(term: string) {
  const norm = normalizeForSearch(term);
  const pattern = `%${escapeLike(norm)}%`;
  // 별칭은 "제목에 없는 말"(시리즈명, 원작명, 약칭)이라 부분일치가 본줄기다.
  // 유사도까지 같이 보는 이유는 오타 때문이다 — "해리포토" 로도 걸려야 한다.
  const aliasHit = sql<boolean>`exists (
    select 1 from ${gameAliases}
    where ${gameAliases.gameId} = ${games.id} and ${gameAliases.aliasNorm} like ${pattern}
  )`;
  const aliasScore = sql<number>`(
    select max(similarity(${gameAliases.aliasNorm}, ${norm}))
    from ${gameAliases} where ${gameAliases.gameId} = ${games.id}
  )`;
  return {
    norm,
    hit: sql<boolean>`(${games.titleEnNorm} like ${pattern} or ${games.titleKoNorm} like ${pattern} or ${aliasHit})`,
    // greatest 는 null 을 무시한다 — 별칭이 없는 게임(대다수)은 아래 subquery 가 null 이라 그냥 빠진다
    score: sql<number>`greatest(similarity(${games.titleEnNorm}, ${norm}), similarity(${games.titleKoNorm}, ${norm}), ${aliasScore})`,
  };
}

/**
 * "부분일치했거나 유사도가 임계값을 넘었다" 한 덩어리. **반드시 괄호로 감싸서** 돌려준다.
 *
 * 왜 함수로 두나: 이 조립을 호출부 두 곳(목록 필터, 검색)이 각자 하다가 검색 쪽에서 괄호를 빠뜨렸다
 * (2026-09-16). SQL 은 and 가 or 보다 세게 붙어서 `(본편 and 부분일치) or 유사도` 가 되고,
 * 유사도만 넘긴 DLC, 에디션, 번들이 본편 조건을 통째로 건너뛰었다 —
 * "호그와트 레거시" 검색이 9건이었고 그중 7건이 변형이었다.
 * 조각을 주고 조립을 맡기면 같은 실수가 다음 호출부에서 또 난다. 조립까지 여기서 끝낸다.
 */
export function titleMatches(m: Pick<ReturnType<typeof titleMatch>, "hit" | "score">): SQL<boolean> {
  return sql<boolean>`(${m.hit} or ${m.score} >= ${TRGM_THRESHOLD})`;
}

/** pg_trgm 확장이 없는 환경(undefined_function 42883) 판별 */
export function isMissingTrgm(err: unknown): boolean {
  const code = (err as { code?: string; cause?: { code?: string } })?.code ?? (err as { cause?: { code?: string } })?.cause?.code;
  return code === "42883";
}
