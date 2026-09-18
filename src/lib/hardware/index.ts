// 부품 사전 조회와 사양 문구 → 후보 추출. 설계 문서 §2, §3.
//
// **사전을 DB 테이블이 아니라 코드에 두는 이유**(설계 §3 은 gpu_models 표를 그렸다):
// 이 표는 사람이 손으로 고치는 참조 자료이고 관리자 화면 계획도 없다. 표로 두면 마이그레이션,
// 시드, 그리고 "코드의 매칭 규칙과 DB 의 이름이 어긋나는" 표류가 생긴다. 코드에 두면 한 곳이다.
// 대신 SQL 이 티어로 거를 수 있어야 하므로(3단계 "내 기기로 돌아가는 게임만" 필터)
// 매칭 결과의 **티어 값을 후보 행에 박아 둔다** — 사전이 바뀌면 재매칭이 그 값을 갈아 준다.
import { CPU_NON_MODEL_HINTS, CPU_TIERS } from "./cpu-tiers";
import { GPU_NON_MODEL_HINTS, GPU_TIERS } from "./gpu-tiers";
import { extractVramMb, normalizeModelKey, splitCandidates, stripSpecNoise } from "./normalize";

export { extractVramMb, normalizeModelKey, splitCandidates, stripSpecNoise } from "./normalize";
export { CPU_TIERS } from "./cpu-tiers";
export * from "./verdict";
export { GPU_TIERS } from "./gpu-tiers";

export type PartKind = "cpu" | "gpu";

/**
 * 매칭 규칙의 판(版). 후보 행에 함께 저장한다 — 사전이나 규칙을 고치면 이 값을 올리고,
 * 낡은 판으로 매칭된 행만 다시 돌린다(사양 원문을 남겨 둔 것과 같은 발상이다).
 */
export const PART_MATCH_VERSION = 1;

export interface HardwareModel {
  /** 사전 열쇠(정규화된 이름). 후보 행에 그대로 저장돼 나중에 어느 모델로 봤는지 되짚는다 */
  key: string;
  /** 화면과 로그에 쓸 표기. 표에 적어 둔 이름 그대로다 */
  name: string;
  tier: number;
}

/** 티어표를 열쇠 지도로 편다. 모듈이 한 번 읽힐 때만 돈다 */
function buildIndex(tiers: Record<number, string[]>): Map<string, HardwareModel> {
  const out = new Map<string, HardwareModel>();
  for (const [tier, names] of Object.entries(tiers)) {
    for (const name of names) {
      const key = normalizeModelKey(name);
      // 같은 열쇠가 두 티어에 있으면 **낮은 쪽**을 남긴다. 표를 잘못 적었을 때 후하게 봐주는 쪽으로
      // 기울면 못 돌아가는 게임을 "돌아간다" 고 말하게 된다 — 반대 방향의 실수가 덜 나쁘다
      const prev = out.get(key);
      if (!prev || Number(tier) < prev.tier) out.set(key, { key, name, tier: Number(tier) });
    }
  }
  return out;
}

const GPU_INDEX = buildIndex(GPU_TIERS);
const CPU_INDEX = buildIndex(CPU_TIERS);

const indexOf = (kind: PartKind) => (kind === "gpu" ? GPU_INDEX : CPU_INDEX);
const hintsOf = (kind: PartKind) => (kind === "gpu" ? GPU_NON_MODEL_HINTS : CPU_NON_MODEL_HINTS);

/**
 * 후보 문구 하나 → 사전의 모델. 정확히 일치하는 열쇠가 없으면 **가장 긴 부분 일치**를 쓴다.
 *
 * 부분 일치가 필요한 이유: 실측 문구는 모델 이름에 온갖 것을 붙여 온다 —
 * "GeForce GTX 1060 3 GB", "GTX 1060 (6GB)", "RTX 2060 SUPER 8 GB".
 * 가장 긴 것을 고르는 이유: `gtx1060` 과 `gtx1060 3gb` 가 둘 다 걸릴 때 짧은 쪽을 집으면
 * "1060 3GB" 와 "1060 6GB" 처럼 티어가 다른 변종을 구분하지 못한다.
 *
 * 열쇠가 숫자만 다른 모델을 잘못 집지 않게 **경계를 본다**: 사전 열쇠 뒤에 숫자가 이어지면
 * 다른 모델이다(`rx580` 은 `rx5800` 에 걸리면 안 된다).
 */
