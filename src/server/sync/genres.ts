// 게임 장르 잇기 — 새 게임을 만들 때와, 이미 있는 게임의 장르가 비었을 때.
//
// 왜 "비었을 때" 만 채우나(2026-11-16): 장르는 예전에 게임을 만들 때 한 번만 붙었다(game-writer.createGameFromSnapshot).
// 그래서 만들 때 장르를 못 받은 게임은 영영 비어 있었다 — 본편 30,281건 중 15,234건(스팀 출신도 7,995건, 11-16 실측).
// 이미 장르가 있는 게임은 건드리지 않는다. 스토어마다 갈래 이름이 달라 덮어쓰기를 열면 수집마다 장르가 뒤집히고
// 그때마다 캐시가 깨진다(META_OVERWRITE_SOURCES 와 같은 이유). 장르는 data_corrections 잠금 대상이 아니다 — 관리자가 고치는 화면이 없다.
import { inArray } from "drizzle-orm";
import { gameGenres, genres } from "@/server/db/schema";
import type { Db } from "@/server/db/client";
import { normalizeGenre } from "@/lib/genres";

const clean = (names: readonly string[] | undefined): string[] =>
  Array.from(new Set((names ?? []).map((n) => normalizeGenre(n)).filter(Boolean)));

/** 게임마다 장르 이름 목록을 잇는다. 장르 행이 없으면 만든다. 여러 게임을 왕복 셋으로 처리한다(neon 왕복 비용) */
export async function linkGenresMany(db: Db, byGame: ReadonlyMap<string, readonly string[]>): Promise<void> {
  const wanted = new Map<string, string[]>();
  for (const [gameId, names] of byGame) {
    const c = clean(names);
    if (c.length > 0) wanted.set(gameId, c);
  }
  if (wanted.size === 0) return;
  const allNames = Array.from(new Set([...wanted.values()].flat()));
  await db.insert(genres).values(allNames.map((name) => ({ name }))).onConflictDoNothing();
  const rows = await db.select({ id: genres.id, name: genres.name }).from(genres).where(inArray(genres.name, allNames));
  const idOf = new Map(rows.map((r) => [r.name, r.id]));
  const values = [...wanted].flatMap(([gameId, names]) => names.flatMap((n) => (idOf.has(n) ? [{ gameId, genreId: idOf.get(n)! }] : [])));
  if (values.length > 0) await db.insert(gameGenres).values(values).onConflictDoNothing();
}

/**
 * 장르가 하나도 없는 게임에만 스냅샷의 장르를 붙인다. 붙인 게임 id 를 돌려준다(캐시 무효화용).
 * 같은 게임이 여러 번 오면 처음 것을 쓴다.
 */
export async function fillMissingGenres(db: Db, items: ReadonlyArray<{ gameId: string; genres: readonly string[] | undefined }>): Promise<string[]> {
  const candidates = new Map<string, readonly string[]>();
  for (const it of items) if (!candidates.has(it.gameId) && clean(it.genres).length > 0) candidates.set(it.gameId, it.genres ?? []);
  if (candidates.size === 0) return [];
  const have = await db.selectDistinct({ gameId: gameGenres.gameId }).from(gameGenres).where(inArray(gameGenres.gameId, [...candidates.keys()]));
  for (const h of have) candidates.delete(h.gameId);
  if (candidates.size === 0) return [];
  await linkGenresMany(db, candidates);
  return [...candidates.keys()];
}
