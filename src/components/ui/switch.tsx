// 켜고 끄는 스위치 — 웹푸시(push-toggle)와 개인화 적용(settings/personalization-toggle)이 같은 모양을 쓴다.
// 두 곳에 같은 마크업이 생겨 뽑았다(규약 §3, 2026-10-07).
//
// 켜짐은 잉크 면이다 — 보라는 "고른 값" 의 색이라(chip) 켜짐까지 보라면 설정 화면이 고른 칩처럼 읽힌다.
// 보이는 스위치는 26px 이지만 손가락이 닿는 넓이는 44px 이다 — 판을 키우면 알약이 세로로 늘어난다.
// 위아래로만 벌린다: 보통 줄 오른쪽 끝에 홀로 서 있어 겹칠 이웃이 없다(검색칸 지우기 버튼과 같은 수법)
import { cn } from "@/lib/cn";

export function Switch({
  on,
  label,
  onToggle,
  disabled = false,
  className,
}: {
  on: boolean;
  /** 낭독기가 읽는 이름. 보이는 제목이 옆에 있어도 버튼 자체에 이름이 있어야 한다 */
  label: string;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "press relative flex h-[26px] w-[46px] shrink-0 items-center rounded-full p-[3px] transition-colors duration-base after:absolute after:-inset-y-2.5 after:inset-x-0 after:content-[''] disabled:opacity-60",
        on ? "bg-ink" : "bg-line-strong",
        className,
      )}
    >
      <span aria-hidden className={cn("h-5 w-5 rounded-full transition-transform duration-base ease-out-emph", on ? "translate-x-5 bg-on-ink" : "bg-surface")} />
    </button>
  );
}
