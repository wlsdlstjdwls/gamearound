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
// 차림은 게임 키(.key, globals.css)다(2026-10-08 사용자: "선택하는 것도 그대로다, 게임하듯이"). 아래로 두께가 있어
// 누르면 내려앉고, 고르면 보라로 바뀌며 한 번 튄다. 회색 판에 체크만 붙던 예전 카드는 "설문지" 로 읽혔다.
// 질문마다 다른 장치는 두 자리로 받는다 — leading(이름 왼쪽 그림, 예: 기기 모양)과 footer(카드 아래, 예: 게이지).
//
// 카드 전체가 터치 타깃이다 — 규약 §6 의 44px 을 넘긴다(최소 높이 56px). 104px 이었다가 한 화면에 넣으려고 낮췄다.
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
  /** 이름 왼쪽 그림 칸 */
  leading?: ReactNode;
  /** 카드 아래 장치(게이지 등) */
  footer?: ReactNode;
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

export function ChoiceCard({ multiple = false, name, value, label, note, leading, footer, defaultChecked, checked, onChange, disabled, onClick, className }: ChoiceCardProps) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      onClick={onClick}
      className={cn(
        "group/choice key tap relative flex cursor-pointer flex-col justify-center gap-2 rounded-[14px] pl-3 pr-8",
        // 이름 한 줄뿐인 카드는 48px 로 — 장르 17칸이 360x640 에서 37px 넘쳤다. 손가락 범위(44px)는 그대로 넘긴다
        leading || note || footer ? "min-h-14 py-2.5" : "min-h-12 py-2",
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
      {/* 우상단 표시 — 고르기 전에도 자리를 비워 두어야 "고를 수 있는 칸" 이라는 것이 누르기 전에 읽힌다 */}
      <span
        aria-hidden
        className={cn(
          "absolute right-2.5 top-2.5 flex size-[18px] items-center justify-center rounded-full border transition-[background-color,border-color] duration-base",
          "border-line-strong text-transparent",
          "peer-checked:animate-pop peer-checked:border-acc peer-checked:bg-acc peer-checked:text-on-ink",
        )}
      >
        <CheckIcon size={11} />
      </span>
      {/* 그림은 이름 위에 둔다 — 3열 촘촘한 격자에서 옆에 두면 "Epic Games" 가 한 글자 폭으로 짓눌린다 */}
      <span className="flex min-w-0 flex-col items-start gap-1.5">
        {leading && (
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-surface-2 text-mut transition-[background-color,color] duration-base group-has-[:checked]/choice:bg-acc group-has-[:checked]/choice:text-on-ink"
          >
            {leading}
          </span>
        )}
        <span className="flex min-w-0 flex-col gap-0.5">
          {/* 전역 keep-all 이라 "멀티플레이어" 같은 긴 낱말은 좁은 칸에서 못 꺾인다 — 넘치면 아무 데서나 꺾는다 */}
          <span className="text-[14.5px] font-bold leading-[1.3] tracking-[-0.02em] text-ink [overflow-wrap:anywhere] group-has-[:checked]/choice:text-acc">
            {label}
          </span>
          {note && <span className="text-[12px] leading-[1.4] text-mut">{note}</span>}
        </span>
      </span>
      {footer}
    </label>
  );
}

/**
 * 카드 격자 — 둘째 줄(note)이 있는 선택지는 폭과 상관없이 2열. 3열이던 때 넷짜리 성향 질문이 3+1 로 갈라졌다(2026-10-08).
 * 더 촘촘히 두지 않는 이유: 카드가 좁아지면 둘째 줄(note)이 두 줄로 접히고,
 * 그러면 같은 줄의 카드 높이가 서로 달라져 격자가 들쭉날쭉해진다.
 *
 * dense: 둘째 줄이 없는 짧은 이름들(플랫폼, 장르, 구독). 그 걱정이 없으니 3열, 넓은 화면 4열로 촘촘히 놓는다 —
 * 장르 17칸을 한 화면에 넣는 방법이 이것뿐이다.
 * 세로 간격이 가로보다 넓은 이유: 카드 아래 두께(4px)가 다음 줄을 먹는다.
 */
export function ChoiceGrid({ children, className, dense = false }: { children: ReactNode; className?: string; dense?: boolean }) {
  return (
    <div className={cn("grid", dense ? "grid-cols-3 gap-x-1.5 gap-y-2.5 sm:grid-cols-4 sm:gap-x-2" : "grid-cols-2 gap-x-2 gap-y-3", className)}>
      {children}
    </div>
  );
}
