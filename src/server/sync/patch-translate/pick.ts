// 패치 번역 대기열 읽기 — 어떤 기록을 이번 회차에 옮길지, 이번 달과 오늘 몇 자를 썼는지.
//
// 고르는 순서는 두 겹이다(PATCH_TRANSLATE_RECENT_DAYS 주석).
//   1. 최근 공지: 게시일이 창 안인 대기 기록을 최신순으로
//   2. 남는 몫: 창 밖이라도 사람들이 최근 본 게임(Redis game-views) 이나 찜한 게임의 대기 기록을 최신순으로
// 지난 기록 4만여 건 전체를 도는 길은 없다 — 무료 몫으로는 닿지 않는다(sync/constants 주석).
import { and, desc, eq, gte, inArray, isNull, lt, or, sql, sum } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gamePlatforms, games, HOME_REGION, patchNotes, wishlists } from "@/server/db/schema";
import { recentlyViewedSlugs } from "@/server/game-views";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface PatchTranslatePick {
  id: string;
  /** 스팀 공지 gid. 본문 응답에서 이 값으로 찾는다 */
  externalId: string;
  /** 스팀 appid(game_platforms.store_external_id) */
  appid: string;
  slug: string;
  title: string;
  titleKo: string | null;
  bodyFailCount: number;
}

function baseQuery() {
  return getDb()
    .select({
      id: patchNotes.id,
      externalId: patchNotes.externalId,
      appid: gamePlatforms.storeExternalId,
      slug: games.slug,
      title: patchNotes.title,
      titleKo: patchNotes.titleKo,
      bodyFailCount: patchNotes.bodyFailCount,
    })
    .from(patchNotes)
    .innerJoin(gamePlatforms, eq(gamePlatforms.id, patchNotes.gamePlatformId))
    .innerJoin(games, eq(games.id, gamePlatforms.gameId));
}

/** 스팀 한국 행의 대기 기록. 본문 경로(adapters/steam/patch-body)가 스팀뿐이라 다른 소스는 대기열에 세우지 않는다 */
const queued = () => and(eq(patchNotes.source, "steam"), eq(gamePlatforms.region, HOME_REGION), isNull(patchNotes.bodyStatus));

type Row = Omit<PatchTranslatePick, "appid"> & { appid: string | null };

function toPicks(rows: Row[]): PatchTranslatePick[] {
  return rows.flatMap((r) => (r.appid ? [{ ...r, appid: r.appid }] : []));
}

export async function pickPatchTranslateTargets(now: Date, limit: number, recentDays: number): Promise<PatchTranslatePick[]> {
  const since = new Date(now.getTime() - recentDays * DAY_MS);
  const recent = toPicks(await baseQuery().where(and(queued(), gte(patchNotes.publishedAt, since))).orderBy(desc(patchNotes.publishedAt)).limit(limit));
  const room = limit - recent.length;
  if (room <= 0) return recent;

  const viewed = await recentlyViewedSlugs(now);
  const interest = or(
    viewed.length > 0 ? inArray(games.slug, viewed) : sql`false`,
    inArray(games.id, getDb().selectDistinct({ id: wishlists.gameId }).from(wishlists)),
  );
  const older = toPicks(
    await baseQuery().where(and(queued(), lt(patchNotes.publishedAt, since), interest)).orderBy(desc(patchNotes.publishedAt)).limit(room),
  );
  return [...recent, ...older];
}

/** 패치 번역이 since 이후 쓴 글자 합. 뉴스 제목 번역은 세지 않는다(그 몫은 PATCH_TRANSLATE_DEEPL_RESERVE 가 지킨다) */
export async function patchCharsSince(since: Date): Promise<number> {
  const [row] = await getDb()
    .select({ n: sum(patchNotes.bodyChars) })
    .from(patchNotes)
    .where(gte(patchNotes.bodyTranslatedAt, since));
  return Number(row?.n ?? 0);
}

/** UTC 기준 이번 달 첫 순간, 오늘 첫 순간. 달력 경계는 UTC 로 둔다 — 크론 시각표(sync/constants)가 UTC 다 */
export function monthStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
export function dayStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
