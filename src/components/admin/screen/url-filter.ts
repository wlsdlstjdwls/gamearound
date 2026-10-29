"use client";
// 주소(searchParams)로 거르는 조회조건 칸 하나 — 인디게임승인관리의 구분, 입점승인관리의 상태처럼 서버가 목록을 다시 읽어야 하는 칸.
// 고른 값은 누른 순간 칸에 선다(useOptimistic). 서버가 새 목록을 줄 때까지 pending 으로 결과 자리를 흐린다(AGENTS §6).
import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";

export function useUrlFilter(current: string, hrefOf: (value: string) => string) {
  const router = useRouter();
  const [value, setValue] = useOptimistic(current);
  const [pending, start] = useTransition();
  const set = (next: string) =>
    start(() => {
      setValue(next);
      router.push(hrefOf(next), { scroll: false });
    });
  return { value, set, pending };
}
