"use client";
// 값을 하나 고르는 드롭다운.
//
// 네이티브 <select> 를 쓰지 않는 이유: 펼친 목록은 운영체제가 그려서 색, 모서리, 간격에
// 우리 토큰이 하나도 안 닿는다. 기기마다 다른 회색 목록이 뜬다.
// 그래서 버튼 + listbox 를 직접 그린다. 대신 키보드와 스크린리더 동작을 손으로 맞춘다.
//
// 칩 대신 이걸 쓰는 자리: 값이 열 개를 넘어 칩으로 늘어놓으면 필터 기둥을 세로로 다 먹는 곳(장르, 정렬).
// 값이 서넛뿐인 자리(플랫폼, 켬끔 조건)는 칩이 더 빠르다 — 한 번에 다 보이고 한 번에 눌린다.
//
// **두 가지로 쓴다**(2026-09-22): 고르면 **주소가 바뀌는** 자리는 `Select`, 폼 안에서 **값만 고르는**
// 자리는 `FormSelect` 다. 둘은 겉모습과 키보드 동작을 통째로 나눠 쓴다(SelectCore).
// 가른 이유: 관리자 폼이 네이티브 select 를 쓰고 있었는데, 접힌 칸은 우리가 칠했어도 **펼친 목록만
// 운영체제 것**이라 같은 화면 안에서 이 드롭다운과 저 드롭다운이 서로 다른 물건으로 보였다(사용자 지적).
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

export interface SelectOption {
  /** 고유 키이자 현재 값 비교 기준 */
  value: string;
  label: string;
  /** 고르면 갈 주소 */
  href: string;
}

/** 값만 고르는 자리의 항목. 주소가 없다는 것 말고는 SelectOption 과 같다 */
export interface SelectChoice {
  value: string;
  label: string;
}

/** 열린 목록의 최대 높이(px). 이보다 길면 안에서 스크롤한다 — 화면 밖으로 자라지 않게 */
const LIST_MAX_H = 280;

/**
 * 칸 크기. 기본(sm)은 232px 기둥에 서는 조밀한 값이고, lg 는 손가락으로 고르는 자리다
 * (모바일 필터 시트). 시트에서 sm 을 그대로 쓰면 36px 짜리 칸이 화면 폭을 가득 채운 채 서서,
 * 폭은 큰데 높이만 낮은 눌리지 않을 것 같은 상자가 된다.
 */
const FIELD_SIZE = {
  sm: { field: "h-9 px-3 text-[12.5px]", label: "text-[11.5px]", option: "px-2.5 py-[7px] text-[12.5px]" },
  lg: { field: "h-11 px-3.5 text-[14px]", label: "text-[12px]", option: "px-3 py-2.5 text-[14px]" },
} as const;
export type SelectSize = keyof typeof FIELD_SIZE;

/**
 * 겉모습과 키보드 동작. 고른 **뒤에** 무엇을 하는지(주소 이동 / 값 저장)만 밖에서 정한다.
 */
