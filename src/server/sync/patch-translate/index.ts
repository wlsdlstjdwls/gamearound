// 패치 노트 본문 전문 번역 — 수집이 쌓은 스팀 패치 기록에 원문 본문(body_en)과 한글 전문(body_ko)을 채운다.
// 2026-11-18 사용자 결정: 요약이 아니라 전문을 미리 번역해 쌓고, 상세 화면이 한글을 먼저 보인다("데이터 관리 쌓는 것처럼").
//
// 왜 수집(sync/patch-list)과 따로 도나: 수집은 본문 없이(maxlength=1) 제목, 링크만 받는다. 본문은 무겁고(평균 약 2천 자)
// 번역은 한 달 글자 몫이 정해져 있어 "새 기록 전부" 가 아니라 "고른 기록" 만 옮긴다. 고르는 순서는 pick.ts 머리 주석.
//
// 멈추는 자리는 셋이다: 하루 몫, 달 몫(sync/constants 의 PATCH_TRANSLATE_*), DeepL 이 456(한도 초과)을 준 순간.
// 앞의 둘은 다음 기록이 몫을 넘으면 그 자리에서 회차를 끝낸다 — 그 기록은 대기로 남아 다음 날 맨 앞에 선다.
// 기록 하나의 실패는 회차를 멈추지 않는다(규약 §7). 실패 횟수를 세어 PATCH_TRANSLATE_FAIL_MAX 에서 'failed' 로 접는다.
//
// 이 파일만 patch_notes 의 body_* 칸을 쓴다(규약 §1: 어댑터는 가져오기만, 쓰기는 sync).
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { patchNotes } from "@/server/db/schema";
import { updatedBy } from "@/server/db/audit";
import { fetchSteamPatchBodies } from "@/server/adapters/steam/patch-body";
import { joinChunks } from "@/server/adapters/translate/chunk";
import { DeeplQuotaError, getDeeplUsage, translateChunksStrict, translationConfigured } from "@/server/adapters/translate";
import { sleep } from "@/lib/async";
import { errorMessage } from "@/lib/errors";
import {
  ERROR_SAMPLE_MAX,
  PATCH_TRANSLATE_DAILY_CHARS,
  PATCH_TRANSLATE_DEEPL_RESERVE,
  PATCH_TRANSLATE_INTERVAL_MS,
  PATCH_TRANSLATE_MONTHLY_CHARS,
  PATCH_TRANSLATE_PER_RUN,
  PATCH_TRANSLATE_RECENT_DAYS,
} from "@/server/sync/constants";
import { revalidateGameTags } from "@/server/sync/revalidate";
import { afterFailure, fitsBudget, planBody, spend, type Budget, type PatchBodyStatus } from "./plan";
import { dayStart, monthStart, patchCharsSince, pickPatchTranslateTargets, type PatchTranslatePick } from "./pick";

export { PATCH_BODY_STATUSES, type PatchBodyStatus } from "./plan";

const ACTOR = "cron:patch-translate" as const;
const LIMITS = { daily: PATCH_TRANSLATE_DAILY_CHARS, monthly: PATCH_TRANSLATE_MONTHLY_CHARS, reserve: PATCH_TRANSLATE_DEEPL_RESERVE };

/** 왜 회차가 끝났나. 크론 응답에 그대로 내서 "왜 이것뿐인가" 를 되짚는다 */
export type PatchTranslateStop = "done" | "no_key" | "daily_budget" | "monthly_budget" | "deepl_reserve" | "deepl_quota";

export interface PatchTranslateResult {
  picked: number;
  translated: number;
  /** 한국어 원문, 빈 본문, 너무 긴 글, 피드에 없는 글 — 옮기지 않고 끝낸 수 */
  settled: number;
  failed: number;
  chars: number;
  stop: PatchTranslateStop;
  budget: Budget;
  errors: string[];
}

function budgetStop(b: Budget, chars: number): PatchTranslateStop {
  if (b.usedToday + chars > LIMITS.daily) return "daily_budget";
  if (b.usedMonth + chars > LIMITS.monthly) return "monthly_budget";
  return "deepl_reserve";
}

async function write(id: string, set: Partial<typeof patchNotes.$inferInsert>): Promise<void> {
  await getDb()
    .update(patchNotes)
    .set({ ...set, ...updatedBy(ACTOR) })
    .where(eq(patchNotes.id, id));
}

/** 옮기지 않고 끝내는 기록(번역 글자 0) */
async function settle(id: string, status: PatchBodyStatus, bodyEn: string | null, bodyKo: string | null, now: Date): Promise<void> {
  await write(id, { bodyStatus: status, bodyEn, bodyKo, bodyTranslatedAt: bodyKo === null ? null : now, bodyChars: 0, bodyError: null });
}

/** appid 별로 묶는다 — 스팀 본문 요청은 게임 단위라 같은 게임의 기록 여럿을 한 번에 받는다 */
function byApp(picks: PatchTranslatePick[]): Map<string, PatchTranslatePick[]> {
  const out = new Map<string, PatchTranslatePick[]>();
  for (const p of picks) {
    const list = out.get(p.appid);
    if (list) list.push(p);
    else out.set(p.appid, [p]);
  }
  return out;
}

