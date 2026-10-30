"use server";
// 검색 결과의 "이 게임 추가 요청"(services/search-misses). 로그인 없이도 받는다 — 찾는 게임이 없는 사람은 대개 아직 가입 전이다.
// 대신 IP 마다 한 시간 한도를 둔다(lib/search/miss 의 MISS_REQUEST_LIMIT).
import { errorMessage } from "@/lib/errors";
import { MISS_REQUEST_LIMIT } from "@/lib/search/miss";
import { SEARCH_MESSAGES as M } from "@/lib/search/messages";
import { getRequestMeta, hashKeyPart } from "@/server/auth/rate-limit";
import { rateLimit } from "@/server/redis";
import { requestMissingGame } from "@/server/services/search-misses";
import { getCurrentUser } from "@/server/services/users";

export type RequestMissingState = { ok: true } | { ok: false; error: string };

export async function requestMissingGameAction(q: string): Promise<RequestMissingState> {
  try {
    const { ip } = await getRequestMeta();
    // Redis 가 안 되면 한도 없이 받는다 — 요청 하나 더 받는 손해가 단추가 죽는 손해보다 작다
    const allowed = await rateLimit(`rl:search-req:${hashKeyPart(ip)}`, MISS_REQUEST_LIMIT.limit, MISS_REQUEST_LIMIT.windowSec).catch(() => true);
    if (!allowed) return { ok: false, error: M.requestLimited };
    const me = await getCurrentUser().catch(() => null);
    const ok = await requestMissingGame(String(q ?? ""), me?.id ?? null);
    return ok ? { ok: true } : { ok: false, error: M.requestInvalid };
  } catch (e) {
    console.error("[search] 추가 요청 실패:", errorMessage(e));
    return { ok: false, error: M.requestFailed };
  }
}
