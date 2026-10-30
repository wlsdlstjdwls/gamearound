// 사이트 방문 기록 쓰기, 읽기(2026-10-30). 모양과 열쇠는 lib/stats/visits.
//
// DB 가 아니라 Redis 인 이유는 게임 조회 기록(server/game-views)과 같다: 화면이 열릴 때마다 쓰는 값이라 Neon 왕복을 늘리면 안 되고,
// 필요한 것은 날짜별 합계뿐이다. 날짜 칸 셋(해시 둘, HyperLogLog 하나)에 더하기만 한다 — 쓰기 한 번이 파이프라인 한 번이다.
// 실패해도 던지지 않는다 — 기록 때문에 화면이 깨지면 안 된다.
import { errorMessage } from "@/lib/errors";
import { kstDateKey } from "@/lib/format";
import { SITE_SOURCES, VISIT_TTL_SECONDS, visitKeys, type SiteSource } from "@/lib/stats/visits";
import { getRedis } from "@/server/redis";

export async function recordVisit(input: { visitorId: string; landing: boolean; source: SiteSource | null }, now: Date = new Date()): Promise<void> {
  try {
    const day = kstDateKey(now);
    const p = getRedis().pipeline();
    p.hincrby(visitKeys.counts(day), "pv", 1);
    p.pfadd(visitKeys.visitors(day), input.visitorId);
    if (input.landing) {
      p.hincrby(visitKeys.counts(day), "sessions", 1);
      if (input.source) p.hincrby(visitKeys.sources(day), input.source, 1);
    }
    // 열쇠마다 수명을 다시 건다 — 날마다 새 칸이 생기고 오래된 칸은 저절로 사라진다
    for (const k of [visitKeys.counts(day), visitKeys.visitors(day), visitKeys.sources(day)]) p.expire(k, VISIT_TTL_SECONDS);
    await p.exec();
  } catch (e) {
    console.warn(`[visits] 기록 실패: ${errorMessage(e)}`);
  }
}

export interface VisitDay {
  day: string;
  pv: number;
  sessions: number;
  visitors: number;
  sources: Record<SiteSource, number>;
}

const num = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0) || 0);

/** 날짜별 방문. Redis 가 없거나 실패하면 null — 화면은 "방문 기록을 읽지 못했어요" 를 띄운다(0 으로 그리면 방문이 없던 날로 읽힌다) */
export async function readVisits(days: string[]): Promise<VisitDay[] | null> {
  if (days.length === 0) return [];
  try {
    const p = getRedis().pipeline();
    for (const d of days) {
      p.hgetall(visitKeys.counts(d));
      p.pfcount(visitKeys.visitors(d));
      p.hgetall(visitKeys.sources(d));
    }
    const out = (await p.exec()) as unknown[];
    return days.map((day, i) => {
      const counts = (out[i * 3] ?? {}) as Record<string, unknown>;
      const src = (out[i * 3 + 2] ?? {}) as Record<string, unknown>;
      return {
        day,
        pv: num(counts.pv),
        sessions: num(counts.sessions),
        visitors: num(out[i * 3 + 1]),
        sources: Object.fromEntries(SITE_SOURCES.map((s) => [s, num(src[s])])) as Record<SiteSource, number>,
      };
    });
  } catch (e) {
    console.warn(`[visits] 읽기 실패: ${errorMessage(e)}`);
    return null;
  }
}
