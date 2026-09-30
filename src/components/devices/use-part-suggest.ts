"use client";

// 부품 칸(프로세서, 그래픽)의 제안 목록 — 사전 거르기(lib/hardware/suggest)와 목록 화면(components/ui/suggest)을 잇는다.
// 설정, 온보딩, 상세 간이 폼 세 자리가 같은 규칙과 같은 줄 수를 쓰게 하려고 한곳에 둔다.
import { useMemo } from "react";
import { useSuggest } from "@/components/ui/suggest";
import { PART_SUGGEST_LIMIT } from "@/lib/hardware/constants";
import { suggestModels, type SuggestOption } from "@/lib/hardware/suggest";

export function usePartSuggest(id: string, options: readonly SuggestOption[], value: string, onValue: (next: string) => void) {
  const items = useMemo(() => suggestModels(options, value, PART_SUGGEST_LIMIT), [options, value]);
  return useSuggest({ id, value, onValue, items });
}
