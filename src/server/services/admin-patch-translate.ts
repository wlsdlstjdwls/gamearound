// 관리자 수집 현황의 "패치 번역" 한 줄 — 번역 완료, 대기, 실패, 건너뜀, 이번 달 쓴 글자 수(sync/patch-translate).
//
// 대기는 "최근 공지 창(PATCH_TRANSLATE_RECENT_DAYS) 안의 대기" 만 센다. 지난 기록 4만여 건까지 세면 대기 숫자가
// 늘 수만이라 고장인지 정상인지 읽히지 않는다 — 그 기록은 무료 몫으로 옮길 계획이 없다(sync/constants 주석).
// 글자 수는 우리 DB 합계(달력 달, UTC)다. DeepL 의 실제 사용량(키 발급일 기준)과는 며칠 어긋날 수 있다.
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { patchNotes } from "@/server/db/schema";
import { requireAdmin } from "@/server/services/users";
import { PATCH_TRANSLATE_MONTHLY_CHARS, PATCH_TRANSLATE_RECENT_DAYS } from "@/server/sync/constants";

export interface PatchTranslateStats {
  done: number;
  queued: number;
  failed: number;
  /** 빈 본문, 너무 긴 글, 피드에서 사라진 글 — 옮기지 않기로 끝낸 수 */
  skipped: number;
  monthChars: number;
  monthLimit: number;
}

export async function getPatchTranslateStats(): Promise<PatchTranslateStats> {
  await requireAdmin();
  const rows = await getDb()
    .select({
      done: sql<number>`count(*) filter (where ${patchNotes.bodyStatus} in ('done', 'source_ko'))::int`,
      queued: sql<number>`count(*) filter (where ${patchNotes.bodyStatus} is null and ${patchNotes.source} = 'steam'
        and ${patchNotes.publishedAt} >= now() - make_interval(days => ${PATCH_TRANSLATE_RECENT_DAYS}::int))::int`,
      failed: sql<number>`count(*) filter (where ${patchNotes.bodyStatus} = 'failed')::int`,
      skipped: sql<number>`count(*) filter (where ${patchNotes.bodyStatus} in ('empty', 'too_long', 'missing'))::int`,
      monthChars: sql<number>`coalesce(sum(${patchNotes.bodyChars}) filter (where ${patchNotes.bodyTranslatedAt} >= date_trunc('month', now() at time zone 'UTC') at time zone 'UTC'), 0)::int`,
    })
    .from(patchNotes);
  const r = rows[0];
  return {
    done: r?.done ?? 0,
    queued: r?.queued ?? 0,
    failed: r?.failed ?? 0,
    skipped: r?.skipped ?? 0,
    monthChars: r?.monthChars ?? 0,
    monthLimit: PATCH_TRANSLATE_MONTHLY_CHARS,
  };
}
