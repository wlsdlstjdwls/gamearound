// 매칭이 auto 로 붙인 게임에 검색 후보의 그림을 채운다. 매칭 판정(match.ts)과 떼어 둔 건 300줄 규약 때문이고,
// 쓰기 규칙(빈 칸만, 잠긴 칸 제외)은 sync/game-writer 와 같다.
import { and, eq, isNull, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { dataCorrections, games } from "@/server/db/schema";
import { updatedBy } from "@/server/db/audit";
import type { SearchableSource } from "@/server/adapters";
import type { SearchCandidate } from "@/server/adapters/types";
import { toSnake } from "./context";

/**
 * 검색 후보가 들고 온 그림을 빈 칸에만 채운다.
 *
 * 왜 여기서: PlayStation 은 콘셉트 상세에 이미지가 없어 가격 수집이 커버를 못 채운다. 발견 목록으로 들어온 게임은
 * 목록이 준 그림을 갖지만, 매칭으로 붙은 게임은 검색 응답이 유일한 출처다(2026-10-07 실측: 커버 없는 PS 본편 13건).
 * auto 일 때만 — pending 은 아직 그 게임이 맞는지 모른다. 이미 값이 있거나 잠긴 칸은 건드리지 않는다(§7).
 */
export async function fillMatchedMedia(gameId: string, source: SearchableSource, candidate: SearchCandidate): Promise<void> {
  if (!candidate.coverUrl && !candidate.portraitUrl) return;
  const db = getDb();
  const locks = await db
    .select({ table: dataCorrections.table, field: dataCorrections.field })
    .from(dataCorrections)
    .where(and(eq(dataCorrections.rowId, gameId), eq(dataCorrections.lockField, true)));
  const locked = new Set(locks.filter((l) => toSnake(l.table) === "games").map((l) => toSnake(l.field)));
  // coalesce 로 빈 칸만 채운다 — 읽고 나서 쓰는 사이에 수집이 채웠을 수도 있다
  const set: { coverUrl?: SQL; portraitUrl?: SQL } = {};
  if (candidate.coverUrl && !locked.has("cover_url")) set.coverUrl = sql`coalesce(${games.coverUrl}, ${candidate.coverUrl})`;
  if (candidate.portraitUrl && !locked.has("portrait_url")) set.portraitUrl = sql`coalesce(${games.portraitUrl}, ${candidate.portraitUrl})`;
  if (!set.coverUrl && !set.portraitUrl) return;
  // 값이 실제로 빈 행만 건드린다(§7: 달라질 때만 UPDATE) — 둘 다 차 있으면 수정자, 수정일도 안 바뀐다
  const empty = [set.coverUrl && isNull(games.coverUrl), set.portraitUrl && isNull(games.portraitUrl)].filter((c) => c !== undefined);
  await db
    .update(games)
    .set({ ...set, ...updatedBy(`cron:match:${source}`) })
    .where(and(eq(games.id, gameId), or(...empty)));
}
