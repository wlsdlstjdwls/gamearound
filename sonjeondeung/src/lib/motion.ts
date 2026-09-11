// 모션 헬퍼(순수). 등장 스태거는 CSS 변수로만 전달 — JS 타이머로 opacity를 뒤집지 않는다.
import type { CSSProperties } from "react";

/** globals.css :root --stagger-step 과 같은 값 (CSS는 var를 쓰므로 여기 숫자는 계산 전용) */
export const STAGGER_STEP_MS = 45;

/** i번째 요소의 등장 지연. `.reveal` 클래스와 함께 사용 */
export function stagger(i: number, stepMs: number = STAGGER_STEP_MS): CSSProperties {
  return { "--stagger": `${i * stepMs}ms` } as CSSProperties;
}
