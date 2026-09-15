// 패치 기록 조회 — 태그 `game:<slug>` 로 캐시한다(§4.5). 수집이 새 기록을 넣으면 그 태그가 무효화된다.
//
// 이 파일이 대답하는 질문은 두 개다:
//   1. 이 게임은 언제 고쳐졌나 (플랫폼별 목록)
//   2. 얼마나 자주 고치나 (기록 사이 평균 간격)
// 본문은 담지 않는다 — 이유는 schema 의 patch_notes 주석(§10 저작권).
import { unstable_cache } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gamePlatforms, games, patchNotes, type Platform, type Region } from "@/server/db/schema";
import { byRegionThenPlatform } from "./mappers";
import type { PatchNoteDto, PlatformPatchesDto } from "./dto";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * 기록된 패치 사이 평균 간격(일). 최신순으로 정렬된 목록을 받는다.
 * 2건 미만이면 "사이"가 없어 계산할 수 없다 — 0 이 아니라 null 이다.
 *
 * 평균을 쓰는 이유: 중앙값이 이상치에 강하지만, 여기서 알고 싶은 것은 "이 기간에 몇 번 고쳤나" 에
 * 가깝다. 첫 기록과 마지막 기록 사이를 건수로 나눈 값이 그 질문에 곧장 답한다.
 */
export function averageIntervalDays(notes: Array<{ publishedAt: string }>): number | null {
  if (notes.length < 2) return null;
  const newest = new Date(notes[0].publishedAt).getTime();
  const oldest = new Date(notes[notes.length - 1].publishedAt).getTime();
  const span = newest - oldest;
  if (!Number.isFinite(span) || span <= 0) return null;
  return Math.round((span / MS_PER_DAY / (notes.length - 1)) * 10) / 10;
}

type Row = {
  id: string;
  platform: Platform;
  region: Region;
  version: string | null;
  title: string;
  url: string | null;
  publishedAt: Date;
};

/** 최신순 조인 행 → 플랫폼별 묶음. 순수 함수라 테스트가 DB 를 건드리지 않는다 */
export function groupPatchesByPlatform(rows: Row[]): PlatformPatchesDto[] {
  const byKey = new Map<string, PlatformPatchesDto>();
  for (const r of rows) {
    // 같은 기기라도 나라가 다르면 다른 스토어다 — 기록도 섞지 않는다
    const key = `${r.platform}:${r.region}`;
    const note: PatchNoteDto = {
      id: r.id,
      version: r.version,
      title: r.title,
      url: r.url,
      publishedAt: r.publishedAt.toISOString(),
    };
    const group = byKey.get(key);
    if (group) group.notes.push(note);
    else byKey.set(key, { platform: r.platform, region: r.region, notes: [note], averageIntervalDays: null, latestAt: null, count: 0 });
  }

  const out = [...byKey.values()];
  for (const group of out) {
    group.count = group.notes.length;
    group.latestAt = group.notes[0]?.publishedAt ?? null;
    group.averageIntervalDays = averageIntervalDays(group.notes);
  }
  return out.sort(byRegionThenPlatform);
}

export async function getGamePatches(slug: string): Promise<PlatformPatchesDto[]> {
  const rows = await getDb()
    .select({
      id: patchNotes.id,
      platform: gamePlatforms.platform,
      region: gamePlatforms.region,
      version: patchNotes.version,
      title: patchNotes.title,
      url: patchNotes.url,
      publishedAt: patchNotes.publishedAt,
    })
    .from(patchNotes)
    .innerJoin(gamePlatforms, eq(gamePlatforms.id, patchNotes.gamePlatformId))
    .innerJoin(games, eq(games.id, gamePlatforms.gameId))
    .where(eq(games.slug, slug))
    .orderBy(desc(patchNotes.publishedAt));
  return groupPatchesByPlatform(rows);
}

/** 상세, 패치 화면이 같은 캐시 항목을 쓴다 — 태그는 게임 상세와 같은 `game:<slug>` */
export async function getGamePatchesCached(slug: string): Promise<PlatformPatchesDto[]> {
  const cached = unstable_cache(() => getGamePatches(slug), ["game-patches", slug], { tags: [`game:${slug}`] });
  return cached();
}

/**
 * 플랫폼 구분 없이 최신 기록 몇 건. 상세 화면의 요약 블록이 쓴다 —
 * 거기서는 "최근에 고쳐졌나" 만 알면 되고, 플랫폼별 비교는 전용 화면이 맡는다.
 */
export function latestPatches(groups: PlatformPatchesDto[], limit: number): Array<PatchNoteDto & { platform: Platform; region: Region }> {
  return groups
    .flatMap((g) => g.notes.map((n) => ({ ...n, platform: g.platform, region: g.region })))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, limit);
}
