// 게임 상세 조회 기록 — 수집 대상 선정(sync/store-targets)이 "사람들이 보는 게임" 을 먼저 갱신하는 데 쓴다.
//
// 무엇을 남기나: 게임 slug 와 마지막으로 본 시각뿐이다. 누가 봤는지(사용자, IP, 쿠키)는 남기지 않는다 —
// 이 값이 답하는 질문은 "최근에 누가 이 게임을 봤나" 가 아니라 "이 게임을 본 사람이 있나" 하나다.
// 그래서 조회수를 세지 않고 Redis 정렬 집합 하나에 slug 별 마지막 시각만 덮어쓴다(쓰기 1회).
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

/** 조회 한 번을 남긴다. 실패해도 던지지 않는다 — 기록 때문에 화면이 깨지면 안 된다 */
export async function recordGameView(slug: string, now: Date = new Date()): Promise<void> {
  try {
    const redis = getRedis();
    const p = redis.pipeline();
    p.zadd(GAME_VIEWS_KEY, { score: now.getTime(), member: slug });
    // 점수가 낮은(오래된) 것부터 잘라 상한을 지킨다. -(MAX+1) 까지가 넘친 부분이다
    p.zremrangebyrank(GAME_VIEWS_KEY, 0, -(GAME_VIEWS_MAX + 1));
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
