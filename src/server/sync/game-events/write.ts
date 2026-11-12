// 이벤트 카드 쓰기 — 출처 둘(nintendo, steam)이 함께 쓰는 저장 규칙.
//
// 같은 (출처, 식별자, 게임)이면 값이 바뀐 칸만 고친다(규약 §7). hidden 은 건드리지 않는다 — 관리자가 내린 카드를 되살리지 않는다.
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { createdBy, updatedBy } from "@/server/db/audit";
import { gameEventChecks, gameEvents } from "@/server/db/schema";

export type EventRow = {
  gameId: string;
  source: string;
  sourceKey: string;
  kind: string;
  url: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  publishedAt: Date | null;
  startsAt: Date | null;
  endsAt: Date | null;
};

/** 넣은 줄 수와 고친 줄 수 */
export async function upsertEvents(rows: EventRow[], actor: `cron:${string}`): Promise<number> {
  if (rows.length === 0) return 0;
  const changed = await getDb()
    .insert(gameEvents)
    .values(rows.map((r) => ({ ...r, ...createdBy(actor) })))
    .onConflictDoUpdate({
      target: [gameEvents.source, gameEvents.sourceKey, gameEvents.gameId],
      set: {
        kind: sql`excluded.kind`,
        url: sql`excluded.url`,
        title: sql`excluded.title`,
        description: sql`excluded.description`,
        imageUrl: sql`excluded.image_url`,
        startsAt: sql`excluded.starts_at`,
        endsAt: sql`excluded.ends_at`,
        ...updatedBy(actor),
      },
      // 값이 같으면 고치지 않는다 — 수정 시각이 "실제로 바뀐 때" 를 말하게
      setWhere: sql`(${gameEvents.kind}, ${gameEvents.url}, ${gameEvents.title}, ${gameEvents.description}, ${gameEvents.imageUrl}, ${gameEvents.startsAt}, ${gameEvents.endsAt})
        is distinct from (excluded.kind, excluded.url, excluded.title, excluded.description, excluded.image_url, excluded.starts_at, excluded.ends_at)`,
    })
    .returning({ id: gameEvents.id });
  return changed.length;
}

/** 이미 담은 식별자. 닌텐도 글은 한 번 담으면 다시 받지 않는다 */
export async function knownKeys(source: string, keys: string[]): Promise<Set<string>> {
  if (keys.length === 0) return new Set();
  const rows = await getDb()
    .selectDistinct({ key: gameEvents.sourceKey })
    .from(gameEvents)
    .where(and(eq(gameEvents.source, source), inArray(gameEvents.sourceKey, keys)));
  return new Set(rows.map((r) => r.key));
}

/** 이 게임들을 이 출처에서 지금 봤다고 남긴다(이벤트가 없어도) */
export async function markChecked(gameIds: string[], source: string, now: Date, actor: `cron:${string}`): Promise<void> {
  if (gameIds.length === 0) return;
  await getDb()
    .insert(gameEventChecks)
    .values(gameIds.map((gameId) => ({ gameId, source, checkedAt: now, ...createdBy(actor) })))
    .onConflictDoUpdate({ target: [gameEventChecks.gameId, gameEventChecks.source], set: { checkedAt: now, ...updatedBy(actor) } });
}
