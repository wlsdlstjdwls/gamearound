"use client";
// 브라우저가 스스로 아는 기기 정보를 **외부 저장소**로 읽는다(lib/hardware/detect 의 detectSpec).
//
// effect 안에서 setState 로 채우지 않는 이유는 useGuestDevice 와 같다 — 첫 그림 뒤에 한 번 더 그리게 되고,
// 그 방식은 "사람이 적은 값" 과 "우리가 채운 값" 이 한 상태에 섞여 어느 쪽이 이겼는지 알 수 없게 된다.
// 여기서는 감지 결과를 읽기만 하고, 폼이 사람 입력을 우선해 고른다(guest-device-form).
//
// 값이 바뀌는 일이 없어 구독은 빈 함수다. 서버 그림에서는 null 이고 그 뜻은 "아직 안 읽었다" 다 —
// 감지가 실패한 상태({ gpuName: null })와 가려야 안내 문구를 서버에서 잘못 띄우지 않는다.
import { useSyncExternalStore } from "react";
import { detectSpec, type DetectedSpec } from "@/lib/hardware/detect";

/** 한 번 읽은 값을 그대로 돌려준다 — 스냅샷이 매번 새 객체면 useSyncExternalStore 가 무한히 다시 그린다 */
let cached: DetectedSpec | null = null;

function snapshot(): DetectedSpec {
  cached ??= detectSpec();
  return cached;
}

const subscribe = (): (() => void) => () => {};

export function useDetectedSpec(): DetectedSpec | null {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}
