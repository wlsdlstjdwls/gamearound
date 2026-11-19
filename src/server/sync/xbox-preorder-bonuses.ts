// Xbox 예약 특전 반영 — 한국 Xbox 예약 상품의 소개글을 다시 읽어 특전 목록을 preorder 표에 담는다.
//
// 닌텐도 뉴스(sync/preorder-bonuses)와 달리 상품 번호로 게임에 이미 묶여 있어 바로 공개하고, 회차마다 소개를 다시 읽는다.
// 무엇을 쓸지 정하고 쓰는 고리는 PlayStation 판과 같아서 sync/store-preorder 에 있다(규칙은 그 파일 머리 주석).
// 이 파일은 Xbox 만의 두 가지 — 대상 열쇠(대문자 상품 번호), 소개를 bigIds 묶음으로 받아 읽기 — 만 맡는다.
import { fetchXboxDescriptions, xboxAdapter } from "@/server/adapters/xbox";
import { parseXboxPreorderBonus, xboxBonusRows, XBOX_PREORDER_PARSE_VERSION, type XboxDescription } from "@/server/adapters/xbox-preorder";
import { PREORDER_SOURCE } from "@/lib/preorder/sources";
import { sleep } from "@/lib/async";
import { XBOX_PREORDER_BATCH, XBOX_PREORDER_MAX_ROWS } from "./constants";
import {
  loadStoreTargets,
  planStorePreorder,
  runStorePreorder,
  type ExistingStorePost,
  type StorePreorderAction,
  type StorePreorderRunResult,
  type StorePreorderTarget,
  type StoreReading,
} from "./store-preorder";

const SOURCE = PREORDER_SOURCE.xboxKr;

/** 지금 예약 중인 한국 Xbox 상품 하나. productId 는 대문자로 맞춘다(응답 열쇠와 같게) */
export type XboxPreorderTarget = StorePreorderTarget;
/** 이미 담은 Xbox 글 하나 */
export type ExistingXboxPost = ExistingStorePost;
export type XboxPreorderAction = StorePreorderAction;
export type XboxPreorderRunResult = StorePreorderRunResult;

/** 받은 소개 → 상품별 읽은 결과. 소개를 못 받은 상품은 결과에 없다("모름") */
function xboxReadings(targets: XboxPreorderTarget[], descriptions: ReadonlyMap<string, XboxDescription>): Map<string, StoreReading> {
  const out = new Map<string, StoreReading>();
  for (const target of targets) {
    const desc = descriptions.get(target.productId);
    if (!desc) continue;
    const parsed = parseXboxPreorderBonus(desc.description);
    out.set(target.productId, { title: desc.title ?? target.productId, rows: parsed ? xboxBonusRows(parsed) : [] });
  }
  return out;
}

/** 무엇을 쓸지 정한다(순수 함수). 규칙은 sync/store-preorder 의 planStorePreorder */
export function planXboxPreorder(input: {
  targets: XboxPreorderTarget[];
  preorderIds: ReadonlySet<string>;
  descriptions: ReadonlyMap<string, XboxDescription>;
  existing: ExistingXboxPost[];
  today: string;
}): XboxPreorderAction[] {
  return planStorePreorder({ ...input, readings: xboxReadings(input.targets, input.descriptions) });
}

/** 소개를 묶음으로 읽는다. 묶음 하나가 실패해도 나머지는 계속 간다(AGENTS §7) */
async function loadDescriptions(targets: XboxPreorderTarget[], fail: (label: string, e: unknown) => void): Promise<Map<string, XboxDescription>> {
  const out = new Map<string, XboxDescription>();
  for (let i = 0; i < targets.length; i += XBOX_PREORDER_BATCH) {
    const ids = targets.slice(i, i + XBOX_PREORDER_BATCH).map((t) => t.productId);
    try {
      for (const [id, d] of await fetchXboxDescriptions(ids)) out.set(id, d);
    } catch (e) {
      fail(`fetch ${ids[0]}+${ids.length - 1}`, e);
    }
    if (i + XBOX_PREORDER_BATCH < targets.length) await sleep(xboxAdapter.minIntervalMs);
  }
  return out;
}

/**
 * 한 회차. dryRun 이면 DB 를 읽기만 하고 할 일을 돌려준다(운영 DB 에서 미리 보기용).
 * only 는 상품 번호로 대상을 좁힌다(미리 보기, 손 점검용). 좁혔을 때는 출시 정리를 하지 않는다.
 */
export async function runXboxPreorderBonuses(opts: { dryRun?: boolean; only?: readonly string[] } = {}): Promise<XboxPreorderRunResult> {
  return runStorePreorder({
    source: SOURCE,
    parseVersion: XBOX_PREORDER_PARSE_VERSION,
    maxRows: XBOX_PREORDER_MAX_ROWS,
    loadTargets: (today, only) => loadStoreTargets(today, { platforms: ["xbox"], productKey: (id) => id.toUpperCase(), only }),
    read: async (targets, fail) => xboxReadings(targets, await loadDescriptions(targets, fail)),
    dryRun: opts.dryRun,
    only: opts.only?.map((id) => id.toUpperCase()),
  });
}
