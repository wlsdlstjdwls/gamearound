// 발견한 상품 제목과 닮았을 수 있는 게임만 DB 에서 골라 온다 — 제목 흡수 판정(findGameByTitle)의 재료.
//
// 왜 이렇게 바꿨나(2026-11-06 실측): 예전에는 발견 회차마다 카탈로그 전체 제목(8.1만 행, 13MB)을 내려받았다.
// 반영 단계가 한 번 더 받아 회차당 26MB, 하루 10회 남짓이라 Neon 전송량(무료 한도 월 5GB)의 70% 가 이 질의였다.
// Neon HTTP 응답은 압축되지 않는다.
//
// 같은 답이 나오는 이유: 흡수 문턱(AUTO_MATCH_THRESHOLD)이 0.9 라 붙는 쌍은 거의 같은 글자다. 여기서는 그보다 훨씬 넓게
// (pg_trgm 0.3 또는 앞부분 일치) 거르고, 최종 판정은 예전처럼 JS 가 한다. JS 열쇠(matchKey)는 에디션 꼬리를 떼므로
// DB 제목이 "Foo Deluxe Edition" 이고 열쇠가 "foo" 인 꼴은 유사도가 낮다 — 그래서 앞부분 일치(LIKE 'foo%')를 함께 본다.
// 바꾸기 전에 실제 스토어 연결 제목 180건으로 전체 목록 판정과 맞춰 봤다 — 전부 같은 게임을 골랐다(응답 13MB 가 0.04~0.25MB 로).
import { sql } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { matchKey, normalizeForSearch } from "@/lib/slug";
import type { GameTitleRow } from "./match";

/** 이보다 짧은 열쇠는 trigram 이 안 서서 같은 값만 본다 */
const TRGM_MIN_CHARS = 3;
// 거르는 문턱은 pg_trgm 기본값(pg_trgm.similarity_threshold = 0.3, % 연산자)이다. 흡수 문턱 0.9 보다 한참 낮아 걸러도 놓치지 않는다

export function titleKeys(titles: readonly string[]): string[] {
  const keys = new Set<string>();
  for (const t of titles) {
    for (const k of [matchKey(t), normalizeForSearch(t)]) if (k) keys.add(k);
  }
  return [...keys];
}

/**
 * 수집 제외 행은 후보에서 뺀다 — 슈퍼패미컴판 "젤다의 전설" 에 스팀 SKU 가 붙으면 그 행은 디지털 가격을 갖게 되고,
 * 레트로 상세가 매장 시세 대신 엉뚱한 값을 머리에 건다. 매장 발 게임은 그대로 후보로 둔다 — 스토어 ID 가 붙는 것이 §5.3 이 노리는 일이다.
 */
export async function loadGameTitlesFor(db: Db, titles: readonly string[]): Promise<GameTitleRow[]> {
  const keys = titleKeys(titles);
  if (keys.length === 0) return [];
  const long = keys.filter((k) => k.length >= TRGM_MIN_CHARS);
  const short = keys.filter((k) => k.length < TRGM_MIN_CHARS);
  // 배열은 JSON 한 칸으로 넘긴다 — Drizzle 은 JS 배열을 ($1, $2, ...) 묶음으로 풀어 ::text[] 가 문법 오류가 된다.
  // % 와 LIKE 는 gin_trgm 색인을 탄다(games_title_*_norm_trgm_idx). similarity() >= 꼴로 쓰면 열쇠마다 전체를 훑는다
  const res = await db.execute<{ id: string; slug: string; title_en: string; title_ko: string | null; content_type: GameTitleRow["contentType"]; parent_game_id: string | null }>(sql`
    select distinct g.id, g.slug, g.title_en, g.title_ko, g.content_type, g.parent_game_id
    from jsonb_array_elements_text(${JSON.stringify(long)}::jsonb) k
    join games g on g.title_en_norm % k or g.title_ko_norm % k or g.title_en_norm like k || '%' or g.title_ko_norm like k || '%'
    where not g.crawl_excluded
    union
    select g.id, g.slug, g.title_en, g.title_ko, g.content_type, g.parent_game_id
    from games g
    where not g.crawl_excluded and (g.title_en_norm in (select jsonb_array_elements_text(${JSON.stringify(short)}::jsonb)) or g.title_ko_norm in (select jsonb_array_elements_text(${JSON.stringify(short)}::jsonb)))`);
  return res.rows.map((r) => ({ id: r.id, slug: r.slug, titleEn: r.title_en, titleKo: r.title_ko, contentType: r.content_type, parentGameId: r.parent_game_id }));
}
