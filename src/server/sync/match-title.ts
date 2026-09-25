// 역방향 매칭 — 스토어에서 발견한 제목이 우리 카탈로그의 어느 게임인지 찾는다.
// match.ts 가 300줄을 넘어 떼어 냈다. 호출부는 여전히 "./match" 에서 가져간다(거기서 다시 내보낸다).
import type { ContentType } from "@/server/db/schema";
import { seriesConflict, trigramSimilarity } from "@/lib/slug";
import { AUTO_MATCH_THRESHOLD } from "./match";

export interface GameTitleRow {
  id: string;
  slug: string;
  titleEn: string;
  titleKo: string | null;
  /** 동점을 가르는 데만 쓴다. 비어 있으면 본편으로 본다 */
  contentType?: ContentType;
  parentGameId?: string | null;
}

/** 부모 없는 본편. 제목이 똑같은 에디션 행보다 앞에 둘 자리다 */
function isMainGame(row: GameTitleRow): boolean {
  return (row.contentType ?? "game") === "game" && !row.parentGameId;
}

/**
 * 역방향 매칭: 스토어 카탈로그에서 발견한 제목이 이미 있는 게임인지 찾는다.
 * 비기준 소스(nintendo 등)에서 신규 시드를 할 때, 같은 게임이 Steam 으로 이미 들어와 있으면
 * 새 게임을 만들지 말고 그 게임에 플랫폼만 붙여야 한다. auto 임계값 미만은 별개 게임으로 본다
 * (애매한 것을 합치면 서로 다른 게임의 가격이 한 페이지에 섞인다 — 되돌리기 어려운 오염).
 *
 * 유사도가 같으면 본편을 고른다. 2026-09-26 실측: SAO Last Recollection 디럭스 에디션 행의 영문 제목이
 * 본편과 글자까지 같아(둘 다 1.00) 먼저 읽힌 에디션 행이 이겼고, 스팀 본편 가격이 에디션 페이지에 붙었다.
 */
export function findGameByTitle(title: string, rows: GameTitleRow[]): { game: GameTitleRow; similarity: number } | null {
  let best: { game: GameTitleRow; similarity: number } | null = null;
  for (const row of rows) {
    // 역방향도 같은 규칙을 쓴다 — 카탈로그의 "Darkest Dungeon II" 가 우리 "Darkest Dungeon" 에 붙으면
    // 새 게임이 생기지 않고 1편 페이지에 2편 플랫폼이 달린다
    if (seriesConflict(title, row.titleEn) && (!row.titleKo || seriesConflict(title, row.titleKo))) continue;
    const similarity = Math.max(trigramSimilarity(title, row.titleEn), row.titleKo ? trigramSimilarity(title, row.titleKo) : 0);
    const wins = !best || similarity > best.similarity || (similarity === best.similarity && isMainGame(row) && !isMainGame(best.game));
    if (wins) best = { game: row, similarity };
  }
  return best && best.similarity >= AUTO_MATCH_THRESHOLD ? best : null;
}
