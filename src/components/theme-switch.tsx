"use client";
// 머리띠의 테마 단추 — 라이트와 다크를 한 번에 오간다(2026-10-26, 사용자: "테마 바꾸는 게 있어야 되는데 안 보인다").
// 전에는 테마를 설정 화면에서만 골랐고, 설정은 로그인한 사람에게만 열려 처음 온 사람은 바꿀 길이 없었다.
//
// 세 칸(시스템 포함)이 아니라 둘 사이를 뒤집는 이유: 머리띠에서 누르는 사람이 원하는 것은 "지금 것 말고 반대" 다.
// 시스템을 고른 사람이 누르면 지금 보이는 쪽의 반대를 못 박는다. 시스템으로 되돌리기는 설정 화면(theme-toggle)이 맡는다.
//
// 그림은 누르면 **될 쪽**을 보인다(라이트 화면에 달). 이름도 같은 방향으로 말한다 — 상태가 아니라 동작이다.
import { MoonIcon, SunIcon } from "@/components/ui/icons";
import { useTheme } from "@/components/use-theme";
import { cn } from "@/lib/cn";
import { THEME_MESSAGES } from "@/lib/theme";

export function ThemeSwitch({ withLabel = false, className }: { withLabel?: boolean; className?: string }) {
  const { resolved, setTheme } = useTheme();
  const toDark = resolved === "light";
  const label = toDark ? THEME_MESSAGES.toDark : THEME_MESSAGES.toLight;
  const icon = toDark ? <MoonIcon size={withLabel ? 17 : 19} /> : <SunIcon size={withLabel ? 17 : 19} />;

  if (withLabel) {
    // 좁은 화면의 메뉴 시트 한 줄. 줄 모양은 시트의 다른 줄(site-menu Row)과 같다
    return (
      <button
        type="button"
        onClick={() => setTheme(toDark ? "dark" : "light")}
        className={cn("flex min-h-[var(--touch-target)] items-center gap-2.5 rounded-lg px-3 text-left text-[14px] text-mut transition-colors hover:bg-surface-2 hover:text-ink", className)}
      >
        <span aria-hidden className="flex w-[17px] shrink-0 justify-center">
          {icon}
        </span>
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => setTheme(toDark ? "dark" : "light")}
      className={cn("press flex size-[var(--touch-target)] items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink sm:size-10", className)}
    >
      {icon}
    </button>
  );
}
