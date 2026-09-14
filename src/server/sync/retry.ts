// 어댑터 호출 재시도 — 일시적 실패(429·5xx·네트워크)만 다시 시도한다.
import { AdapterError } from "@/server/adapters/types";
import { sleep } from "@/lib/async";
import { RETRY_DELAYS_MS } from "./constants";

/** 재시도 3회(1s/4s/16s). retryable=false 인 AdapterError 는 즉시 실패 */
export async function fetchWithRetry<T>(fn: () => Promise<T>, delays: number[] = RETRY_DELAYS_MS): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (e instanceof AdapterError && !e.retryable) throw e;
      if (attempt < delays.length) await sleep(delays[attempt]);
    }
  }
  throw lastErr;
}
