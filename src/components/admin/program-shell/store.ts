// 프로그램 껍데기의 공유 상태 — 지금 보이는 탭의 주소(기둥 메뉴가 그 칸을 켠다)와 화면마다 저장 안 한 값이 있는지.
// 기둥(admin-rail)과 껍데기(program-shell)는 레이아웃에서 형제라 props 로 잇지 못해 모듈 하나에 둔다(useSyncExternalStore).
// 탭 안 화면(iframe)은 다른 문서라 이 값을 못 본다 — 그쪽은 postMessage 로 바깥에 알린다(frame.ts).
import { useSyncExternalStore } from "react";

type State = { activePath: string | null; dirty: boolean };
let state: State = { activePath: null, dirty: false };
const listeners = new Set<() => void>();

function set(next: Partial<State>) {
  state = { ...state, ...next };
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function setActivePath(path: string | null) {
  if (state.activePath !== path) set({ activePath: path });
}

/** 탭 껍데기가 고른 탭의 주소. 껍데기가 없으면(좁은 화면, 탭 안 문서) null — 부르는 쪽이 지금 주소를 쓴다 */
export function useActivePath(): string | null {
  return useSyncExternalStore(subscribe, () => state.activePath, () => null);
}

/** 이 문서의 화면에 저장 안 한 값이 있나. 폼(pricing-form 등)이 바뀔 때마다 알린다 */
export function reportDirty(dirty: boolean) {
  if (state.dirty !== dirty) set({ dirty });
}

export function useDirty(): boolean {
  return useSyncExternalStore(subscribe, () => state.dirty, () => false);
}
