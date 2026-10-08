// 모션 헬퍼. 등장 스태거는 CSS 변수로만 전달 — JS 타이머로 opacity를 뒤집지 않는다.
// 표식(markPageEntered)만 DOM 을 건드리는데, 그것도 값 하나를 붙일 뿐 프레임을 그리지 않는다.
import type { CSSProperties } from "react";

/** globals.css :root --stagger-step 과 같은 값 (CSS는 var를 쓰므로 여기 숫자는 계산 전용) */
export const STAGGER_STEP_MS = 45;

/** 지연 상한 순번 — 카드 24개짜리 목록에서 끝 항목이 1초씩 기다리면 느린 화면이 된다 */
export const STAGGER_MAX_INDEX = 8;

/** i번째 요소의 등장 지연. `.reveal`(위로 떠오름) 또는 `.enter-item`(페이드) 과 함께 쓴다 */
export function stagger(i: number, stepMs: number = STAGGER_STEP_MS): CSSProperties {
  return { "--stagger": `${Math.min(i, STAGGER_MAX_INDEX) * stepMs}ms` } as CSSProperties;
}

/**
 * 퍼지는 물결(.soon-ripple) 둘의 시작 어긋남(ms). 둘이 같이 나가면 물결 사이가 끊겨 심장박동처럼 보인다.
 * 준비 중 그림(coming-soon)과 온보딩 알림 키가 같이 쓴다.
 */
export const RIPPLE_DELAYS_MS = [0, 1400] as const;

/** 등장이 끝난 셸에 붙는 표식. 이 값이 붙으면 같은 자리를 다시 그려도 등장하지 않는다(globals.css) */
export const ENTERED_ATTR = "data-entered";

/** 등장 애니메이션을 관장하는 셸(components/ui/page 의 `Page`) */
const PAGE_ENTER_SELECTOR = ".page-enter";

/**
 * 이 화면의 등장을 "끝난 것" 으로 표시한다.
 *
 * 왜 필요한가: CSS 등장은 요소가 **새로 만들어질 때** 다시 돈다. 목록에 다음 장을 이어 붙이는 동안
 * React 가 같은 자리를 다시 그리는 일이 있는데, 그때 이미 보고 있던 카드까지 전부 다시 페이드해
 * 목록이 통째로 깜빡였다. 등장은 도착했을 때 한 번이면 된다 — 표식 뒤의 재렌더는 조용히 지나간다.
 * 그 뒤에 새로 붙는 카드는 `.enter-item` 이 아니라 `.enter-late` 로 등장한다.
 */
export function markPageEntered(node: Element | null): void {
  node?.closest(PAGE_ENTER_SELECTOR)?.setAttribute(ENTERED_ATTR, "");
}