export function findModel(kind: PartKind, candidate: string): HardwareModel | null {
  // 꼬리표(용량, 동작 속도)를 단 이름으로 먼저 찾는다 — "GTX 1060 3GB" 는 사전에 따로 있다.
  // 못 찾으면 꼬리표를 떼고 다시 본다(normalize 의 stripSpecNoise 주석)
  return lookup(kind, normalizeModelKey(candidate)) ?? lookup(kind, normalizeModelKey(stripSpecNoise(candidate)));
}

function lookup(kind: PartKind, key: string): HardwareModel | null {
  if (!key) return null;
  const index = indexOf(kind);
  const exact = index.get(key);
  if (exact) return exact;

  let best: HardwareModel | null = null;
  for (const [modelKey, model] of index) {
    const at = key.indexOf(modelKey);
    if (at === -1) continue;
    // 열쇠 바로 뒤에 숫자가 오면 다른 모델의 앞부분을 집은 것이다(`rx580` 이 `rx5800` 에 걸리면 안 된다)
    const after = key[at + modelKey.length];
    if (after !== undefined && after >= "0" && after <= "9") continue;
    if (!best || modelKey.length > best.key.length) best = model;
  }
  return best;
}

/**
 * 이 문구가 애초에 **어느 모델인지 말하려던** 것인가. 아니면 우리 사전의 구멍이 아니다.
 *
 * 모델 번호(세 자리 이상)를 요구하는 이유(2026-09-18 실측): 미매칭 1위가 `i5` 33회, `i3` 16회였다.
 * "Intel Core i5" 는 2009년부터 지금까지 있고 그 사이 성능이 열 배 넘게 벌어졌다 —
 * 이건 우리가 못 알아본 부품이 아니라 스토어가 세대를 안 적은 것이다.
 * 둘을 같이 세면 화면이 "확인 못 한 부품" 을 사전 탓으로 돌리게 된다.
 */
export function looksLikeModel(kind: PartKind, candidate: string): boolean {
  const lower = candidate.toLowerCase();
  if (hintsOf(kind).some((h) => lower.includes(h)) && !/\d{3,4}/.test(lower)) return false;
  return /\d{3,}/.test(lower);
}

/**
 * 사전 전체 — 기기 등록 폼의 선택지다. 빠른 것부터 준다(사람은 자기 부품을 위쪽에서 찾는다).
 * 같은 티어 안에서는 이름순이라 목록이 실행마다 흔들리지 않는다.
 */
export function listModels(kind: PartKind): HardwareModel[] {
  return [...indexOf(kind).values()].sort((a, b) => b.tier - a.tier || a.name.localeCompare(b.name));
}

/** 열쇠 하나로 모델을 되찾는다. 저장된 기기가 어떤 부품인지 화면에 적을 때 쓴다 */
export function modelByKey(kind: PartKind, key: string | null): HardwareModel | null {
  return key ? indexOf(kind).get(key) ?? null : null;
}

/** 사양 문구에서 뽑아낸 후보 하나 */
export interface ExtractedPart {
  kind: PartKind;
  /** 스토어 문구 그대로. 화면은 이것을 보여 준다 — 우리가 알아본 이름으로 바꿔 적지 않는다 */
  rawText: string;
  /** 사전에서 찾은 모델. 못 찾으면 null 이고 그 항목은 판정에서 빠진다 */
  modelKey: string | null;
  tier: number | null;
  /** 이 후보에 딸려 온 비디오 메모리(MB). 요구 VRAM 이 아니라 그 카드의 사양이다 */
  vramMb: number | null;
  /** 첫 후보가 아니면 참. "A 또는 B" 에서 B 쪽이다 — 판정은 하나만 넘으면 충족이다 */
  isAlternative: boolean;
}

/**
 * 사양 한 칸(그래픽 또는 프로세서 문구) → 후보 목록.
 * 문구가 통째로 모델 이야기가 아니면 빈 배열이다("DirectX 10 capable hardware").
 */
export function extractParts(kind: PartKind, text: string | null): ExtractedPart[] {
  if (!text) return [];
  const out: ExtractedPart[] = [];
  for (const candidate of splitCandidates(text)) {
    const model = findModel(kind, candidate);
    // 사전에 없고 모델 같지도 않으면 후보로 세우지 않는다 — 판정에 "확인 못 한 부품" 이
    // 문구마다 하나씩 붙어 경고만 늘어난다
    if (!model && !looksLikeModel(kind, candidate)) continue;
    out.push({
      kind,
      rawText: candidate,
      modelKey: model?.key ?? null,
      tier: model?.tier ?? null,
      vramMb: kind === "gpu" ? extractVramMb(candidate) : null,
      isAlternative: out.length > 0,
    });
  }
  return out;
}
