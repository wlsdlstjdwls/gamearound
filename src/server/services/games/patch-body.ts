// 패치 노트 한 건의 원문 본문 — 업데이트 노트 팝업이 본문이 비어 있는 기록을 열 때 부른다(api/games/patch-body).
//
// 왜 필요한가(2026-11-23 사용자 "영어 본문 우리가 갖고 있지 않나, 그걸 보여 주면 되잖아"): 수집(sync/patch-list)은 제목, 링크만 받고
// 본문은 번역 단계(sync/patch-translate)가 고른 기록에만 채운다. 그래서 기록 약 5만 건 중 본문이 있는 것은 번역을 거친 143건뿐이었다.
// 전부 미리 받으면 Neon 전송량(월 5GB 한도에 바짝)과 스팀 호출을 먹는다 — 사람이 연 글만 그 자리에서 스팀에서 받는다.
//
// DB 에 쓰지 않는다(규약 §1: 수집 결과를 쓰는 것은 sync 뿐). 같은 글을 자꾸 여는 비용은 unstable_cache 가 막는다.
// 스팀 뉴스 API 는 게임당 최근 글 몇십 건만 준다(STEAM_NEWS_COUNT) — 그보다 오래된 글은 null 이고 화면은 스토어 링크를 가리킨다.
import { unstable_cache } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gamePlatforms, patchNotes } from "@/server/db/schema";
import { fetchSteamPatchBodies } from "@/server/adapters/steam/patch-body";
import { cleanSteamPatchBody } from "@/server/adapters/steam/clean-patch-body";
import { DTO_CACHE_VERSION, PATCH_BODY_REVALIDATE_SECONDS } from "@/lib/cache";
import { errorMessage } from "@/lib/errors";

export type PatchOriginalDto = { bodyEn: string | null };

async function load(noteId: string): Promise<PatchOriginalDto> {
  const [row] = await getDb()
    .select({ source: patchNotes.source, gid: patchNotes.externalId, bodyEn: patchNotes.bodyEn, appid: gamePlatforms.storeExternalId })
    .from(patchNotes)
    .innerJoin(gamePlatforms, eq(gamePlatforms.id, patchNotes.gamePlatformId))
    .where(eq(patchNotes.id, noteId))
    .limit(1);
  if (!row) return { bodyEn: null };
  if (row.bodyEn) return { bodyEn: row.bodyEn };
  // 본문을 받아 올 길이 있는 소스는 스팀뿐이다(다른 스토어는 패치 기록 자체를 공개하지 않는다)
  if (row.source !== "steam" || !row.appid || !row.gid) return { bodyEn: null };
  // 스팀 실패는 여기서 삼키지 않는다 — 삼키면 "본문 없음" 이 캐시에 하루 동안 박힌다. 던져야 unstable_cache 가 담지 않는다
  const item = (await fetchSteamPatchBodies(row.appid)).get(row.gid);
  const body = item ? cleanSteamPatchBody(item.contents).trim() : "";
  return { bodyEn: body.length > 0 ? body : null };
}

export async function getPatchOriginalBody(noteId: string): Promise<PatchOriginalDto> {
  try {
    return await unstable_cache(() => load(noteId), ["patch-original", DTO_CACHE_VERSION, noteId], { revalidate: PATCH_BODY_REVALIDATE_SECONDS })();
  } catch (e) {
    // 스팀이 실패해도 팝업은 선다 — 본문 없이 스토어 링크만 남는다(이 PC 망처럼 스팀이 막힌 곳도 같다)
    console.warn(`[patch-body] ${noteId} ${errorMessage(e)}`);
    return { bodyEn: null };
  }
}
