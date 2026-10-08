"use client";
// 선택 카드 — 온보딩에서 답을 고르는 칸. 한 화면에 질문 하나이므로 이 카드가 그 화면의 주인공이다.
//
// 네이티브 input 을 sr-only 로 깔고 label 로 감싼다(Checkbox 와 같은 방식):
// 키보드 이동(라디오는 화살표, 체크박스는 Tab), 폼 제출, 낭독기 읽기가 공짜로 따라온다.
// div + onClick 으로 만들면 저 셋을 전부 손으로 다시 짜야 하고, 라디오의 화살표 이동은 못 흉내 낸다.
//
// 제어/비제어 둘 다 받는다. 고른 개수에 상한이 있는 화면(장르)은 제어가 필요하고,
// 상한이 없는 화면은 비제어가 코드가 짧다 — 한쪽으로 통일하지 않은 이유가 그것이다.
//
// 카드 전체가 터치 타깃이다 — 규약 §6 의 44px 을 여유 있게 넘긴다(최소 높이 104px).
import { useId, type ChangeEvent, type MouseEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { CheckIcon } from "@/components/ui/icons";

export type ChoiceCardProps = {
  /** 여럿 고르면 checkbox, 하나만 고르면 radio. 라디오는 같은 name 을 공유해야 화살표 이동이 묶인다 */
  multiple?: boolean;
  name: string;
  value: string;
  label: ReactNode;
  /** 카드 안 둘째 줄. 고르는 기준이 이름만으로 모호할 때만 채운다 */
  note?: ReactNode;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  /**
   * 카드 전체를 누른 순간. 잠긴(disabled) 카드도 label 의 클릭은 온다 — 상한에 걸린 카드를 눌렀을 때
   * "왜 안 눌리지" 를 알려 주는 자리가 이것이다(온보딩 장르).
   */
  onClick?: (e: MouseEvent<HTMLLabelElement>) => void;
  className?: string;
};

export function ChoiceCard({ multiple = false, name, value, label, note, defaultChecked, checked, onChange, disabled, onClick, className }: ChoiceCardProps) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      onClick={onClick}
      className={cn(
        "group/choice press tap relative flex min-h-[104px] cursor-pointer flex-col justify-center gap-1 rounded-[var(--radius-panel)] p-4",
        "bg-surface-2 shadow-hair transition-[background-color,box-shadow,opacity] duration-base ease-standard",
        // 고른 카드는 **면이 바뀌고 링이 생긴다**. 테두리(border)로 하지 않는 이유는 1px 이 생기면서
        // 안쪽 글자가 밀려 카드가 미세하게 들썩이기 때문이다 — 그림자는 자리를 안 먹는다
        "has-[:checked]:bg-acc-soft has-[:checked]:shadow-[0_0_0_2px_var(--acc)]",
        "has-[:focus-visible]:shadow-[0_0_0_2px_var(--acc),0_0_0_5px_var(--acc-glow)]",
        // 상한에 걸려 잠긴 카드. pointer-events 를 끄지 않는 이유는 아래 input 의 disabled 가
        // 이미 클릭과 키보드를 막기 때문이다 — 끄면 낭독기가 카드를 통째로 건너뛴다
        disabled && "opacity-45",
        className,
      )}
    >
      <input
        id={id}
        type={multiple ? "checkbox" : "radio"}
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="peer sr-only"
      />
      {/* 우상단 동그라미 — 고르기 전에도 자리를 비워 두어야 "고를 수 있는 칸" 이라는 것이
          카드를 누르기 전에 읽힌다 */}
      <span
        aria-hidden
        className={cn(
          "absolute right-3.5 top-3.5 flex size-5 items-center justify-center rounded-full border transition-[background-color,border-color] duration-base",
          "border-line-strong text-transparent",
          "peer-checked:animate-pop peer-checked:border-acc peer-checked:bg-acc peer-checked:text-on-ink",
        )}
      >
        <CheckIcon size={12} />
      </span>
      <span className="text-[15px] font-bold leading-[1.35] tracking-[-0.02em] text-ink">{label}</span>
      {note && <span className="text-[12.5px] leading-[1.5] text-mut">{note}</span>}
    </label>
  );
}

/**
 * 카드 격자 — 좁은 화면 2열, 넓은 화면 3열.
 * 한 줄에 넷을 두지 않는 이유: 카드가 좁아지면 둘째 줄(note)이 두 줄로 접히고,
 * 그러면 같은 줄의 카드 높이가 서로 달라져 격자가 들쭉날쭉해진다.
 */
export function ChoiceGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-2 gap-2.5 sm:grid-cols-3", className)}>{children}</div>;
}