function SelectCore({
  label,
  hideLabel = false,
  selectedValue,
  options,
  onPick,
  className,
  size = "sm",
  disabled = false,
}: {
  label: string;
  /** 칸 위 라벨을 이미 밖에서 그린 자리(폼의 Field)는 감춘다. 지우지는 않는다 — 낭독기가 읽을 이름이다 */
  hideLabel?: boolean;
  selectedValue: string;
  options: SelectChoice[];
  onPick: (value: string) => void;
  className?: string;
  size?: SelectSize;
  disabled?: boolean;
}) {
  const box = FIELD_SIZE[size];
  const id = useId();
  const [open, setOpen] = useState(false);
  const selectedIdx = Math.max(0, options.findIndex((o) => o.value === selectedValue));
  // 키보드로 훑는 중인 항목. 열 때는 현재 값에서 시작한다
  const [activeIdx, setActiveIdx] = useState(selectedIdx);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  // 바깥을 누르면 닫는다. click 이 아니라 mousedown, touchstart 로 듣는다 —
  // click 은 누른 곳과 뗀 곳이 다르면 안 오고, 터치에서는 300ms 늦게 온다
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [open]);

  // 열리면 훑는 자리를 보이는 곳으로 끌어온다. 장르처럼 스무 개가 넘으면 현재 값이 아래에 숨어 있다
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [open, activeIdx]);

  const choose = (i: number) => {
    const opt = options[i];
    setOpen(false);
    if (opt) onPick(opt.value);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    // 목록이 열려 있을 때의 Esc 는 목록만 닫는다. 위로 흘려보내면 시트(<dialog>)가 같이 닫힌다 —
    // 모바일 필터 시트 안에서 장르를 고르다 Esc 를 누르면 필터 전체가 사라졌다(2026-09-22 실측)
    if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        e.stopPropagation();
      }
      setOpen(false);
      return;
    }
    if (!open && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      setActiveIdx(selectedIdx);
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(activeIdx);
      return;
    }
    const move = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (move !== 0) {
      e.preventDefault();
      setActiveIdx((i) => Math.min(options.length - 1, Math.max(0, i + move)));
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      setActiveIdx(0);
    }
    if (e.key === "End") {
      e.preventDefault();
      setActiveIdx(options.length - 1);
    }
  };

  return (
    <div ref={rootRef} className={cn("relative flex flex-col gap-1.5", className)}>
      <span id={`${id}-label`} className={cn(box.label, "text-dim", hideLabel && "sr-only")}>
        {label}
      </span>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => {
          setActiveIdx(selectedIdx);
          setOpen((v) => !v);
        }}
        onKeyDown={onKeyDown}
        className={cn(
          "press tap flex w-full items-center gap-2 rounded-[var(--radius-sm)] border bg-surface text-left transition-colors duration-base",
          box.field,
          open ? "border-ink text-ink" : "border-line-strong text-mut hover:border-ink hover:text-ink",
          disabled && "cursor-not-allowed opacity-50 hover:border-line-strong hover:text-mut",
        )}
      >
        <span id={`${id}-value`} className="min-w-0 flex-1 truncate font-medium">
          {options[selectedIdx]?.label ?? ""}
        </span>
        {/* 화살표 글자 대신 그림 — 문구에 ↓ 를 쓰지 않는다는 규약을 지키면서 펼침을 표시한다 */}
        <svg aria-hidden viewBox="0 0 10 6" className={cn("w-2.5 shrink-0 transition-transform duration-base", open && "rotate-180")}>
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          aria-labelledby={`${id}-label`}
          tabIndex={-1}
          style={{ maxHeight: LIST_MAX_H }}
          className="animate-scale-in absolute left-0 right-0 top-full z-30 mt-1 origin-top overflow-y-auto rounded-[var(--radius-md)] border border-line-strong bg-surface p-1"
        >
          {options.map((o, i) => {
            const isSelected = o.value === selectedValue;
            return (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-active={i === activeIdx}
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => choose(i)}
                  className={cn(
                    "tap flex w-full items-center rounded-[var(--radius-inset)] text-left transition-colors duration-base",
                    box.option,
                    isSelected ? "font-semibold text-ink" : "text-mut",
                    i === activeIdx && "bg-surface-2 text-ink",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {isSelected && <span aria-hidden className="ml-2 size-1.5 shrink-0 rounded-full bg-acc" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** 고르면 그 값의 주소로 옮겨 가는 드롭다운(필터, 정렬) */
export function Select({
  label,
  value,
  options,
  className,
  scroll = true,
  size = "sm",
}: {
  label: string;
  value: string;
  options: SelectOption[];
  className?: string;
  size?: SelectSize;
  /** 고른 뒤 맨 위로 올릴지. 제자리에서 거르는 자리(목록 필터)는 false */
  scroll?: boolean;
}) {
  const router = useRouter();
  return (
    <SelectCore
      label={label}
      selectedValue={value}
      options={options}
      className={className}
      size={size}
      onPick={(v) => {
        const opt = options.find((o) => o.value === v);
        if (opt && opt.value !== value) router.push(opt.href, { scroll });
      }}
    />
  );
}

/**
 * 폼 안에서 값을 하나 고르는 칸.
 *
 * 고른 값은 **감춘 input** 에 담긴다 — 서버 액션은 FormData 로 값을 받으므로,
 * 생김새가 무엇이든 폼 안에는 name 을 가진 칸이 하나 있어야 한다.
 */
export function FormSelect({
  name,
  label,
  hideLabel,
  options,
  defaultValue,
  value,
  onChange,
  className,
  size = "sm",
  disabled,
}: {
  name: string;
  label: string;
  hideLabel?: boolean;
  options: SelectChoice[];
  /** 스스로 값을 쥐는 모드의 첫 값 */
  defaultValue?: string;
  /** 바깥이 값을 쥐는 모드. 주면 이 값만 따른다(고른 값에 따라 옆 칸이 바뀌는 자리) */
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  size?: SelectSize;
  disabled?: boolean;
}) {
  const [self, setSelf] = useState(defaultValue ?? options[0]?.value ?? "");
  const current = value ?? self;
  return (
    <>
      <input type="hidden" name={name} value={current} />
      <SelectCore
        label={label}
        hideLabel={hideLabel}
        selectedValue={current}
        options={options}
        onPick={(v) => {
          if (value === undefined) setSelf(v);
          onChange?.(v);
        }}
        className={className}
        size={size}
        disabled={disabled}
      />
    </>
  );
}
