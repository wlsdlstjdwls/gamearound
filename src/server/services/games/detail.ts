// 게임 상세 — 태그 `game:<slug>` 로 캐시한다(§4.5). 크롤러가 해당 게임을 갱신하면 그 태그만 무효화된다.
import { unstable_cache } from "next/cache";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gameSubscriptions, games, news, subscriptions as subscriptionsTable, type Platform } from "@/server/db/schema";
import type { GameDetail, SubscriptionDto } from "./dto";
import { iso, toPlatformDto } from "./mappers";

const DETAIL_NEWS_LIMIT = 5;
/** 상세에 한 번에 띄울 DLC 수. 심즈류는 수십 개라 상한이 없으면 화면이 DLC 목록으로 덮인다 */
const DETAIL_DLC_LIMIT = 30;

/** 플랫폼 표시 순서 — 상세의 가격 표와 DLC 목록이 같은 순서를 써야 눈이 따라간다 */
const PLATFORM_ORDER: Platform[] = ["steam", "ps5", "ps4", "xbox", "switch", "switch2"];
function byPlatformOrder(a: { platform: Platform }, b: { platform: Platform }): number {
  return PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform);
}

/** 지금 구독으로 즐길 수 있는 플랫폼들. removed_at 이 찍힌 이력 행은 제외한다 */
async function activeSubscriptions(gamePlatformIds: string[]): Promise<SubscriptionDto[]> {
  if (gamePlatformIds.length === 0) return [];
  const rows = await getDb()
    .select({ key: subscriptionsTable.key, label: subscriptionsTable.labelKo, platform: subscriptionsTable.platform })
    .from(gameSubscriptions)
    .innerJoin(subscriptionsTable, eq(subscriptionsTable.id, gameSubscriptions.subscriptionId))
    .where(and(inArray(gameSubscriptions.gamePlatformId, gamePlatformIds), isNull(gameSubscriptions.removedAt)));
  // 같은 구독이 플랫폼별로 두 번 올 수 있다(콘솔, PC). key 로 접는다
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return Array.from(byKey.values());
}

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
      companies: { with: { company: true } },
      upgrades: true,
      // DLC 는 본편 화면에서만 필요하다. DLC 자기 화면에서는 빈 배열이 된다(부모가 자식을 갖지 않으므로)
      dlcs: { with: { platforms: true }, limit: DETAIL_DLC_LIMIT },
    },
  });
  if (!row) return null;

  const platforms = [...row.platforms].sort(byPlatformOrder).map(toPlatformDto);
  const subscriptions = await activeSubscriptions(row.platforms.map((p) => p.id));

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
    companies: row.companies
      .map((gc) => ({
        slug: gc.company.slug,
        name: companyDisplayName(gc.company),
        countryNameKo: gc.company.countryNameKo,
        role: gc.role,
      }))
      // 개발사를 먼저 보여준다 — 사용자가 먼저 찾는 쪽이다
      .sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name, "ko") : a.role === "developer" ? -1 : 1)),
    dlcs: row.dlcs
      .map((d) => ({
        slug: d.slug,
        title: d.titleKo ?? d.titleEn,
        platforms: [...d.platforms].sort(byPlatformOrder).map(toPlatformDto),
      }))
      .sort((a, b) => a.title.localeCompare(b.title, "ko")),
    subscriptions,
    upgrades: row.upgrades.map((u) => ({
      fromPlatform: u.fromPlatform,
      toPlatform: u.toPlatform,
      kind: u.kind,
      price: u.price,
      storeUrl: u.storeUrl,
      note: u.note,
    })),
  };
}

/** 한국어명이 있으면 한국어명. 회사 화면과 상세 칩이 같은 규칙을 써야 같은 회사로 읽힌다 */
export function companyDisplayName(c: { nameKo: string | null; nameEn: string }): string {
  return c.nameKo ?? c.nameEn;
}

/** 상세 — 태그 `game:<slug>` (§4.5). 크롤러가 해당 게임 갱신 후 revalidateTag 호출 */
export async function getGameBySlugCached(slug: string): Promise<GameDetail | null> {
  const cached = unstable_cache(() => getGameBySlug(slug), ["game", slug], { tags: [`game:${slug}`] });
  return cached();
}
