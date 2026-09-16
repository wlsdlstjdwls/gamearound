// 게임 상세 — 태그 `game:<slug>` 로 캐시한다(§4.5). 크롤러가 해당 게임을 갱신하면 그 태그만 무효화된다.
import { unstable_cache } from "next/cache";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gameSubscriptions, games, news, subscriptions as subscriptionsTable } from "@/server/db/schema";
import { keepVisiblePlatforms } from "@/server/db/visibility";
import type { GameDetail, SubscriptionDto } from "./dto";
import { byRegionThenPlatform, iso, toPlatformDto } from "./mappers";
import { DTO_CACHE_VERSION } from "@/lib/cache";

const DETAIL_NEWS_LIMIT = 5;
/** 상세에 한 번에 띄울 DLC 수. 심즈류는 수십 개라 상한이 없으면 화면이 DLC 목록으로 덮인다 */
const DETAIL_DLC_LIMIT = 30;

/**
 * 지금 구독으로 즐길 수 있는 플랫폼들 — game_platform 별로 묶어서 돌려준다.
 *
 * 게임 단위로 접지 않는 이유(2026-09-15): Game Pass 는 Xbox 에서만 유효한 혜택인데
 * 게임 위에 하나로 붙여 두면 PS 탭을 보는 사람도 "구독으로 할 수 있다" 로 읽는다.
 * 구독은 스토어의 성질이라 그 스토어 안에서만 말해야 참이다.
 * removed_at 이 찍힌 이력 행은 제외한다.
 */
async function activeSubscriptionsByPlatform(gamePlatformIds: string[]): Promise<Map<string, SubscriptionDto[]>> {
  const out = new Map<string, SubscriptionDto[]>();
  if (gamePlatformIds.length === 0) return out;
  const rows = await getDb()
    .select({ gamePlatformId: gameSubscriptions.gamePlatformId, key: subscriptionsTable.key, label: subscriptionsTable.labelKo })
    .from(gameSubscriptions)
    .innerJoin(subscriptionsTable, eq(subscriptionsTable.id, gameSubscriptions.subscriptionId))
    .where(and(inArray(gameSubscriptions.gamePlatformId, gamePlatformIds), isNull(gameSubscriptions.removedAt)));
  for (const r of rows) {
    const list = out.get(r.gamePlatformId) ?? [];
    // 한 플랫폼 행에 같은 구독이 두 번 붙는 일은 없지만, 카탈로그가 겹쳐 들어온 적이 있어 key 로 한 번 접는다
    if (!list.some((s) => s.key === r.key)) list.push({ key: r.key, label: r.label });
    out.set(r.gamePlatformId, list);
  }
  return out;
}

/** 게임 전체 기준의 구독 목록 — 어느 스토어든 하나라도 포함이면 여기 들어온다(목록, 필터가 쓴다) */
function flattenSubscriptions(byPlatform: Map<string, SubscriptionDto[]>): SubscriptionDto[] {
  const byKey = new Map<string, SubscriptionDto>();
  for (const list of byPlatform.values()) for (const s of list) byKey.set(s.key, s);
  return Array.from(byKey.values());
}

/** 자식 행(DLC, 에디션)을 화면 계약으로 옮긴다. 둘이 같은 모양이라 변환도 하나만 둔다 */
function toChildDtos(rows: { slug: string; titleKo: string | null; titleEn: string; platforms: Parameters<typeof toPlatformDto>[0][] }[]) {
  return rows
    .map((d) => ({
      slug: d.slug,
      title: d.titleKo ?? d.titleEn,
      platforms: keepVisiblePlatforms([...d.platforms]).sort(byRegionThenPlatform).map(toPlatformDto),
    }))
    .sort((a, b) => a.title.localeCompare(b.title, "ko"));
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
      // 자식(DLC, 에디션)은 본편 화면에서만 필요하다. 자식 자기 화면에서는 빈 배열이 된다(자식이 자식을 갖지 않으므로)
      dlcs: { with: { platforms: true }, limit: DETAIL_DLC_LIMIT },
      // 반대 방향 — 자식 화면에서 본편으로 돌아가는 링크에 쓴다. 본편 행에서는 null 이다
      parent: { columns: { slug: true, titleKo: true, titleEn: true } },
    },
  });
  if (!row) return null;

  // 관계형 조회(with)는 조건을 걸기 번거로워 읽어 온 뒤 거른다 — 상세는 게임 하나라 행이 몇 개뿐이다
  const visible = keepVisiblePlatforms(row.platforms);
  const subsByPlatform = await activeSubscriptionsByPlatform(visible.map((p) => p.id));
  const platforms = [...visible]
    .sort(byRegionThenPlatform)
    .map((p) => ({ ...toPlatformDto(p), subscriptions: subsByPlatform.get(p.id) ?? [] }));
  const subscriptions = flattenSubscriptions(subsByPlatform);

  return {
    id: row.id,
    slug: row.slug,
    contentType: row.contentType,
    parent: row.parent ? { slug: row.parent.slug, title: row.parent.titleKo ?? row.parent.titleEn } : null,
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
    dlcs: toChildDtos(row.dlcs.filter((d) => d.contentType !== "edition" && d.contentType !== "bundle")),
    // 에디션, 번들은 "어느 판을 살까" 쪽이라 DLC 칸과 나눈다(dto 의 editions 주석)
    editions: toChildDtos(row.dlcs.filter((d) => d.contentType === "edition" || d.contentType === "bundle")),
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
  const cached = unstable_cache(() => getGameBySlug(slug), [DTO_CACHE_VERSION, "game", slug], { tags: [`game:${slug}`] });
  return cached();
}
