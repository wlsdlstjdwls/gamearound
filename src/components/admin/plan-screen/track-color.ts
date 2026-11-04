"use client";
// 파트 색(2026-11-04). 파트가 공통코드에서 늘어나므로(schema-plan 주석) 코드마다 색을 적지 않고 공통코드 순서대로 색판을 돈다.
// 색판: 브랜드 파랑, 보라, 청록, 분홍, 남색, 주황 — 초록, 누런색은 쓰지 않는다(no-green-badges, 10-27 화면 원칙). 일곱째부터 처음으로 돈다.
// 공통코드에 없는 파트(지운 코드를 아직 든 줄)는 회색이다.
import { useMemo } from "react";
import { useCodes } from "@/components/code-book";
import { PLAN_TRACK_LABEL } from "@/lib/admin/messages/plan";

/** 파트 공통코드 그룹 */
export const PLAN_TRACK_GROUP = "PLAN_TRACK";

const PALETTE = ["var(--acc)", "var(--plum)", "var(--info)", "var(--store-ps4)", "var(--store-switch)", "var(--warn)"] as const;
const UNKNOWN = "var(--dim)";

/** 쓸 수 있는 파트(정렬순서) — 코드북이 비면 처음 깔린 셋 */
export function useTrackOptions(): Array<{ value: string; label: string }> {
  const codes = useCodes();
  const list = codes.options(PLAN_TRACK_GROUP);
  return useMemo(() => (list.length > 0 ? list : Object.entries(PLAN_TRACK_LABEL).map(([value, label]) => ({ value, label }))), [list]);
}

/** 파트 코드 → 색 */
export function useTrackColor(): (track: string) => string {
  const options = useTrackOptions();
  return useMemo(() => {
    const map = new Map(options.map((o, i) => [o.value, PALETTE[i % PALETTE.length]!]));
    return (track: string) => map.get(track) ?? UNKNOWN;
  }, [options]);
}
