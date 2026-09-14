// 검색 별칭 반영 — 수집이 가져온 별칭을 game_aliases 에 쓴다.
//
// 규칙 둘만 지키면 된다:
//   1. 사람이 넣은 별칭(source="manual")은 어떤 수집도 건드리지 않는다. 지우지도, 덮지도 않는다.
//   2. 자기가 넣은 별칭은 통째로 갈아 끼운다 — 위키데이터에서 시리즈가 지워지면 우리도 지워야 한다.
//      값 비교로 부분 갱신하지 않는 이유: 별칭은 집합이라 "무엇이 빠졌나"를 따로 계산할 이유가 없다.
import { and, eq } from "drizzle-orm";
import { gameAliases } from "@/server/db/schema";
import type { Source } from "@/server/adapters/types";
import { normalizeForSearch } from "@/lib/slug";
import type { Ctx } from "./context";
import { ALIAS_PER_GAME_MAX } from "./constants";

export interface AliasApplyResult {
  added: number;
  removed: number;
}

/**
 * 한 게임의 자동 별칭을 주어진 목록으로 맞춘다. 실제로 달라질 때만 쓴다 —
 * 매 실행 지우고 다시 넣으면 바뀐 게 없어도 캐시를 무효화하게 된다.
 */
export async function applyAliases(
  ctx: Ctx,
  gameId: string,
  slug: string,
  source: Source,
  aliases: string[],
): Promise<AliasApplyResult> {
  const { db } = ctx;
  // 정규화가 같은 값은 하나로 접는다(DB 유니크 인덱스가 정규화본 기준이라 안 접으면 삽입이 충돌한다)
  const wanted = new Map<string, string>();
  for (const a of aliases) {
    const norm = normalizeForSearch(a);
    if (!norm) continue;
    if (!wanted.has(norm)) wanted.set(norm, a.trim());
    if (wanted.size >= ALIAS_PER_GAME_MAX) break;
  }

  const existing = await db
    .select({ id: gameAliases.id, norm: gameAliases.aliasNorm })
    .from(gameAliases)
    .where(and(eq(gameAliases.gameId, gameId), eq(gameAliases.source, source)));
  const have = new Map(existing.map((r) => [r.norm ?? "", r.id]));

  const toAdd = [...wanted].filter(([norm]) => !have.has(norm));
  const toRemove = existing.filter((r) => !wanted.has(r.norm ?? ""));

  for (const row of toRemove) await db.delete(gameAliases).where(eq(gameAliases.id, row.id));
  if (toAdd.length > 0) {
    await db
      .insert(gameAliases)
      // 사람이 이미 같은 별칭을 넣어 뒀으면 유니크 인덱스가 막는다 — 그게 맞다. 사람 것이 남는다
      .values(toAdd.map(([, alias]) => ({ gameId, alias, source })))
      .onConflictDoNothing();
  }

  if (toAdd.length > 0 || toRemove.length > 0) ctx.changedSlugs.add(slug);
  return { added: toAdd.length, removed: toRemove.length };
}
