"use client";
// 값을 하나 고르는 드롭다운의 겉모습과 키보드 동작(SelectCore).
//
// 네이티브 <select> 를 쓰지 않는 이유: 펼친 목록은 운영체제가 그려서 색, 모서리, 간격에
// 우리 토큰이 하나도 안 닿는다. 기기마다 다른 회색 목록이 뜬다.
// 그래서 버튼 + listbox 를 직접 그린다. 대신 키보드와 스크린리더 동작을 손으로 맞춘다.
//
// 칩 대신 이걸 쓰는 자리: 값이 열 개를 넘어 칩으로 늘어놓으면 필터 기둥을 세로로 다 먹는 곳(장르, 정렬).
// 값이 서넛뿐인 자리(플랫폼, 켬끔 조건)는 칩이 더 빠르다 — 한 번에 다 보이고 한 번에 눌린다.
//
// **두 가지로 쓴다**(2026-09-22): 고르면 **주소가 바뀌는** 자리는 `Select`, 폼 안에서 **값만 고르는**
// 자리는 `FormSelect` 다(./fields). 둘 다 이 파일의 SelectCore 를 쓴다.
// 가른 이유: 관리자 폼이 네이티브 select 를 쓰고 있었는데, 접힌 칸은 우리가 칠했어도 **펼친 목록만
// 운영체제 것**이라 같은 화면 안에서 이 드롭다운과 저 드롭다운이 서로 다른 물건으로 보였다(사용자 지적).
//
// 펼친 목록은 body 로 띄운다(2026-10-27, 사용자: "셀렉트박스 항목 리스트가 게임 카드 뒤쪽으로 보인다").
// 칸 옆에 absolute 로 두면 z 를 아무리 올려도 조상이 만든 쌓임 맥락(등장 애니메이션의 transform, opacity) 안에 갇혀
// 뒤에 오는 카드 밑으로 깔린다. 그래서 칸의 자리를 재서 fixed 로 띄운다. 단 <dialog>(모바일 필터 시트) 안에서는 띄우지 않는다 —
// dialog 는 최상위 층이라 body 로 보낸 목록이 시트 밑에 깔리고, 시트 안에는 겹칠 카드도 없다.
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { CheckIcon } from "@/components/ui/icons";
import { Clamp } from "@/components/ui/tooltip";

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
const LIST_MAX_H = 300;
/** 칸과 펼친 목록 사이 틈(px) */
const LIST_GAP = 6;
/** 위로 열지 정할 때 쓰는 항목 한 줄의 어림 높이(px). 목록이 짧으면 아래 자리가 조금만 있어도 아래로 연다 */
const OPTION_ROW_H = 40;

/** 띄운 목록의 자리. 아래 자리가 모자라면 위로 연다(bottom) */
type Place = { left: number; width: number; top?: number; bottom?: number };

/**
 * 칸 크기. 기본(sm)은 필터 줄에 서는 조밀한 값이고, lg 는 손가락으로 고르는 자리다
 * (모바일 필터 시트, 폼). 시트에서 sm 을 그대로 쓰면 36px 짜리 칸이 화면 폭을 가득 채운 채 서서,
 * 폭은 큰데 높이만 낮은 눌리지 않을 것 같은 상자가 된다.
 */
const FIELD_SIZE = {
  sm: { field: "h-9 px-3 text-[12.5px]", label: "text-[11.5px]", option: "px-3 py-2 text-[13px]" },
  // md: 검색칸 옆 범위 고르기(검색어 칸, 검색 단추와 키를 맞춘다 — 셋 다 40px)
  md: { field: "h-10 px-3 text-[14px]", label: "text-[12px]", option: "px-3 py-2.5 text-[14px]" },
  lg: { field: "h-11 px-3.5 text-[14px]", label: "text-[12px]", option: "px-3.5 py-3 text-[14.5px]" },
} as const;
export type SelectSize = keyof typeof FIELD_SIZE;

/**
 * 겉모습과 키보드 동작. 고른 **뒤에** 무엇을 하는지(주소 이동 / 값 저장)만 밖에서 정한다.
 */
