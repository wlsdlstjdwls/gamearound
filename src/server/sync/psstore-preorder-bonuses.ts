// PlayStation 예약 특전 반영 — 한국 PS 예약 콘셉트의 기본 상품 소개를 다시 읽어 특전 목록을 preorder 표에 담는다.
//
// 무엇을 쓸지 정하고 쓰는 고리는 Xbox 판과 같아서 sync/store-preorder 에 있다(규칙은 그 파일 머리 주석).
// 이 파일은 PS 만의 두 가지만 맡는다:
// - 대상 열쇠는 콘셉트 번호다. PS4, PS5 줄이 한 콘셉트를 나눠 쓰므로 둘 다 보고 콘셉트당 글 하나로 모은다.
//   외부 ID 가 콘셉트 번호가 아닌 줄(psprices 병합 잔재의 "psprices:…")은 페이지가 없어 뺀다.
// - 묶음 질의가 없어 콘셉트 페이지를 한 건씩 받는다(adapters/psstore 의 fetchPsstoreDescription). 끊긴 연결은 한 번 다시 묻고,
//   한 건이 실패해도 나머지는 계속 간다.
import { fetchPsstoreDescription, psstoreAdapter } from "@/server/adapters/psstore";
import { parsePsstorePreorderBonus, PSSTORE_PREORDER_PARSE_VERSION } from "@/server/adapters/psstore/preorder";
import { xboxBonusRows } from "@/server/adapters/xbox-preorder";
import { PREORDER_SOURCE } from "@/lib/preorder/sources";
import { sleep } from "@/lib/async";
import { PSSTORE_PREORDER_FAIL_STREAK_MAX, PSSTORE_PREORDER_MAX_ROWS, PSSTORE_PREORDER_RETRY_DELAYS_MS } from "./constants";
import { fetchWithRetry } from "./retry";
import { loadStoreTargets, runStorePreorder, type StorePreorderRunResult, type StorePreorderTarget, type StoreReading } from "./store-preorder";

const SOURCE = PREORDER_SOURCE.psstoreKr;
/** 콘셉트 번호는 숫자뿐이다(adapters/psstore 의 PSSTORE_PRODUCT_ID 주석) */
const CONCEPT_ID = /^\d+$/;

export type PsstorePreorderRunResult = StorePreorderRunResult;

/**
 * 콘셉트 페이지를 한 건씩 받아 읽는다. 페이지에 소개 캐시가 없으면 "모름" 이라 결과에 넣지 않는다.
 * 연달아 실패하면(PSSTORE_PREORDER_FAIL_STREAK_MAX) 남은 건은 받지 않는다 — 못 받은 건도 "모름" 이라 지워지지 않는다.
 */
async function readPages(targets: StorePreorderTarget[], fail: (label: string, e: unknown) => void): Promise<Map<string, StoreReading>> {
  const out = new Map<string, StoreReading>();
  let streak = 0;
  for (const [i, target] of targets.entries()) {
    if (streak >= PSSTORE_PREORDER_FAIL_STREAK_MAX) break;
    if (i > 0) await sleep(psstoreAdapter.minIntervalMs);
    try {
      const page = await fetchWithRetry(() => fetchPsstoreDescription(target.productId), PSSTORE_PREORDER_RETRY_DELAYS_MS);
      streak = 0;
      if (!page) continue;
      const parsed = parsePsstorePreorderBonus(page.description);
      out.set(target.productId, { title: page.title ?? target.productId, rows: parsed ? xboxBonusRows(parsed) : [] });
    } catch (e) {
      streak++;
      fail(`fetch ${target.productId}`, e);
    }
  }
  return out;
}

/**
 * 한 회차. dryRun 이면 DB 를 읽기만 하고 할 일을 돌려준다(운영 DB 에서 미리 보기용).
 * only 는 콘셉트 번호로 대상을 좁힌다(미리 보기, 손 점검용). 좁혔을 때는 출시 정리를 하지 않는다.
 */
export async function runPsstorePreorderBonuses(opts: { dryRun?: boolean; only?: readonly string[] } = {}): Promise<PsstorePreorderRunResult> {
  return runStorePreorder({
    source: SOURCE,
    parseVersion: PSSTORE_PREORDER_PARSE_VERSION,
    maxRows: PSSTORE_PREORDER_MAX_ROWS,
    loadTargets: (today, only) => loadStoreTargets(today, { platforms: ["ps5", "ps4"], productKey: (id) => (CONCEPT_ID.test(id) ? id : null), only }),
    read: readPages,
    dryRun: opts.dryRun,
    only: opts.only,
  });
}
