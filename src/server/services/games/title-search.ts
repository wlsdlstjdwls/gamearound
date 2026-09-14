// 제목 검색 조건 — 검색 화면과 목록 필터가 같은 규칙을 써야 결과가 어긋나지 않는다.
import { sql } from "drizzle-orm";
import { games } from "@/server/db/schema";
import { normalizeForSearch } from "@/lib/slug";

export const TRGM_THRESHOLD = 0.25;

/** ILIKE 패턴 이스케이프 */
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}

/**
 * 제목 검색 조건 — 정규화 컬럼(title_en_norm/title_ko_norm)만 본다.
 * 원본 제목 대신 정규화본을 쓰므로 "엘든 링"/"엘든링", "철권8"/"철권 8" 이 같은 질의가 된다.
 * hit = 부분 문자열 포함, score = trigram 유사도(오타 허용). 호출부가 hit 먼저, score 순으로 정렬한다.
 */
export function titleMatch(term: string) {
  const norm = normalizeForSearch(term);
  const pattern = `%${escapeLike(norm)}%`;
  return {
    norm,
    hit: sql<boolean>`(${games.titleEnNorm} like ${pattern} or ${games.titleKoNorm} like ${pattern})`,
    score: sql<number>`greatest(similarity(${games.titleEnNorm}, ${norm}), similarity(${games.titleKoNorm}, ${norm}))`,
  };
}

/** pg_trgm 확장이 없는 환경(undefined_function 42883) 판별 */
export function isMissingTrgm(err: unknown): boolean {
  const code = (err as { code?: string; cause?: { code?: string } })?.code ?? (err as { cause?: { code?: string } })?.cause?.code;
  return code === "42883";
}
