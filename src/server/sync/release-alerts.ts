// 출시 알림 — 출시 예정 줄의 "출시 알림"(기획서 v2.0 S-03, 목업 월별 보기 줄 끝 단추)을 누른 사람에게 출시 소식을 알림함으로 보낸다.
//
// 따로 구독 테이블을 두지 않고 찜(wishlists)을 쓴다. 출시 알림 단추는 그 게임을 찜하는 단추다 —
// 같은 게임을 "찜" 과 "출시 알림" 두 칸에 따로 담게 하면 한쪽만 풀었을 때 무엇이 남았는지 사람이 헷갈린다.
// 그래서 출시 전에 찜해 둔 사람은 누구나 받는다(찜 목록에서도 출시를 기다리는 것과 같은 뜻이다).
//
// 판정은 출시 예정 화면과 같다: 게임이 아는 **가장 이른 한국 날짜**(services/games/upcoming 의 earliestCte 주석).
// 하루 크론이 하루 빠져도 놓치지 않게 며칠 거슬러 보고, 같은 사람에게 같은 게임을 두 번 보내지 않게 알림함에 이미 있으면 건너뛴다.
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { createdBy } from "@/server/db/audit";
import { gamePlatforms, games, HOME_REGION, notifications, wishlists } from "@/server/db/schema";
import { visiblePlatformsOnly } from "@/server/db/visibility";
import { NOTIFICATION_MESSAGES as M } from "@/lib/notifications/messages";
import { RELEASE_ALERT_LOOKBACK_DAYS } from "./constants";

const SOURCE = "cron:release-alerts" as const;

/** 오늘(한국 날짜) 또는 최근 며칠 사이 출시된 게임에 찜한 사람마다 알림 한 줄. 돌려주는 값은 새로 쌓은 알림 수 */
export async function dispatchReleaseAlerts(): Promise<number> {
  const db = getDb();
  const visible = visiblePlatformsOnly();
  // 한국 날짜로 센다 — 크론은 UTC 18시(한국 03시)에 돌아서 current_date 를 그대로 쓰면 하루 늦다
  const released = await db.execute<{ game_id: string; slug: string; title: string }>(sql`
    select ${games.id} as game_id, ${games.slug} as slug, coalesce(${games.titleKo}, ${games.titleEn}) as title
    from ${gamePlatforms}
    inner join ${games} on ${games.id} = ${gamePlatforms.gameId}
    where ${eq(gamePlatforms.region, HOME_REGION)} ${visible ? sql`and ${visible}` : sql``}
    group by ${games.id}, ${games.slug}, ${games.titleKo}, ${games.titleEn}
    having min(${gamePlatforms.releaseDate}) <= (now() at time zone 'Asia/Seoul')::date
      and min(${gamePlatforms.releaseDate}) > (now() at time zone 'Asia/Seoul')::date - ${RELEASE_ALERT_LOOKBACK_DAYS}::int
  `);
  if (released.rows.length === 0) return 0;

  const byGame = new Map(released.rows.map((r) => [r.game_id, r]));
  const wishers = await db
    .select({ userId: wishlists.userId, gameId: wishlists.gameId })
    .from(wishlists)
    .where(inArray(wishlists.gameId, [...byGame.keys()]));
  if (wishers.length === 0) return 0;

  const links = [...new Set([...byGame.values()].map((g) => `/games/${g.slug}`))];
  const sent = await db
    .select({ userId: notifications.userId, link: notifications.link })
    .from(notifications)
    .where(and(eq(notifications.kind, "release"), inArray(notifications.link, links)));
  const already = new Set(sent.map((s) => `${s.userId}|${s.link}`));

  const rows = wishers.flatMap((w) => {
    const g = byGame.get(w.gameId);
    const link = g ? `/games/${g.slug}` : null;
    if (!g || !link || already.has(`${w.userId}|${link}`)) return [];
    return [{ userId: w.userId, kind: "release" as const, body: M.released(g.title), link, ...createdBy(SOURCE) }];
  });
  if (rows.length === 0) return 0;
  await db.insert(notifications).values(rows);
  return rows.length;
}
