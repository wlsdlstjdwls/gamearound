// 제목 검색 조건 — 검색 화면과 목록 필터가 같은 규칙을 써야 결과가 어긋나지 않는다.
import { sql } from "drizzle-orm";
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

/** pg_trgm 확장이 없는 환경(undefined_function 42883) 판별 */
export function isMissingTrgm(err: unknown): boolean {
  const code = (err as { code?: string; cause?: { code?: string } })?.code ?? (err as { cause?: { code?: string } })?.cause?.code;
  return code === "42883";
}
