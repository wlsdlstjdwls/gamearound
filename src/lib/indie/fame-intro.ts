// 명예의 전당 1위 인트로(components/indie/fame-intro)의 설정 값 — 관리자 화면과 화면 컴포넌트가 같은 범위를 읽는다.
// 클라이언트 파일이 아닌 곳에 두는 이유: 서버 컴포넌트(명예의 전당 화면, 관리자 화면)도 이 값을 import 한다(AGENTS.md 6장의 푸터 사고).
// 검증 스키마도 여기 하나다 — 관리자 폼(클라이언트), 저장 액션, DB 값 읽기(services/settings)가 같은 규칙을 쓴다(AGENTS.md 2장).
import { z } from "zod";

/** off: 안 튼다 | once: 1위 게임마다 브라우저에 한 번 | always: 들어올 때마다 */
export const FAME_INTRO_MODES = ["off", "once", "always"] as const;
export type FameIntroMode = (typeof FAME_INTRO_MODES)[number];

export type FameIntroSettings = { mode: FameIntroMode; holdMs: number };

/**
 * 기본값. 규칙은 "처음 한 번만"(2026-10-28 사용자)이다.
 * 유지 시간 3.2초는 그림 서너 장(대표 그림으로 시작해 대표 그림으로 끝난다)이 한 장에 0.8초씩 지나가는 길이다 —
 * 1장만 0.8초 머물던 첫 판은 사용자가 "전체화면 유지 시간이 너무 짧다" 고 했다.
 */
export const FAME_INTRO_DEFAULTS: FameIntroSettings = { mode: "once", holdMs: 3200 };

/** 관리자가 고를 수 있는 유지 시간 범위(ms). 아래는 이름을 한 번 읽을 시간, 위는 순위를 보러 온 사람을 붙들지 않을 선 */
export const FAME_INTRO_HOLD_MIN_MS = 1500;
export const FAME_INTRO_HOLD_MAX_MS = 8000;

/** 전체 화면에서 돌릴 그림 수 상한(대표 그림 포함). 더 많으면 한 장이 너무 빨리 지나간다 */
export const FAME_INTRO_IMAGE_MAX = 4;

/** 관리자가 고르는 유지 시간의 눈금(ms). 0.1초 */
export const FAME_INTRO_HOLD_STEP_MS = 100;

/** 설정 값 검증. 범위 밖이거나 모양이 틀리면 읽는 쪽이 기본값으로 물러난다 */
export const fameIntroSettingsSchema = z.object({
  mode: z.enum(FAME_INTRO_MODES),
  holdMs: z.number().int().min(FAME_INTRO_HOLD_MIN_MS).max(FAME_INTRO_HOLD_MAX_MS),
});

/** DB 에서 읽은 값을 화면이 쓸 값으로. 없거나 틀리면 기본값 */
export function parseFameIntroSettings(raw: unknown): FameIntroSettings {
  const parsed = fameIntroSettingsSchema.safeParse(raw);
  return parsed.success ? parsed.data : FAME_INTRO_DEFAULTS;
}
