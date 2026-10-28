// 게임 상세 조회 기록 — 수집 대상 선정(sync/store-targets)이 "사람들이 보는 게임" 을 먼저 갱신하는 데 쓴다.
//
// 무엇을 남기나: 게임 slug 와 마지막으로 본 시각뿐이다. 누가 봤는지(사용자, IP, 쿠키)는 남기지 않는다 —
// 이 값이 답하는 질문은 "최근에 누가 이 게임을 봤나" 가 아니라 "이 게임을 본 사람이 있나" 하나다.
// 그래서 조회수를 세지 않고 Redis 정렬 집합 하나에 slug 별 마지막 시각만 덮어쓴다(쓰기 1회).
//
// 2026-10-28 사용자 결정: 목록의 "요즘 많이 찾는 장르" 는 이름대로 실제 조회 수로 뽑는다(그전에는 장르별 게임 수였다).
// 그래서 하루 한 칸짜리 횟수 집합(GAME_VIEW_COUNT_PREFIX + 날짜)을 같은 파이프라인에 얹는다. 여전히 누가 봤는지는 남기지 않는다.
//
// DB 가 아니라 Redis 인 이유: 상세 화면이 열릴 때마다 쓰는 값이다. DB 에 쓰면 화면 요청마다
// Neon 왕복이 늘고(220ms, neon-roundtrip-cost), 이 값은 7일만 살면 되는 휘발성이다.
import { errorMessage } from "@/lib/errors";
import { getRedis } from "@/server/redis";

/** 정렬 집합 키. 멤버는 slug, 점수는 마지막 조회 시각(ms) */
export const GAME_VIEWS_KEY = "game-views";
/** "최근 조회" 의 기간(2026-10-06 사용자 결정). 이보다 오래된 기록은 읽을 때 지운다 */
export const GAME_VIEWS_WINDOW_DAYS = 7;
/**
 * 집합 크기 상한. 기록 주소는 로그인 없이 열려 있어서 아무 문자열이나 slug 로 보낼 수 있다.
 * 7일을 기다리지 않고도 집합이 커지지 않게 가장 오래된 것부터 잘라 낸다.
 * 5,000 은 한 회차 몫(최대 1,500건)의 몇 배라 진짜 조회가 밀려날 일이 없다.
 */
export const GAME_VIEWS_MAX = 5000;
/** slug 길이 상한. 우리 slug 는 제목 기반이라 이보다 길 일이 없다 */
export const GAME_VIEW_SLUG_MAX = 200;

const DAY_MS = 24 * 60 * 60 * 1000;

/** 하루 조회 횟수 집합의 키 앞부분. 뒤에 UTC 날짜(YYYY-MM-DD)가 붙고, 멤버는 slug, 점수는 그날 조회 횟수다 */
export const GAME_VIEW_COUNT_PREFIX = "game-view-count:";
/** 하루 칸의 수명. 읽는 기간(GAME_VIEWS_WINDOW_DAYS)보다 하루 길게 둬서 마지막 칸이 읽는 도중 사라지지 않게 한다 */
const GAME_VIEW_COUNT_TTL_SECONDS = (GAME_VIEWS_WINDOW_DAYS + 1) * 24 * 60 * 60;
/**
 * 하루 칸에서 읽어 올 상위 slug 수. 장르 순위는 많이 본 게임 몇백 개면 갈린다 —
 * 꼬리의 한두 번 본 게임까지 다 읽으면 Redis 응답과 DB 질의만 커진다.
 */
export const GAME_VIEW_COUNT_TOP = 300;

function viewCountKey(at: Date): string {
  return GAME_VIEW_COUNT_PREFIX + at.toISOString().slice(0, 10);
}

/** 조회 한 번을 남긴다. 실패해도 던지지 않는다 — 기록 때문에 화면이 깨지면 안 된다 */
export async function recordGameView(slug: string, now: Date = new Date()): Promise<void> {
  try {
    const redis = getRedis();
    const p = redis.pipeline();
    p.zadd(GAME_VIEWS_KEY, { score: now.getTime(), member: slug });
    // 점수가 낮은(오래된) 것부터 잘라 상한을 지킨다. -(MAX+1) 까지가 넘친 부분이다
    p.zremrangebyrank(GAME_VIEWS_KEY, 0, -(GAME_VIEWS_MAX + 1));
    // 장르 순위용 하루 횟수. 열쇠마다 수명을 다시 걸어 7일이 지나면 저절로 사라진다
    const countKey = viewCountKey(now);
    p.zincrby(countKey, 1, slug);
    p.expire(countKey, GAME_VIEW_COUNT_TTL_SECONDS);
    await p.exec();
  } catch (e) {
    console.warn(`[game-views] 기록 실패: ${errorMessage(e)}`);
  }
}

/**
 * 최근 GAME_VIEWS_WINDOW_DAYS 안에 조회된 slug 목록. 기간이 지난 기록은 여기서 지운다.
 * Redis 가 없거나 실패하면 빈 배열이다 — 수집은 조회 몫 없이 예전처럼 돈다.
 */
export async function recentlyViewedSlugs(now: Date = new Date()): Promise<string[]> {
  try {
    const redis = getRedis();
    const since = now.getTime() - GAME_VIEWS_WINDOW_DAYS * DAY_MS;
    await redis.zremrangebyscore(GAME_VIEWS_KEY, 0, since);
    return await redis.zrange<string[]>(GAME_VIEWS_KEY, since, "+inf", { byScore: true });
  } catch (e) {
    console.warn(`[game-views] 읽기 실패 — 조회 몫 없이 진행: ${errorMessage(e)}`);
    return [];
  }
}

/**
 * 최근 GAME_VIEWS_WINDOW_DAYS 동안 slug 별 조회 횟수 합. 날마다 상위 GAME_VIEW_COUNT_TOP 개만 읽는다.
 * Redis 가 없거나 실패하면 빈 Map 이다 — 장르 순위는 게임 수 순서로 물러난다.
 */
export async function viewCountsBySlug(now: Date = new Date()): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  try {
    const redis = getRedis();
    const p = redis.pipeline();
    for (let d = 0; d < GAME_VIEWS_WINDOW_DAYS; d++) {
      p.zrange(viewCountKey(new Date(now.getTime() - d * DAY_MS)), 0, GAME_VIEW_COUNT_TOP - 1, { rev: true, withScores: true });
    }
    const days = (await p.exec()) as (string | number)[][];
    for (const flat of days) {
      // withScores 응답은 [멤버, 점수, 멤버, 점수 ...] 로 납작하게 온다
      for (let i = 0; i + 1 < (flat ?? []).length; i += 2) {
        const slug = String(flat[i]);
        counts.set(slug, (counts.get(slug) ?? 0) + Number(flat[i + 1]));
      }
    }
  } catch (e) {
    console.warn(`[game-views] 횟수 읽기 실패 — 게임 수 순서로 물러남: ${errorMessage(e)}`);
  }
  return counts;
}
