// 스팀 앱별 이벤트를 카드로 담는다. 인기순위 안의 게임을 가장 오래 안 본 순서로 돈다(STEAM_EVENTS_* 주석).
//
// 끝난 이벤트 카드는 지우지 않는다 — 화면이 끝난 것을 거르고(services/game-events), 기록은 남겨 둔다.
import { and, asc, eq, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gameEventChecks, gamePlatforms, games, gameSourceRefs, HOME_REGION } from "@/server/db/schema";
import { fetchSteamEvents } from "@/server/adapters/steam/events";
import { sleep } from "@/lib/async";
import { STEAM_EVENTS_INTERVAL_MS, STEAM_EVENTS_PER_RUN, STEAM_EVENTS_RANK_MAX } from "@/server/sync/constants";
import { markChecked, upsertEvents } from "./write";
import type { EventRunPart } from "./types";

const SOURCE = "steam";
const ACTOR = "cron:steam-events" as const;

async function pickTargets(limit: number): Promise<Array<{ gameId: string; appid: string }>> {
  return getDb()
    .select({ gameId: gameSourceRefs.gameId, appid: gameSourceRefs.externalId })
    .from(gameSourceRefs)
    .innerJoin(games, eq(games.id, gameSourceRefs.gameId))
    .innerJoin(gamePlatforms, and(eq(gamePlatforms.gameId, gameSourceRefs.gameId), eq(gamePlatforms.platform, "steam"), eq(gamePlatforms.region, HOME_REGION)))
    .leftJoin(gameEventChecks, and(eq(gameEventChecks.gameId, gameSourceRefs.gameId), eq(gameEventChecks.source, SOURCE)))
    .where(
      and(
        eq(gameSourceRefs.source, "steam"),
        inArray(gameSourceRefs.matchedBy, ["auto", "manual"]),
        eq(games.contentType, "game"),
        isNotNull(gamePlatforms.popularityRank),
        lte(gamePlatforms.popularityRank, STEAM_EVENTS_RANK_MAX),
      ),
    )
    .orderBy(sql`${gameEventChecks.checkedAt} asc nulls first`, asc(gamePlatforms.popularityRank))
    .limit(limit);
}

export async function collectSteamEvents(now: Date, part: EventRunPart, limit = STEAM_EVENTS_PER_RUN): Promise<void> {
  const targets = await pickTargets(limit);
  part.candidates += targets.length;
  const checked: string[] = [];
  for (const t of targets) {
    try {
      const events = await fetchSteamEvents(t.appid, now);
      part.written += await upsertEvents(
        events.map((e) => ({
          gameId: t.gameId,
          source: SOURCE,
          sourceKey: e.gid,
          kind: "event",
          url: e.url,
          title: e.title,
          description: e.description,
          imageUrl: e.imageUrl,
          publishedAt: e.publishedAt ? new Date(e.publishedAt) : null,
          startsAt: new Date(e.startsAt),
          endsAt: new Date(e.endsAt),
        })),
        ACTOR,
      );
      checked.push(t.gameId);
    } catch (e) {
      part.fail(`steam ${t.appid}`, e);
    }
    await sleep(STEAM_EVENTS_INTERVAL_MS);
  }
  // 실패한 게임은 "봤다" 를 남기지 않는다 — 다음 회차 맨 앞에서 다시 묻는다
  await markChecked(checked, SOURCE, now, ACTOR);
}