export function SelectCore({
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
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  // 띄운 목록의 자리. 재기 전에는 null 이다
  const [place, setPlace] = useState<Place | null>(null);
  // dialog 안이면 띄우지 않고 칸 옆에 붙인다(머리 주석)
  const [inline, setInline] = useState(false);

  // 열 때, 스크롤, 창 크기가 바뀔 때 칸의 자리를 다시 잰다. 그리기 전에 재야 한 프레임 엉뚱한 자리에 뜨지 않는다
  useLayoutEffect(() => {
    const button = buttonRef.current;
    if (!open || !button) return;
    if (button.closest("dialog")) {
      setInline(true);
      return () => setInline(false);
    }
    const measure = (e?: Event) => {
      // 목록 자신의 스크롤은 칸 자리를 안 바꾼다. 이걸 거르지 않으면 목록을 굴릴 때마다 자리를 새 객체로 다시 세웠고,
      // 그 바람에 아래 "훑는 자리 끌어오기" 가 매번 돌아 끌던 스크롤바를 제자리로 되돌렸다(2026-10-28 사용자 "끌면 버벅인다")
      if (e && listRef.current?.contains(e.target as Node)) return;
      const r = button.getBoundingClientRect();
      const below = window.innerHeight - r.bottom;
      const up = below < Math.min(LIST_MAX_H, options.length * OPTION_ROW_H) && r.top > below;
      const next: Place = up ? { left: r.left, width: r.width, bottom: window.innerHeight - r.top + LIST_GAP } : { left: r.left, width: r.width, top: r.bottom + LIST_GAP };
      setPlace((prev) => (prev && prev.left === next.left && prev.width === next.width && prev.top === next.top && prev.bottom === next.bottom ? prev : next));
    };
    measure();
    window.addEventListener("scroll", measure, { capture: true, passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, { capture: true });
      window.removeEventListener("resize", measure);
      setPlace(null);
    };
  }, [open, options.length]);

  // 바깥을 누르면 닫는다. click 이 아니라 mousedown, touchstart 로 듣는다 —
  // click 은 누른 곳과 뗀 곳이 다르면 안 오고, 터치에서는 300ms 늦게 온다
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      const t = e.target as Node;
      // 띄운 목록은 칸 밖(body)에 있다 — 그 안을 누른 것도 "안" 이다
      if (!rootRef.current?.contains(t) && !listRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [open]);

  // 열리면 훑는 자리를 보이는 곳으로 끌어온다. 장르처럼 스무 개가 넘으면 현재 값이 아래에 숨어 있다.
  // 열린 뒤에는 키보드로 옮길 때만 끌어온다 — 마우스가 지나가며 바꾼 훑는 자리까지 끌어오면 손으로 굴리는 스크롤과 싸운다
  const keyMoved = useRef(false);
  const placed = place !== null || inline;
  useEffect(() => {
    if (!open || !placed) return;
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
    // 연 순간 한 번만. 훑는 자리는 이 효과의 조건이 아니다(아래 효과가 키보드 몫을 맡는다)
  }, [open, placed]);
  useEffect(() => {
    if (!open || !keyMoved.current) return;
    keyMoved.current = false;
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [open, activeIdx]);

  const choose = (i: number) => {
    const opt = options[i];
    setOpen(false);
    buttonRef.current?.focus();
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
    // 목록이 body 로 떠 있어 Tab 이 칸 밖으로 나가면 목록만 덩그러니 남는다 — 닫고 보낸다
    if (e.key === "Tab") {
      setOpen(false);
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(activeIdx);
      return;
    }
    const move = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (move !== 0) {
      e.preventDefault();
      keyMoved.current = true;
      setActiveIdx((i) => Math.min(options.length - 1, Math.max(0, i + move)));
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      keyMoved.current = true;
      setActiveIdx(0);
    }
    if (e.key === "End") {
      e.preventDefault();
      keyMoved.current = true;
      setActiveIdx(options.length - 1);
    }
  };

  const list = (
    <ul
      ref={listRef}
      role="listbox"
      aria-labelledby={`${id}-label`}
      tabIndex={-1}
      style={
        place
          ? { position: "fixed", left: place.left, top: place.top, bottom: place.bottom, minWidth: place.width, maxHeight: LIST_MAX_H }
          : { maxHeight: LIST_MAX_H }
      }
      className={cn(
        "animate-scale-in z-50 overflow-y-auto overscroll-contain rounded-[var(--radius-md)] bg-surface p-1.5 shadow-3 ring-1 ring-line",
        place ? (place.bottom !== undefined ? "origin-bottom" : "origin-top") : "absolute left-0 right-0 top-full mt-1.5 origin-top",
      )}
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
                "tap flex w-full items-center gap-3 rounded-[var(--radius-inset)] text-left transition-colors duration-fast",
                box.option,
                isSelected ? "font-semibold text-acc" : "text-ink-2",
                i === activeIdx && (isSelected ? "bg-acc-soft" : "bg-surface-2 text-ink"),
              )}
            >
              <span className="min-w-0 flex-1 truncate">{o.label}</span>
              {/* 고른 값은 체크 하나로 말한다. 자리는 늘 비워 둔다 — 고른 줄만 글자가 밀리지 않게 */}
              <CheckIcon size={14} aria-hidden className={cn("shrink-0 transition-opacity duration-fast", isSelected ? "opacity-100" : "opacity-0")} />
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div ref={rootRef} className={cn("relative flex flex-col gap-1.5", className)}>
      <span id={`${id}-label`} className={cn(box.label, "text-dim", hideLabel && "sr-only")}>
        {label}
      </span>
      <button
        ref={buttonRef}
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
          "press tap flex w-full items-center gap-2 rounded-[var(--radius-sm)] border bg-surface text-left transition-[border-color,color,box-shadow] duration-base",
          box.field,
          open ? "border-acc text-ink shadow-[0_0_0_3px_var(--acc-glow)]" : "border-line-strong text-ink-2 hover:border-acc hover:text-ink",
          disabled && "cursor-not-allowed opacity-50 hover:border-line-strong hover:text-ink-2",
        )}
      >
        {/* 고른 값이 칸보다 길어 잘리면 올렸을 때 전체를 말풍선으로(ui/tooltip 의 Clamp, 2026-10-30 사용자 "폼 필드들도 툴팁") */}
        <span id={`${id}-value`} className="flex min-w-0 flex-1 font-medium">
          <Clamp className="min-w-0">{options[selectedIdx]?.label ?? ""}</Clamp>
        </span>
        {/* 화살표 글자 대신 그림 — 문구에 ↓ 를 쓰지 않는다는 규약을 지키면서 펼침을 표시한다 */}
        <svg aria-hidden viewBox="0 0 10 6" className={cn("w-2.5 shrink-0 transition-transform duration-base", open && "rotate-180 text-acc")}>
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (place ? createPortal(list, document.body) : inline ? list : null)}
    </div>
  );
}
