"use client";
// 테마 저장소 하나. 설정 화면의 세 칸(theme-toggle)과 머리띠의 단추(theme-switch)가 같은 값을 읽고 쓴다.
//
// 두 곳이 각자 localStorage 를 읽으면 한쪽을 눌렀을 때 다른 쪽 표시가 낡는다. 그래서 같은 탭 안의 변화는
// THEME_CHANGE_EVENT 로, 다른 탭의 변화는 storage 이벤트로 알리고 둘 다 이 구독 하나가 듣는다.
//
// 고른 값은 즉시 html 의 data-theme 에 반영된다 — 서버를 거치지 않는다(lib/theme 주석: 루트 레이아웃은 쿠키를 읽지 않는다).
import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_THEME, isTheme, THEME_CHANGE_EVENT, THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(DARK_QUERY);
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  // "시스템" 을 고른 사람은 기기 설정이 바뀌면 단추 그림도 따라 바뀌어야 한다
  media.addEventListener("change", onChange);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
    media.removeEventListener("change", onChange);
  };
}

/**
 * 저장된 값. 문자열을 그대로 돌려주므로 호출마다 같은 값이면 React 가 다시 그리지 않는다
 * (객체를 만들어 돌려주면 매번 새 참조라 무한 렌더가 된다).
 */
function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(saved) ? saved : DEFAULT_THEME;
  } catch {
    // 사생활 보호 모드처럼 접근 자체가 막힌 곳 — 기본값이 그대로 선다
    return DEFAULT_THEME;
  }
}

/** 지금 화면에 실제로 선 쪽. "시스템" 은 기기 설정으로 풀어 낸다 */
function readResolved(): "light" | "dark" {
  const t = readTheme();
  if (t !== "system") return t;
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

/** 서버에는 저장값이 없다. 기본값으로 그려 두고 하이드레이션 뒤 실제 값으로 맞춘다 */
function serverTheme(): Theme {
  return DEFAULT_THEME;
}

function serverResolved(): "light" | "dark" {
  return DEFAULT_THEME === "dark" ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  // system 도 값을 찍는다 — 속성이 없는 html 은 "기기 따라가기" 가 아니라 기본(라이트)이다(globals.css)
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // 저장이 막힌 브라우저에서도 이번 방문 동안은 고른 대로 보여 준다
  }
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, readTheme, serverTheme);
  const resolved = useSyncExternalStore(subscribe, readResolved, serverResolved);
  const setTheme = useCallback((t: Theme) => applyTheme(t), []);
  return { theme, resolved, setTheme };
}
