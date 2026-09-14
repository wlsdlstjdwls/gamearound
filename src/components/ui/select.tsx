"use client";
// 값을 하나 고르는 드롭다운 — 고르면 그 값의 주소로 이동한다(필터, 정렬).
//
// 네이티브 <select> 를 쓰지 않는 이유: 펼친 목록은 운영체제가 그려서 색, 모서리, 간격에
// 우리 토큰이 하나도 안 닿는다. 기기마다 다른 회색 목록이 뜬다.
// 그래서 버튼 + listbox 를 직접 그린다. 대신 키보드와 스크린리더 동작을 손으로 맞춘다.
//
// 칩 대신 이걸 쓰는 자리: 값이 열 개를 넘어 칩으로 늘어놓으면 필터 기둥을 세로로 다 먹는 곳(장르, 정렬).
// 값이 서넛뿐인 자리(플랫폼, 켬끔 조건)는 칩이 더 빠르다 — 한 번에 다 보이고 한 번에 눌린다.
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

/** 열린 목록의 최대 높이(px). 이보다 길면 안에서 스크롤한다 — 화면 밖으로 자라지 않게 */
const LIST_MAX_H = 280;

export function Select({
  label,
  value,
  options,
  className,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  className?: string;
}) {
  const router = useRouter();
  const id = useId();
  const [open, setOpen] = useState(false);
  const selectedIdx = Math.max(0, options.findIndex((o) => o.value === value));
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
    if (opt && opt.value !== value) router.push(opt.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { setOpen(false); return; }
    if (!open && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      setActiveIdx(selectedIdx);
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(activeIdx); return; }
    const move = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (move !== 0) {
      e.preventDefault();
      setActiveIdx((i) => Math.min(options.length - 1, Math.max(0, i + move)));
      return;
    }
    if (e.key === "Home") { e.preventDefault(); setActiveIdx(0); }
    if (e.key === "End") { e.preventDefault(); setActiveIdx(options.length - 1); }
  };

  return (
    <div ref={rootRef} className={cn("relative flex flex-col gap-1.5", className)}>
      <span id={`${id}-label`} className="text-[11.5px] text-dim">{label}</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => { setActiveIdx(selectedIdx); setOpen((v) => !v); }}
        onKeyDown={onKeyDown}
        className={cn(
          "press flex h-9 w-full items-center gap-2 rounded-[var(--radius-sm)] border bg-surface px-3 text-left text-[12.5px] transition-colors duration-base",
          open ? "border-ink text-ink" : "border-line-strong text-mut hover:border-ink hover:text-ink",
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
            const isSelected = o.value === value;
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
                    "flex w-full items-center rounded-[var(--radius-inset)] px-2.5 py-[7px] text-left text-[12.5px] transition-colors duration-base",
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
