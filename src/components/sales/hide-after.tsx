"use client";
// 정해진 시각이 지나면 안의 것을 지운다 — 세일 배너, 세일 필터 칩이 쓴다.
//
// 왜 서버만으로 안 되나: 홈과 세일 판정은 한 시간 캐시다(app/(public)/page 의 revalidate, services/sales).
// 세일이 끝난 뒤에도 그 한 시간 동안은 캐시된 화면이 "진행 중" 배너와 00:00:00 카운트다운을 내보낸다.
// 끝나는 시각은 이미 알고 있으니 브라우저가 그 시각에 스스로 내린다. 다음 캐시 갱신 때는 서버도 안 그린다.
// 서버 렌더와 첫 하이드레이션에서는 그대로 그린다(useNow 가 null) — 깜빡이며 사라졌다 나타나지 않게.
import type { ReactNode } from "react";
import { useNow } from "@/components/use-now";

const TICK_MS = 1000;

export function HideAfter({ untilIso, children }: { untilIso: string; children: ReactNode }) {
  const now = useNow(TICK_MS);
  if (now !== null && now >= new Date(untilIso).getTime()) return null;
  return <>{children}</>;
}
