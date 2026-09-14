"use client";
// 현재 시각 훅 — 서버 렌더에서는 null, 클라이언트 마운트 후부터 값이 생긴다.
// 서버(RSC)는 캐시된 시점의 "지금"을 갖고 있어, 남은 기간을 서버에서 계산하면 굳은 값이 하이드레이션 불일치로 나온다.
// useSyncExternalStore + interval 단위로 내림한 값 → 같은 구간 안에서는 스냅샷이 동일해 재렌더가 반복되지 않는다.
import { useCallback, useSyncExternalStore } from "react";

const DEFAULT_INTERVAL_MS = 60_000;

export function useNow(intervalMs: number = DEFAULT_INTERVAL_MS): number | null {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const id = setInterval(onChange, intervalMs);
      return () => clearInterval(id);
    },
    [intervalMs],
  );
  const getSnapshot = useCallback(() => Math.floor(Date.now() / intervalMs) * intervalMs, [intervalMs]);
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
