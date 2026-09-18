"use client";
// 비회원의 기기 한 대 — 브라우저에만 있는 값이라 서버가 알 방법이 없다(설계 §4).
//
// 왜 컴포넌트 밖으로 뺐나: 이 값을 읽는 자리가 둘이 됐다. 상세의 "내 PC 로 돌아갈까요"(compat-section)와
// 목록의 "내 기기로 돌아가요" 칩(game-filters/rig-chip)이다. 읽는 규칙이 두 벌이 되면
// 같은 브라우저가 화면마다 다른 기기를 쓴다.
import { useMemo, useSyncExternalStore } from "react";
import { GUEST_DEVICE_STORAGE_KEY } from "@/lib/hardware/device-schemas";
import type { DeviceSpec } from "@/lib/hardware/verdict";
import type { OsFamily } from "@/server/db/schema";

/** 화면이 다루는 기기 한 대. 로그인 사용자는 서버가, 비회원은 브라우저가 준다 */
export type CompatDevice = DeviceSpec & { id: string; label: string; osFamily: OsFamily };

/** 이 탭에서 저장했을 때 알리는 신호. storage 이벤트는 **다른 탭**의 변경만 알려 준다 */
const GUEST_DEVICE_EVENT = "gamearound:device";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(GUEST_DEVICE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(GUEST_DEVICE_EVENT, onChange);
  };
}

function snapshot(): string | null {
  try {
    return window.localStorage.getItem(GUEST_DEVICE_STORAGE_KEY);
  } catch {
    // 사생활 보호 모드에서는 읽기 자체가 던진다. 기기가 없는 것과 같게 다룬다
    return null;
  }
}

/** 저장된 문자열 → 기기. 모양이 다르면 없는 것으로 본다 — 저장소의 값은 언제든 낡거나 깨져 있을 수 있다 */
export function parseGuestDevice(raw: string | null): CompatDevice | null {
  try {
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CompatDevice>;
    if (!parsed || typeof parsed.label !== "string" || typeof parsed.osFamily !== "string") return null;
    return {
      id: "guest",
      label: parsed.label,
      osFamily: parsed.osFamily as OsFamily,
      cpuModelKey: parsed.cpuModelKey ?? null,
      gpuModelKey: parsed.gpuModelKey ?? null,
      ramMb: parsed.ramMb ?? null,
      storageFreeMb: parsed.storageFreeMb ?? null,
    };
  } catch {
    return null;
  }
}

export function saveGuestDevice(device: CompatDevice): void {
  try {
    window.localStorage.setItem(GUEST_DEVICE_STORAGE_KEY, JSON.stringify(device));
    window.dispatchEvent(new Event(GUEST_DEVICE_EVENT));
  } catch {
    // 저장이 막혀도 이번 화면의 판정은 해 준다 — 다음 방문에 다시 적게 될 뿐이다
  }
}

/**
 * 브라우저 저장을 React 가 구독할 수 있는 **외부 저장소**로 다룬다.
 *
 * effect 안에서 setState 로 읽어 오지 않는 이유: 그 방식은 첫 그림 뒤에 한 번 더 그리게 만들고
 * (렌더 두 번), 다른 탭에서 기기를 바꿔도 이 화면이 모른다. useSyncExternalStore 는 서버 그림에서
 * null 을 쓰고 브라우저에서 실제 값을 쓰므로 수분화도 어긋나지 않는다.
 */
export function useGuestDevice(): CompatDevice | null {
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  return useMemo(() => parseGuestDevice(raw), [raw]);
}
