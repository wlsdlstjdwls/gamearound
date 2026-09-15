// 플랫폼 묶음(PC | 콘솔)과 표시 순서. 순수 상수라 서버, 클라이언트 양쪽에서 쓴다.
//
// 왜 묶는가: 스토어가 여덟 개라 목록 필터에 한 줄로 늘어놓으면 기둥을 다 먹고, 고를 때도
// "PC 만 보고 싶다" 라는 흔한 질문에 답하려면 세 칩을 차례로 눌러야 한다. 먼저 큰 갈래를 고르고
// 그 안에서 스토어를 좁히면 한 번에 하나씩만 고르면 된다.
//
// 가르는 기준은 **기기**가 아니라 **살 수 있는 물건**이다. GOG, Epic, Steam 은 셋 다 PC 로 받는
// 같은 게임을 파는 곳이라 한 갈래에 둔다(GOG 는 DRM 없는 PC 스토어다).
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
 * 갈래별 플랫폼. 이 배열의 순서가 곧 화면 순서다(아래 PLATFORM_ORDER).
 * 새 스토어를 붙이면 여기에도 넣어야 필터, 배지에 나온다 — 빠뜨리면 정렬에서 -1 로 밀려 앞에 선다.
 */
export const FAMILY_PLATFORMS: Record<PlatformFamily, Platform[]> = {
  pc: ["steam", "epic", "gog"],
  console: ["ps5", "ps4", "xbox", "switch", "switch2"],
};

/**
 * 플랫폼 표시 순서. 가격 표, DLC 목록, 패치 기록, 목록 배지가 전부 이 순서를 써야 눈이 따라간다 —
 * 화면마다 다른 순서를 쓰면 같은 게임인데도 매번 다시 훑어야 한다.
 */
export const PLATFORM_ORDER: Platform[] = PLATFORM_FAMILIES.flatMap((f) => FAMILY_PLATFORMS[f]);

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
