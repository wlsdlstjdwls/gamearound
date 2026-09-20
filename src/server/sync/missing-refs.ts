// 스토어가 안 주는 ref 를 세고, 성공하면 되돌리고, 오래 안 주면 대상에서 뺀다.
//
// 문제(2026-09-21 실측): ref 는 붙었는데 스토어가 영영 안 주는 상품이 있다 —
// 베르세르크 무쌍(steam 502280), Battle Nations(251670) 처럼 제목 역매칭으로 붙였지만
// 한국 스토어에 없는 것들이다. 그 행들은 game_platforms 행이 아예 없어서
// markPlatformFailed 가 고칠 대상조차 없고, 아무 기록도 안 남아 **매 회차 다시 묻고 다시 실패한다**.
//
// 눈에 띄는 대가는 요청 낭비가 아니라(전 소스 합쳐 54행이다) **신호가 죽는 것**이다:
// 주 1회 도는 crawl-seed 가 늘 partial 로 끝나 늘 빨갛고, 그러면 진짜 고장을 알아볼 수 없다.
import { and, eq, gt, inArray, isNotNull, lt, or, sql } from "drizzle-orm";
import { gameSourceRefs } from "@/server/db/schema";
import type { Db } from "@/server/db/client";
import type { StoreSource } from "@/server/adapters";
import { MISSING_RETRY_DAYS, MISSING_STREAK_MAX } from "./constants";

/**
 * 갱신 대상에서 뺄 조건. **영구 제외가 아니다** — 연속 실패가 한계를 넘었고 **최근에** 물어본 것만 뺀다.
 * MISSING_RETRY_DAYS 가 지나면 조건이 저절로 풀려 한 번 다시 물어본다. 그래도 없으면
 * 다시 세어져 또 한 달 쉰다. 되살아난 상품은 그 한 번에 잡힌다.
 */
export function missingRefExcluded() {
  return and(
    sql`${gameSourceRefs.missingStreak} >= ${MISSING_STREAK_MAX}`,
    isNotNull(gameSourceRefs.missingAt),
    sql`${gameSourceRefs.missingAt} > now() - make_interval(days => ${MISSING_RETRY_DAYS})`,
  )!;
}

/** 이번 회차에 스토어가 안 준 id 들의 연속 실패 수를 하나씩 올린다 */
export async function bumpMissingRefs(db: Db, source: StoreSource, externalIds: string[], now: Date): Promise<number> {
  if (externalIds.length === 0) return 0;
  const res = await db
    .update(gameSourceRefs)
    .set({ missingStreak: sql`${gameSourceRefs.missingStreak} + 1`, missingAt: now })
    .where(and(eq(gameSourceRefs.source, source), inArray(gameSourceRefs.externalId, externalIds)));
  return (res as { rowCount?: number }).rowCount ?? 0;
}

/**
 * 스토어가 준 id 들의 연속 실패 수를 0 으로 되돌린다.
 * **0 보다 큰 행만** 건드린다 — 아닌 행까지 쓰면 매 회차 수천 행을 뜻 없이 UPDATE 한다.
 */
export async function clearMissingRefs(db: Db, source: StoreSource, externalIds: string[]): Promise<number> {
  if (externalIds.length === 0) return 0;
  const res = await db
    .update(gameSourceRefs)
    .set({ missingStreak: 0, missingAt: null })
    .where(
      and(
        eq(gameSourceRefs.source, source),
        inArray(gameSourceRefs.externalId, externalIds),
        or(gt(gameSourceRefs.missingStreak, 0), isNotNull(gameSourceRefs.missingAt)),
      ),
    );
  return (res as { rowCount?: number }).rowCount ?? 0;
}

/** 이번 회차의 결과를 한 번에 반영한다. 왕복 둘이면 충분하다(Neon 왕복이 220ms 다) */
export async function applyMissingRefs(
  db: Db,
  source: StoreSource,
  found: string[],
  missing: string[],
  now: Date,
): Promise<{ bumped: number; cleared: number }> {
  const [bumped, cleared] = await Promise.all([
    bumpMissingRefs(db, source, missing, now),
    clearMissingRefs(db, source, found),
  ]);
  void lt;
  return { bumped, cleared };
}
