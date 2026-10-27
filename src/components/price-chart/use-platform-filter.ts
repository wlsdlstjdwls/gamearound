"use client";
// 그래프의 플랫폼 고르기 — 어느 선을 그릴지와 칩이 켜졌는지.
//
// 두 자리에서 쓴다. 상세 본문은 플랫폼 카드와 고른 값을 나눠 쓴다(game-detail/platform-pick, 2026-10-27) — 카드를 고르면 그래프도
// 그 묶음으로 바뀌고, 칩을 누르면 카드 고리도 따라간다. 묶음 열쇠(steam, playstation)로 맞춘다 — PS5, PS4 선은 PlayStation 하나로 함께 켜진다.
// 나눠 쓸 값이 없는 전용 화면(/prices)은 제 상태로 기기 하나씩 고른다(예전 그대로).
import { useMemo, useState } from "react";
import { usePlatformPick } from "@/components/game-detail/platform-pick";
import { brandKeyOf } from "@/lib/platform";
import type { Platform } from "@/server/db/schema";
import type { PriceSeries } from "@/server/services/prices";

/** 플랫폼 칩의 "전체". 플랫폼 값과 겹치지 않는 문자열이어야 한다 */
export const ALL_PLATFORMS = "all";
export type PlatformChoice = Platform | typeof ALL_PLATFORMS;

export function usePlatformFilter(drawn: PriceSeries[]) {
  const [pick, setPick] = useState<PlatformChoice>(ALL_PLATFORMS);
  const shared = usePlatformPick();
  // 고른 플랫폼이 사라졌으면(게임이 바뀌거나 계열이 줄면) 조용히 전체로 돌아간다. 나눠 쓰는 값도 이 그래프에 없는 묶음이면 전체다
  const picked = pick !== ALL_PLATFORMS && drawn.some((s) => s.platform === pick) ? pick : ALL_PLATFORMS;
  const sharedBrand = shared?.brand && drawn.some((s) => brandKeyOf(s.platform) === shared.brand) ? shared.brand : null;

  const shown = useMemo(() => {
    if (shared) return sharedBrand === null ? drawn : drawn.filter((s) => brandKeyOf(s.platform) === sharedBrand);
    return picked === ALL_PLATFORMS ? drawn : drawn.filter((s) => s.platform === picked);
  }, [drawn, picked, shared, sharedBrand]);

  const isOn = (p: PlatformChoice): boolean => (shared ? (p === ALL_PLATFORMS ? sharedBrand === null : brandKeyOf(p) === sharedBrand) : picked === p);
  const choose = (p: PlatformChoice) => (shared ? shared.setBrand(p === ALL_PLATFORMS ? null : brandKeyOf(p)) : setPick(p));
  return { shown, isOn, choose };
}
