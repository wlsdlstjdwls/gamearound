// 게임 상세 — 태그 `game:<slug>` 로 캐시한다(§4.5). 크롤러가 해당 게임을 갱신하면 그 태그만 무효화된다.
import { unstable_cache } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { games, news, type Platform } from "@/server/db/schema";
import type { GameDetail } from "./dto";
import { iso, toPlatformDto } from "./mappers";

const DETAIL_NEWS_LIMIT = 5;

export async function getGameBySlug(slug: string): Promise<GameDetail | null> {
  const db = getDb();
  const row = await db.query.games.findFirst({
    where: eq(games.slug, slug),
    with: {
      platforms: true,
      playtime: true,
      genres: { with: { genre: true } },
      news: { orderBy: desc(news.publishedAt), limit: DETAIL_NEWS_LIMIT },
      sourceRefs: true,
    },
  });
  if (!row) return null;

  const platformOrder: Platform[] = ["steam", "ps5", "ps4", "xbox", "switch", "switch2"];
  const platforms = [...row.platforms]
    .sort((a, b) => platformOrder.indexOf(a.platform) - platformOrder.indexOf(b.platform))
    .map(toPlatformDto);

  return {
    id: row.id,
    slug: row.slug,
    titleKo: row.titleKo,
    titleEn: row.titleEn,
    description: row.description,
    coverUrl: row.coverUrl,
    portraitUrl: row.portraitUrl,
    developer: row.developer,
    publisher: row.publisher,
    localMaxPlayers: row.localMaxPlayers,
    onlineMaxPlayers: row.onlineMaxPlayers,
    supportsSolo: row.supportsSolo ?? true,
    supportsCoop: row.supportsCoop ?? false,
    supportsPvp: row.supportsPvp ?? false,
    isRetro: row.isRetro ?? false,
    updatedAt: row.updatedAt.toISOString(),
    genres: row.genres.map((gg) => gg.genre.name).sort(),
    platforms,
    playtime: row.playtime
      ? {
          mainStoryHours: row.playtime.mainStoryHours,
          mainExtraHours: row.playtime.mainExtraHours,
          completionistHours: row.playtime.completionistHours,
          lastSyncedAt: iso(row.playtime.lastSyncedAt),
        }
      : null,
    news: row.news.map((n) => ({
      id: n.id,
      title: n.title,
      url: n.url,
      sourceName: n.sourceName,
      thumbnailUrl: n.thumbnailUrl,
      publishedAt: n.publishedAt.toISOString(),
    })),
    // 공개 화면 "정보 출처"는 확정된 매핑(auto/manual)만. pending(검수 대기), none(미매칭 기록)은 노출하지 않는다
    sourceRefs: row.sourceRefs
      .filter((r) => r.matchedBy === "auto" || r.matchedBy === "manual")
      .map((r) => ({ source: r.source, externalId: r.externalId, url: r.url })),
  };
}

/** 상세 — 태그 `game:<slug>` (§4.5). 크롤러가 해당 게임 갱신 후 revalidateTag 호출 */
export async function getGameBySlugCached(slug: string): Promise<GameDetail | null> {
  const cached = unstable_cache(() => getGameBySlug(slug), ["game", slug], { tags: [`game:${slug}`] });
  return cached();
}
