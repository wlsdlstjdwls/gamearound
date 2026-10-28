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

/** 관리자 화면 문구 */
export const FAME_INTRO_ADMIN_MESSAGES = {
  lead: "명예의 전당에 들어오면 이번 달 1위 판이 화면 전체로 펼쳐졌다가 제자리로 접혀 들어가요. 언제 보여 줄지와 화면 전체에 머무는 시간을 정해요.",
  sectionTitle: "명예의 전당 1위 인트로",
  modeLabel: "보여 주는 때",
  modeLabels: { off: "끄기", once: "처음 한 번만", always: "들어올 때마다" } satisfies Record<FameIntroMode, string>,
  modeHints: {
    off: "인트로 없이 바로 순위를 보여 줘요.",
    once: "1위 게임마다 한 번만 보여 줘요. 1위가 바뀌면 새 1위를 한 번 더 보여 줘요.",
    always: "명예의 전당에 들어올 때마다 보여 줘요. 시험할 때 써요.",
  } satisfies Record<FameIntroMode, string>,
  holdLabel: "화면 전체에 머무는 시간",
  holdHint: (min: number, max: number) => `${min}초~${max}초. 그림 여러 장이 이 시간 동안 넘어가요.`,
  seconds: (s: number) => `${s.toFixed(1)}초`,
  save: "저장",
  saving: "저장 중",
  saved: "저장했어요. 명예의 전당에 바로 반영돼요.",
  failed: "저장하지 못했어요. 잠시 뒤 다시 해 주세요.",
  preview: "명예의 전당에서 보기",
  newWindow: "(새 창에서 열림)",
} as const;
