// 플랫폼 묶음(PC | 콘솔)과 표시 순서. 순수 상수라 서버, 클라이언트 양쪽에서 쓴다.
//
// 왜 묶는가: 스토어가 여덟 개라 목록 필터에 한 줄로 늘어놓으면 기둥을 다 먹고, 고를 때도
// "PC 만 보고 싶다" 라는 흔한 질문에 답하려면 세 칩을 차례로 눌러야 한다. 먼저 큰 갈래를 고르고
// 그 안에서 스토어를 좁히면 한 번에 하나씩만 고르면 된다.
//
// 가르는 기준은 **기기**가 아니라 **살 수 있는 물건**이다. Epic 과 Steam 은 둘 다 PC 로 받는
// 같은 게임을 파는 곳이라 한 갈래에 둔다.
import type { Platform } from "@/server/db/schema";

export const PLATFORM_FAMILIES = ["pc", "console"] as const;
export type PlatformFamily = (typeof PLATFORM_FAMILIES)[number];

export const PLATFORM_FAMILY_LABEL: Record<PlatformFamily, string> = {
  pc: "PC",
  console: "콘솔",
};

/** 갈래 안쪽 목록의 이름. PC 는 같은 기기에 스토어가 여럿이고, 콘솔은 기기 자체가 갈린다 */
export const PLATFORM_FAMILY_CHILD_LABEL: Record<PlatformFamily, string> = {
  pc: "스토어",
  console: "기기",
};

/**
 * 갈래별 플랫폼 전체. 이 배열의 순서가 곧 화면 순서다(아래 PLATFORM_ORDER).
 * 새 스토어를 붙이면 여기에도 넣어야 필터, 배지에 나온다 — 빠뜨리면 정렬에서 -1 로 밀려 앞에 선다.
 *
 * 여기는 "어느 갈래에 속하는가" 라는 사실만 적는다. 화면에 내보낼지는 HIDDEN_PLATFORMS 가 정한다 —
 * 숨긴 스토어를 이 표에서 빼 버리면 다시 켤 때 어느 갈래였는지가 사라진다.
 */
const ALL_FAMILY_PLATFORMS: Record<PlatformFamily, Platform[]> = {
  pc: ["steam", "epic"],
  console: ["ps5", "ps4", "xbox", "switch", "switch2"],
};

/**
 * 화면에서 숨기는 플랫폼. **데이터는 지우지 않는다** — 내보내기만 멈춘다.
 *
 * 지금은 비어 있다. 달러 전용이던 스토어 하나가 여기 있었는데 2026-09-18 에 코드에서 통째로 뺐다 —
 * 달러 전용이라 원화 가격 서비스에서 쓸 값이 아니었고, 데이터는 그 전에 이미 지웠다.
 * 배열 자체는 남겨 둔다: 스토어를 지우지 않고 화면에서만 내리는 일은 앞으로도 생긴다
 * (그 판단이 뒤집힌 적도 있다 — psstore 를 껐다가 같은 날 되살렸다).
 *
 * 화면 질의는 `server/db/visibility` 하나만 탄다.
 */
export const HIDDEN_PLATFORMS: Platform[] = []

const isHidden = (p: Platform): boolean => HIDDEN_PLATFORMS.includes(p);

/** 화면이 쓰는 갈래별 플랫폼 — 숨긴 것을 뺀 것. 필터 칩과 주소 값 검증이 전부 이걸 본다 */
export const FAMILY_PLATFORMS: Record<PlatformFamily, Platform[]> = {
  pc: ALL_FAMILY_PLATFORMS.pc.filter((p) => !isHidden(p)),
  console: ALL_FAMILY_PLATFORMS.console.filter((p) => !isHidden(p)),
};

/**
 * 플랫폼 표시 순서. 가격 표, DLC 목록, 패치 기록, 목록 배지가 전부 이 순서를 써야 눈이 따라간다 —
 * 화면마다 다른 순서를 쓰면 같은 게임인데도 매번 다시 훑어야 한다.
 */
export const PLATFORM_ORDER: Platform[] = PLATFORM_FAMILIES.flatMap((f) => FAMILY_PLATFORMS[f]);

/**
 * 숨긴 것까지 포함한 전체 순서. 화면은 PLATFORM_ORDER 를 쓰고 이건 두 자리에만 쓴다 —
 * (1) enum 의 모든 값이 갈래 하나에 들어갔는지 보는 불변식 검사,
 * (2) 정렬에서 "아는 플랫폼이지만 지금은 숨긴 것" 을 뒤로 보내는 자리(mappers 의 byPlatformOrder).
 */
export const ALL_PLATFORM_ORDER: Platform[] = PLATFORM_FAMILIES.flatMap((f) => ALL_FAMILY_PLATFORMS[f]);

const FAMILY_OF = new Map<Platform, PlatformFamily>(
  PLATFORM_FAMILIES.flatMap((f) => FAMILY_PLATFORMS[f].map((p) => [p, f] as const)),
);

/** 모르는 값(쿼리스트링에서 온 아무 문자열)도 그냥 undefined 로 떨어지도록 넓게 받는다 */
export function familyOf(platform: string | undefined): PlatformFamily | undefined {
  return platform === undefined ? undefined : FAMILY_OF.get(platform as Platform);
}

export function isPlatformFamily(v: string | undefined): v is PlatformFamily {
  return v !== undefined && (PLATFORM_FAMILIES as readonly string[]).includes(v);
}

/** 필터 값 하나(갈래 또는 스토어) → 실제로 걸러야 할 플랫폼 목록 */
export function platformsOf(value: Platform | PlatformFamily): Platform[] {
  return isPlatformFamily(value) ? FAMILY_PLATFORMS[value] : [value];
}

/** 필터에 고를 수 있는 값 전부 — 갈래 둘 + 스토어 여덟. 주소 값 검증과 정렬의 원천이다 */
export const PLATFORM_VALUE_ORDER: string[] = [...PLATFORM_FAMILIES, ...PLATFORM_ORDER];

export function isPlatformValue(v: string | undefined): v is Platform | PlatformFamily {
  return v !== undefined && PLATFORM_VALUE_ORDER.includes(v);
}

/**
 * 고른 값들 → 실제로 걸러야 할 플랫폼 목록(합집합).
 * 갈래와 그 안의 스토어를 같이 고른 경우(pc + steam)도 합집합이라 갈래가 이긴다 — 주소가 그렇게 말했으니
 * "PC 전부" 를 보여 주는 편이 맞다. 고르는 쪽(UI)이 갈래를 누르면 낱개를 지우므로 실제로는 거의 안 생긴다.
 */
export function expandPlatformValues(values: string[]): Platform[] {
  const out = new Set<Platform>();
  for (const v of values) {
    if (!isPlatformValue(v)) continue;
    for (const p of platformsOf(v)) out.add(p);
  }
  return PLATFORM_ORDER.filter((p) => out.has(p));
}
