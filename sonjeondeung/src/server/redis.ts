// Upstash Redis — MVP 용도 3개만: 크롤러 락, 알림 중복키, 푸시 구독 레이트리밋 (§1)
import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;
export function getRedis(): Redis {
  if (!_redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) throw new Error("UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN 환경변수가 없습니다");
    _redis = new Redis({ url, token });
  }
  return _redis;
}

/** SET key NX EX — 획득 성공 시 true */
export async function acquireLock(key: string, ttlSec: number): Promise<boolean> {
  const res = await getRedis().set(key, "1", { nx: true, ex: ttlSec });
  return res === "OK";
}

export async function releaseLock(key: string): Promise<void> {
  await getRedis().del(key);
}

/** 중복 방지 키: 신규면 true (이미 있으면 false) */
export async function markOnce(key: string, ttlSec: number): Promise<boolean> {
  const res = await getRedis().set(key, "1", { nx: true, ex: ttlSec });
  return res === "OK";
}

/** 고정 윈도우 레이트리밋: 허용되면 true */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  const r = getRedis();
  const count = await r.incr(key);
  if (count === 1) await r.expire(key, windowSec);
  return count <= limit;
}
