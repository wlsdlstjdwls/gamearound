"use client";
// 테마 고르기(설정 화면). 라이트 | 다크 | 시스템 세 칸.
//
// 왜 상태를 서버에 두지 않나: 테마는 사람이 아니라 **기기**의 성질이다. 같은 계정이 사무실 모니터에서는
// 라이트, 침대에서는 다크인 게 자연스럽다. 게다가 서버에 두면 루트 레이아웃이 쿠키를 읽어야 하고
// 그 순간 홈의 풀 라우트 캐시가 깨진다(lib/theme 주석).
//
// 고른 값은 즉시 html 의 data-theme 에 반영된다 — 되돌아가 확인할 필요 없이 이 화면에서 바로 바뀐다.
import { useCallback, useSyncExternalStore } from "react";
import { ChipButton } from "@/components/ui/chip";
import { Card } from "@/components/ui/page";
import { DEFAULT_THEME, isTheme, THEMES, THEME_LABEL, THEME_MESSAGES, THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

/** 이 탭 안에서 값이 바뀐 것을 알리는 신호. storage 이벤트는 **다른** 탭에만 가므로 자기 탭은 이걸 듣는다 */
const THEME_CHANGE_EVENT = "gamearound:theme";

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
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
    // 사생활 보호 모드처럼 접근 자체가 막힌 곳 — 시스템 설정을 따르는 기본값이 맞다
    return DEFAULT_THEME;
  }
}

/** 서버에는 저장값이 없다. 기본값으로 그려 두고 마운트 뒤 실제 값으로 맞춘다 */
function serverTheme(): Theme {
  return DEFAULT_THEME;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  // system 은 "아무 말도 하지 않음" 이다 — 속성을 지워야 CSS 의 prefers-color-scheme 블록이 다시 산다
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // 저장이 막힌 브라우저에서도 이번 방문 동안은 고른 대로 보여 준다
  }
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, serverTheme);
  const choose = useCallback((t: Theme) => applyTheme(t), []);

  return (
    <Card className="flex flex-col gap-3.5 p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-[14px] font-bold text-ink">{THEME_MESSAGES.heading}</h2>
        <p className="text-[12px] text-dim">{THEME_MESSAGES.note}</p>
      </div>
      {/* 라디오가 아니라 누름 상태(aria-pressed)로 둔다 — ChipButton 이 이미 그렇게 말하고 있고,
          같은 버튼에 role="radio" 를 얹으면 두 상태 속성이 서로 다른 말을 한다 */}
      <div role="group" aria-label={THEME_MESSAGES.heading} className="flex flex-wrap gap-1.5">
        {THEMES.map((t) => (
          <ChipButton key={t} active={theme === t} onClick={() => choose(t)}>
            {THEME_LABEL[t]}
          </ChipButton>
        ))}
      </div>
    </Card>
  );
}
