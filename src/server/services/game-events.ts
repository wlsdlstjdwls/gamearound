// 게임 상세의 이벤트, 소식 카드 읽기. 수집(쓰기)은 sync/game-events 가 맡고, 여기는 화면 계약(DTO)만 낸다(규약 §1).
//
// 무엇을 띄우나: 숨기지 않은 카드 중 아직 안 끝난 것. 기간을 주는 카드(스팀)는 끝나는 시각으로, 기간을 모르는 소식(닌텐도 글)은
// 게시일부터 GAME_EVENTS_SHOW_DAYS 동안. 공식 소개 페이지는 게임이 있는 한 늘 띄운다.
// 캐시하지 않는다 — 대부분의 게임은 카드가 없어 인덱스(game_id) 한 번으로 끝난다(예약 특전과 같은 판단).
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gameEvents } from "@/server/db/schema";
import { GAME_EVENTS_MAX_CARDS, GAME_EVENTS_SHOW_DAYS } from "@/server/sync/constants";
import type { GameEventDto, GameEventKind } from "@/lib/game-events/dto";

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

export async function listGameEvents(gameId: string): Promise<GameEventDto[]> {
  const rows = await getDb()
    .select()
    .from(gameEvents)
    .where(
      and(
        eq(gameEvents.gameId, gameId),
        eq(gameEvents.hidden, false),
        sql`(case
          when ${gameEvents.endsAt} is not null then ${gameEvents.endsAt} > now()
          when ${gameEvents.kind} = 'page' then true
          else coalesce(${gameEvents.publishedAt} > now() - make_interval(days => ${GAME_EVENTS_SHOW_DAYS}::int), false)
        end)`,
      ),
    )
    // 공식 소개 페이지는 늘 맨 뒤 — 새 소식이 먼저 보여야 한다
    .orderBy(sql`${gameEvents.kind} = 'page'`, desc(gameEvents.publishedAt), asc(gameEvents.endsAt))
    .limit(GAME_EVENTS_MAX_CARDS);
  return rows.map((r) => ({
    kind: r.kind as GameEventKind,
    source: r.source,
    url: r.url,
    title: r.title,
    description: r.description,
    imageUrl: r.imageUrl,
    publishedAt: iso(r.publishedAt),
    startsAt: iso(r.startsAt),
    endsAt: iso(r.endsAt),
  }));
}
