// 켜고 끄는 스위치 — 웹푸시(push-toggle)와 개인화 적용(settings/personalization-toggle)이 같은 모양을 쓴다.
// 두 곳에 같은 마크업이 생겨 뽑았다(규약 §3, 2026-10-07).
//
// 켜짐은 브랜드 보라 면이다(2026-10-12, 사용자: "토글은 왜 검은색이냐"). 예전엔 "보라는 고른 칩의 색" 이라 먹색이었는데,
// 먹색 알약은 꺼진 단추나 글자 덩어리처럼 읽혀 켜졌다는 말이 약했다. 칩과 같은 색이어도 모양(알약+손잡이)이 달라 헷갈리지 않는다.
// 보이는 스위치는 26px 이지만 손가락이 닿는 넓이는 44px 이다 — 판을 키우면 알약이 세로로 늘어난다.
// 위아래로만 벌린다: 보통 줄 오른쪽 끝에 홀로 서 있어 겹칠 이웃이 없다(검색칸 지우기 버튼과 같은 수법)
import { cn } from "@/lib/cn";

/**
 * 스위치의 그림만 — 알약과 손잡이. 버튼이 아니라 링크로 켜고 끄는 자리(목록 필터의 "내 취향")가
 * 같은 그림을 쓰려고 뗐다. 누르는 상자는 부르는 쪽이 갖는다.
 */
export function SwitchTrack({ on, className }: { on: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("flex h-[26px] w-[46px] shrink-0 items-center rounded-full p-[3px] transition-colors duration-base", on ? "bg-acc" : "bg-line-strong", className)}
    >
      <span className={cn("h-5 w-5 rounded-full transition-transform duration-base ease-out-emph", on ? "translate-x-5 bg-on-ink" : "bg-surface")} />
    </span>
  );
}

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
        "press relative flex shrink-0 rounded-full after:absolute after:-inset-y-2.5 after:inset-x-0 after:content-[''] disabled:opacity-60",
        className,
      )}
    >
      <SwitchTrack on={on} />
    </button>
  );
}