export async function runPatchTranslate(opts: { now?: Date; limit?: number } = {}): Promise<PatchTranslateResult> {
  const now = opts.now ?? new Date();
  const result: PatchTranslateResult = {
    picked: 0,
    translated: 0,
    settled: 0,
    failed: 0,
    chars: 0,
    stop: "done",
    budget: { usedToday: 0, usedMonth: 0, deeplRemaining: null },
    errors: [],
  };
  const fail = (label: string, e: unknown) => {
    result.failed++;
    if (result.errors.length < ERROR_SAMPLE_MAX) result.errors.push(`[${label}] ${errorMessage(e)}`);
  };
  if (!translationConfigured()) {
    result.stop = "no_key";
    return result;
  }

  const [usedMonth, usedToday, usage, picks] = await Promise.all([
    patchCharsSince(monthStart(now)),
    patchCharsSince(dayStart(now)),
    getDeeplUsage(),
    pickPatchTranslateTargets(now, opts.limit ?? PATCH_TRANSLATE_PER_RUN, PATCH_TRANSLATE_RECENT_DAYS),
  ]);
  let budget: Budget = { usedToday, usedMonth, deeplRemaining: usage ? usage.limit - usage.used : null };
  result.picked = picks.length;
  const changed = new Set<string>();

  const groups = [...byApp(picks)];
  outer: for (const [i, [appid, notes]] of groups.entries()) {
    if (i > 0) await sleep(PATCH_TRANSLATE_INTERVAL_MS);
    let bodies: Awaited<ReturnType<typeof fetchSteamPatchBodies>>;
    try {
      bodies = await fetchSteamPatchBodies(appid);
    } catch (e) {
      // 스팀 요청 실패는 기록 탓이 아니다(망, 차단) — 실패 횟수를 올리지 않고 다음 회차가 다시 묻는다
      fail(`steam ${appid}`, e);
      continue;
    }
    for (const note of notes) {
      const item = bodies.get(note.externalId);
      try {
        if (!item) {
          // 피드는 최근 공지 STEAM_NEWS_COUNT 건만 준다. 그 밖으로 밀려난 기록은 본문을 받을 길이 없다
          await settle(note.id, "missing", null, null, now);
          result.settled++;
          continue;
        }
        const plan = planBody(item.contents, note);
        if (plan.kind === "empty") {
          await settle(note.id, "empty", null, null, now);
          result.settled++;
          continue;
        }
        if (plan.kind === "source_ko") {
          await settle(note.id, "source_ko", plan.body, plan.body, now);
          result.settled++;
          changed.add(note.slug);
          continue;
        }
        if (plan.kind === "too_long") {
          // 원문은 담는다 — 화면은 "원문만 있어요" 로 원문을 보인다
          await settle(note.id, "too_long", plan.body, null, now);
          result.settled++;
          changed.add(note.slug);
          continue;
        }
        if (!fitsBudget(budget, plan.chars, LIMITS)) {
          result.stop = budgetStop(budget, plan.chars);
          break outer;
        }
        const texts = [...plan.chunks.map((c) => c.text), ...(plan.title ? [plan.title] : [])];
        let out: string[];
        try {
          out = await translateChunksStrict(texts);
        } catch (e) {
          if (e instanceof DeeplQuotaError) {
            result.stop = "deepl_quota";
            break outer;
          }
          // 원문은 받아 둔다 — 번역이 끝내 안 돼도 화면이 원문을 보인다
          const f = afterFailure(note.bodyFailCount);
          await write(note.id, { bodyEn: plan.body, bodyStatus: f.status, bodyFailCount: f.count, bodyError: errorMessage(e).slice(0, 500) });
          fail(`deepl ${note.id}`, e);
          continue;
        }
        const bodyKo = joinChunks(plan.chunks, out.slice(0, plan.chunks.length));
        const titleKo = plan.title ? out[plan.chunks.length]?.trim() || null : null;
        await write(note.id, {
          bodyEn: plan.body,
          bodyKo,
          bodyStatus: "done",
          bodyTranslatedAt: now,
          bodyChars: plan.chars,
          bodyError: null,
          ...(titleKo ? { titleKo } : {}),
        });
        budget = spend(budget, plan.chars);
        result.translated++;
        result.chars += plan.chars;
        changed.add(note.slug);
      } catch (e) {
        // DB 쓰기 실패 등 — 이 기록만 건너뛴다(§7)
        fail(`note ${note.id}`, e);
      }
    }
  }

  result.budget = budget;
  // 상세의 업데이트 노트가 같은 game:<slug> 캐시를 쓴다. 실제로 값이 바뀐 게임만 깬다(§7)
  try {
    await revalidateGameTags([...changed]);
  } catch (e) {
    fail("revalidate", e);
  }
  return result;
}
