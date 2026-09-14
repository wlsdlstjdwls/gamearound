// 검색 별칭의 관리자 입력 — 제목에 없는 말로 게임을 찾게 하는 유일한 경로(schema 의 game_aliases 주석).
//
// 수동 입력으로 먼저 여는 이유: 시리즈명, 원작명, 약칭은 스토어가 주지 않는 값이다.
// 위키데이터에 시리즈 속성(P179)이 있지만 게임을 위키데이터 항목에 붙이는 일 자체가
// 또 하나의 제목 매칭 문제라(jp-title-matching 의 오염 위험) 그 경로는 따로 다룬다.
//
// data_corrections 에 기록하지 않는다 — 크롤러가 이 테이블을 쓰지 않아 덮어쓸 상대가 없다.
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gameAliases } from "@/server/db/schema";
import { requireAdmin } from "@/server/services/users";
import { normalizeForSearch } from "@/lib/slug";

export type GameAliasRow = typeof gameAliases.$inferSelect;

export async function listAliases(gameId: string): Promise<GameAliasRow[]> {
  return getDb().select().from(gameAliases).where(eq(gameAliases.gameId, gameId)).orderBy(asc(gameAliases.alias));
}

/**
 * 별칭 한 건을 넣는다. 이미 있으면 조용히 넘어간다(정규화본이 같으면 같은 별칭이다).
 * 정규화 결과가 빈 문자열이면 거절한다 — 구두점뿐인 별칭은 모든 질의에 걸린다.
 */
export async function addAlias(gameId: string, alias: string): Promise<{ created: boolean }> {
  await requireAdmin();
  const trimmed = alias.trim();
  if (!normalizeForSearch(trimmed)) throw new Error("검색에 쓸 수 있는 글자가 없습니다");

  const inserted = await getDb()
    .insert(gameAliases)
    .values({ gameId, alias: trimmed })
    .onConflictDoNothing()
    .returning({ id: gameAliases.id });
  return { created: inserted.length > 0 };
}

export async function deleteAlias(id: number): Promise<void> {
  await requireAdmin();
  await getDb().delete(gameAliases).where(eq(gameAliases.id, id));
}
