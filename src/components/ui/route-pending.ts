"use client";
// 화면 밖 메뉴에서 시작한 이동을 결과 자리(ui/nav-pending 의 PendingRegion)에 알리는 작은 저장소.
//
// 왜 필요한가(2026-11-20 사용자 "각 탭 누를 때마다 화면 깜빡이네" 뒤 남은 일). 라운지 게시판 셋은 깜빡임을 없애려고 묶음 하나의 loading 경계를 같이 쓴다 —
// 게시판을 옮겨도 앞 화면이 그대로 남는다. 그런데 하위 메뉴 띠(sub-nav)와 게시판 보조 칩(board-side-links)은 NavPendingScope 밖에 있어
// 누른 칩만 먼저 켜지고 목록은 새 게시판이 올 때까지 앞 게시판 글을 또렷하게 들고 있었다. 옛 목록이 새 게시판 결과처럼 읽힌다.
// 띠는 머리띠(레이아웃) 안이라 화면의 틀(context)로 잇지 못한다. 그래서 모듈 하나에 "지금 이동 중인 메뉴" 를 적고 PendingRegion 이 읽는다.
//
// 메뉴마다 제 useTransition 의 isPending 을 알린다(useReportRoutePending). 여럿이 동시에 알려도 하나라도 기다리면 흐리다.
// 알린 메뉴가 사라지면(화면을 떠나면) 그 몫을 지운다 — 남으면 다음 화면 결과가 영영 흐리다.
import { useEffect, useId, useSyncExternalStore } from "react";

const waiting = new Set<string>();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const snapshot = () => waiting.size > 0;
/** 서버 그림에는 기다리는 이동이 없다 */
const serverSnapshot = () => false;

/** 메뉴의 전환 상태를 알린다. pending 은 그 메뉴 useTransition 의 첫 값 */
export function useReportRoutePending(pending: boolean): void {
  const id = useId();
  useEffect(() => {
    if (!pending) return;
    waiting.add(id);
    emit();
    return () => {
      waiting.delete(id);
      emit();
    };
  }, [id, pending]);
}

/** 화면 밖 메뉴에서 시작한 이동을 기다리는 중인가 */
export function useRoutePending(): boolean {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
