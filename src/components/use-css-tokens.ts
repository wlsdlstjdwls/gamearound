"use client";
// globals.css 토큰의 **계산된 값**을 읽는다. 테마가 바뀌면 다시 읽는다.
//
// 이게 왜 필요한가: recharts 는 색을 CSS 속성이 아니라 SVG 표현 속성(stroke="...", fill="...")으로
// 내보내고, 표현 속성 안에서는 var() 가 풀리지 않는다. 그래서 그래프만 색을 리터럴로 들고 있었고,
// 다크를 붙이는 순간 그 리터럴들이 전부 어두운 바탕에 묻히게 됐다.
// 값은 계속 globals.css 한 곳에만 두고, 그리는 쪽이 읽어 가는 방향으로 뒤집는다.
//
// useState + useEffect 를 쓰지 않는 이유: 그 조합은 첫 렌더 뒤 한 번 더 그리게 만들고
// (effect 안의 setState), 테마를 바꿀 때마다 같은 일이 반복된다. 외부 저장소로 보면 구독 한 번으로 끝난다.
import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
/** 테마가 바뀔 때마다 오른다. 캐시가 낡았는지 판정하는 유일한 기준 */
let version = 0;
let cache: { version: number; key: string; value: Record<string, string> } | null = null;

/** 설정 화면이 테마를 바꿀 때 보내는 신호(components/theme-toggle) */
const THEME_CHANGE_EVENT = "gamearound:theme";

function invalidate() {
  version += 1;
  cache = null;
  for (const l of listeners) l();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  // 두 갈래를 다 듣는다: 사람이 고른 값(이벤트)과 기기 설정(미디어 쿼리)
  media.addEventListener("change", invalidate);
  window.addEventListener(THEME_CHANGE_EVENT, invalidate);
  return () => {
    listeners.delete(onChange);
    media.removeEventListener("change", invalidate);
    window.removeEventListener(THEME_CHANGE_EVENT, invalidate);
  };
}

/** 서버 렌더용 빈 값. 참조가 고정돼야 useSyncExternalStore 가 다시 그리지 않는다 */
const EMPTY: Record<string, string> = {};

function read(names: readonly string[]): Record<string, string> {
  const style = getComputedStyle(document.documentElement);
  const out: Record<string, string> = {};
  for (const n of names) out[n] = style.getPropertyValue(n).trim();
  return out;
}

/**
 * `useCssTokens(["--line", "--store-steam"])` 처럼 쓴다. 돌려주는 객체는 테마가 바뀌기 전까지
 * 같은 참조라 그리는 쪽의 memo 가 깨지지 않는다.
 *
 * 서버 렌더에서는 빈 객체다. 그래프는 어차피 컨테이너 폭을 재고 나서야 그려지므로(ResponsiveContainer)
 * 서버 한 판에 색이 없는 것은 화면에 드러나지 않는다.
 */
export function useCssTokens(names: readonly string[]): Record<string, string> {
  const key = names.join("|");
  return useSyncExternalStore(
    subscribe,
    () => {
      if (cache && cache.version === version && cache.key === key) return cache.value;
      const value = read(names);
      cache = { version, key, value };
      return value;
    },
    () => EMPTY,
  );
}
