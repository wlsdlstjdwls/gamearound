// 인증용 레이트리밋 + 요청 메타(IP/UA). Redis 미설정(로컬)이면 경고만 남기고 통과(fail-open).
import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { rateLimit } from "@/server/redis";

export type RateLimitRule = { limit: number; windowSec: number };

/** 허용되면 true. Redis 오류/미설정 시 true(로그인 자체가 막히면 안 되므로) + console.warn */
export async function checkRateLimit(key: string, rule: RateLimitRule): Promise<boolean> {
  try {
    return await rateLimit(`rl:auth:${key}`, rule.limit, rule.windowSec);
  } catch (e) {
    console.warn("[auth/rate-limit] Redis 사용 불가, 제한 없이 통과:", e instanceof Error ? e.message : e);
    return true;
  }
}

/** 이메일 등 식별자를 키에 그대로 넣지 않고 해시로 (Redis 키에 개인정보 노출 방지) */
export function hashKeyPart(v: string): string {
  return createHash("sha256").update(v).digest("hex").slice(0, 32);
}

export async function getRequestMeta(): Promise<{ ip: string; userAgent: string | null }> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  const ip = (fwd ? fwd.split(",")[0] : h.get("x-real-ip"))?.trim() || "unknown";
  return { ip, userAgent: h.get("user-agent") };
}
