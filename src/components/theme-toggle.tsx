"use client";
// 테마 고르기(설정 화면). 라이트 | 다크 | 시스템 세 칸. 라이트와 다크 사이를 한 번에 오가는 단추는 머리띠에 있다(theme-switch).
//
// 왜 상태를 서버에 두지 않나: 테마는 사람이 아니라 **기기**의 성질이다. 같은 계정이 사무실 모니터에서는
// 라이트, 침대에서는 다크인 게 자연스럽다. 게다가 서버에 두면 루트 레이아웃이 쿠키를 읽어야 하고
// 그 순간 홈의 풀 라우트 캐시가 깨진다(lib/theme 주석).
//
// 고른 값은 즉시 html 의 data-theme 에 반영된다 — 되돌아가 확인할 필요 없이 이 화면에서 바로 바뀐다.
import { ChipButton } from "@/components/ui/chip";
import { SectionHead } from "@/components/ui/page";
import { useTheme } from "@/components/use-theme";
import { THEMES, THEME_LABEL, THEME_MESSAGES } from "@/lib/theme";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <section className="flex flex-col gap-3.5">
      <SectionHead title={THEME_MESSAGES.heading} size="sub" />
      {/* 라디오가 아니라 누름 상태(aria-pressed)로 둔다 — ChipButton 이 이미 그렇게 말하고 있고,
          같은 버튼에 role="radio" 를 얹으면 두 상태 속성이 서로 다른 말을 한다 */}
      <div role="group" aria-label={THEME_MESSAGES.heading} className="flex flex-wrap gap-1.5 border-t border-line-strong pt-4">
        {THEMES.map((t) => (
          <ChipButton key={t} active={theme === t} onClick={() => setTheme(t)}>
            {THEME_LABEL[t]}
          </ChipButton>
        ))}
      </div>
      <p className="text-[12px] text-dim">{THEME_MESSAGES.note}</p>
    </section>
  );
}
