"use client";
// 이미 열린 프로그램 탭에 "이 줄을 골라라" 를 전하는 길(2026-11-04). ProgramLink 의 select 가 출발점이다.
//
// 처음 여는 탭은 주소의 ?select= 를 화면이 첫 값으로 읽으면 된다. 문제는 **이미 열린 탭**이다 — 껍데기는 탭을 다시 띄우지 않고
// 고르기만 하므로(입력값을 지키려고, program-shell 머리 주석) 주소가 화면에 닿지 않는다. 그래서 껍데기가 말을 보낸다:
//   - 그 탭이 iframe 이면 postMessage(admin-select) → 탭 안 껍데기가 받아 아래 문서 사건으로 다시 쏜다
//   - 처음 그린 화면(inline)이면 같은 문서라 곧바로 문서 사건으로 쏜다
// 화면은 useProgramSelect 하나로 둘 다 받는다.
import { useEffect, useRef } from "react";

const EVENT = "admin-program-select";

export function emitProgramSelect(key: string) {
  window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: key }));
}

/** 다른 화면에서 건너오며 줄을 골라 달라고 할 때 부른다 */
export function useProgramSelect(onSelect: (key: string) => void) {
  const ref = useRef(onSelect);
  useEffect(() => {
    ref.current = onSelect;
  });
  useEffect(() => {
    const on = (e: Event) => ref.current((e as CustomEvent<string>).detail);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
}
