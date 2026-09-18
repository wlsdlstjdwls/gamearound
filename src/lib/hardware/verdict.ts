// 판정 — 내 기기와 게임 사양을 견준다. 설계 문서 §6.
//
// **한 마디로 답하지 않는다.** 부위별로 보여 준다 — 하나만 못 미치면 그게 병목이고,
// 사용자가 고칠 수 있는 정보다. "불가" 한 마디보다 "RAM 만 8GB 모자랍니다" 가 백 배 쓸모 있다.
//
// **모르면 모른다고 한다.** 사전에 없는 부품이 나오면 점수를 지어내지 않는다.
// 그 항목은 판정에서 빼되 판정 전체에 "일부 확인 불가" 를 단다 — 조용히 통과시키는 것이 제일 나쁘다.
//
// 순수 함수만 둔다. 서버(상세 화면)와 브라우저(비회원 기기)가 같은 함수를 쓴다 —
// 판정 규칙이 두 벌이 되면 같은 기기가 화면마다 다른 답을 받는다.
import { findModel } from "./index";

/** 판정이 보는 부위. 화면의 줄 순서이기도 하다 */
export type PartSlot = "cpu" | "gpu" | "ram" | "storage";

export type PartStatus = "meets" | "below" | "unknown";

export type PartVerdict = {
  slot: PartSlot;
  status: PartStatus;
  /** 왜 모르는지. 화면이 "확인 못 한 부품" 과 "스토어가 안 적음" 을 가려 말한다 */
  reason?: "no-requirement" | "no-device" | "unknown-model";
};

export type OverallVerdict = "below_minimum" | "meets_minimum" | "meets_recommended" | "unknown";

export type Verdict = {
  overall: OverallVerdict;
  /** 최소 사양 기준의 부위별 결과 */
  parts: PartVerdict[];
  /** 한 부위라도 판정하지 못했나. 화면은 이때 결론에 단서를 붙인다 */
  hasUnknown: boolean;
};

/** 판정에 쓰는 기기 한 대. 부품은 티어가 아니라 **사전 열쇠**로 갖는다 — 사전이 좋아지면 판정도 같이 좋아진다 */
export type DeviceSpec = {
  cpuModelKey: string | null;
  gpuModelKey: string | null;
  ramMb: number | null;
  storageFreeMb: number | null;
};

/** 판정에 쓰는 사양 한 벌(한 OS, 한 등급) */
export type RequirementSpec = {
  /** 후보들의 티어. null 은 사전에서 못 찾은 후보다 */
  cpuTiers: Array<number | null>;
  gpuTiers: Array<number | null>;
  ramMb: number | null;
  storageMb: number | null;
};

/**
 * 후보 여럿이 요구하는 실제 문턱. **가장 낮은 후보**가 답이다 —
 * "GTX 1060 또는 RX 580" 은 둘 중 하나만 넘으면 되므로, 요구선은 둘 중 쉬운 쪽이다.
 *
 * 사전에서 못 찾은 후보(null)는 여기서 무시한다. 그 사실은 호출부가 따로 센다 —
 * 아는 후보가 하나라도 있으면 판정은 할 수 있고, 다만 "일부 확인 불가" 가 붙는다.
 */
export function requiredTier(tiers: Array<number | null>): number | null {
  const known = tiers.filter((t): t is number => t !== null);
  return known.length === 0 ? null : Math.min(...known);
}

/** 기기 부품의 티어. 사전에 없으면 null 이고 그 부위는 판정에서 빠진다 */
function deviceTier(kind: "cpu" | "gpu", modelKey: string | null): number | null {
  if (!modelKey) return null;
  return findModel(kind, modelKey)?.tier ?? null;
}

function compareTier(
  slot: PartSlot,
  deviceValue: number | null,
  requiredValue: number | null,
  deviceMissing: boolean,
  requirementListed: boolean,
): PartVerdict {
  if (requiredValue === null) {
    return { slot, status: "unknown", reason: requirementListed ? "unknown-model" : "no-requirement" };
  }
  if (deviceValue === null) return { slot, status: "unknown", reason: deviceMissing ? "no-device" : "unknown-model" };
  // 같은 티어는 충족으로 본다. 티어는 "비슷한 급" 이라는 뜻이라 한 칸 차이를 단정하지 않는다(gpu-tiers 주석)
  return { slot, status: deviceValue >= requiredValue ? "meets" : "below" };
}

function compareAmount(slot: PartSlot, deviceValue: number | null, requiredValue: number | null): PartVerdict {
  if (requiredValue === null) return { slot, status: "unknown", reason: "no-requirement" };
  if (deviceValue === null) return { slot, status: "unknown", reason: "no-device" };
  return { slot, status: deviceValue >= requiredValue ? "meets" : "below" };
}

/** 기기 한 대와 사양 한 벌을 견준다 */
export function judgeAgainst(device: DeviceSpec, spec: RequirementSpec): PartVerdict[] {
  return [
    compareTier("cpu", deviceTier("cpu", device.cpuModelKey), requiredTier(spec.cpuTiers), device.cpuModelKey === null, spec.cpuTiers.length > 0),
    compareTier("gpu", deviceTier("gpu", device.gpuModelKey), requiredTier(spec.gpuTiers), device.gpuModelKey === null, spec.gpuTiers.length > 0),
    compareAmount("ram", device.ramMb, spec.ramMb),
    compareAmount("storage", device.storageFreeMb, spec.storageMb),
  ];
}

/** 부위 결과들 → 이 등급을 통과했나. 아는 것이 하나도 없으면 null(판정 불가) */
function passes(parts: PartVerdict[]): boolean | null {
  if (parts.some((p) => p.status === "below")) return false;
  return parts.some((p) => p.status === "meets") ? true : null;
}

/**
 * 최소, 권장 두 벌을 한 번에 본다. 결론은 넷 중 하나다(설계 §6):
 * 최소 미만 / 최소 충족 / 권장 충족 / 판정 불가.
 *
 * 권장 사양이 없는 게임이 흔해서(표본 60건 중 11건) recommended 는 없어도 된다 —
 * 그때 최대 결론은 "최소 충족" 이다. 있지도 않은 기준을 넘었다고 말하지 않는다.
 */
export function judge(device: DeviceSpec, minimum: RequirementSpec | null, recommended: RequirementSpec | null): Verdict {
  const parts = minimum ? judgeAgainst(device, minimum) : recommended ? judgeAgainst(device, recommended) : [];
  const hasUnknown = parts.some((p) => p.status === "unknown");
  const minPass = minimum ? passes(parts) : null;

  if (minPass === false) return { overall: "below_minimum", parts, hasUnknown };
  if (minPass === null && !recommended) return { overall: "unknown", parts, hasUnknown };

  if (recommended) {
    const recParts = judgeAgainst(device, recommended);
    const recPass = passes(recParts);
    if (recPass === true) return { overall: "meets_recommended", parts, hasUnknown };
    // 권장에 못 미쳐도 최소를 넘었으면 최소 충족이다. 최소가 아예 없었다면 판정 불가로 남는다
    if (minPass === true) return { overall: "meets_minimum", parts, hasUnknown };
    if (recPass === false && minimum === null) return { overall: "below_minimum", parts, hasUnknown };
    return { overall: "unknown", parts, hasUnknown };
  }

  return { overall: minPass === true ? "meets_minimum" : "unknown", parts, hasUnknown };
}
