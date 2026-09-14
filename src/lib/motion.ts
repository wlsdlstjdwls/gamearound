// 모션 헬퍼(순수). 등장 스태거는 CSS 변수로만 전달 — JS 타이머로 opacity를 뒤집지 않는다.
import type { CSSProperties } from "react";

/** globals.css :root --stagger-step 과 같은 값 (CSS는 var를 쓰므로 여기 숫자는 계산 전용) */
export const STAGGER_STEP_MS = 45;

/** 지연 상한 순번 — 카드 24개짜리 목록에서 끝 항목이 1초씩 기다리면 느린 화면이 된다 */
export const STAGGER_MAX_INDEX = 8;

/** i번째 요소의 등장 지연. `.reveal`(위로 떠오름) 또는 `.enter-item`(페이드) 과 함께 쓴다 */
export function stagger(i: number, stepMs: number = STAGGER_STEP_MS): CSSProperties {
  return { "--stagger": `${Math.min(i, STAGGER_MAX_INDEX) * stepMs}ms` } as CSSProperties;
}
