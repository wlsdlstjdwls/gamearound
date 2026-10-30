"use client";
// 요금 카드 문구 칸의 "값 넣기"(2026-10-29 밤, 사용자 "자동으로 바뀌는 값 넣기 이것도 불편한데 좀 편하게 넣는 방법 없을까").
//
// 앞 판은 문구 판 맨 위에 단추 상자 하나를 두고 "칸을 누른 뒤 단추를 누르면 그 자리에 들어간다" 였다. 칸과 단추가 멀어
// 아래쪽 칸을 고치다 위로 올라가야 했고, 어느 칸에 들어갈지가 눈에 안 보였다. 이제 넣는 길이 칸 안에 둘이다:
//   1. 칸 오른쪽 끝 "값 넣기" 단추 — 누르면 그 칸 바로 밑에 고르기 목록이 뜬다. 칸을 먼저 누르지 않았으면 칸 끝에 넣는다.
//   2. 칸에서 `{` 를 치면 같은 목록이 뜬다 — 화면 꼴 자리표시가 {절약금액} 이라 치는 손이 이미 그 글자로 시작한다(2026-10-30 치환변수 {} 통일).
//      방향키로 고르고 엔터로 넣는다. 그대로 계속 치면 목록이 닫히고 친 `[` 는 글자로 남는다.
// 넣기는 브라우저의 글 넣기(insertText)라 Ctrl+Z 로 되돌린다(copy-section 의 앞 결정과 같다).
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { COPY_TOKENS, displayToken } from "@/lib/pricing/copy-tokens";
import { PRICING_ADMIN_MESSAGES as M } from "@/lib/pricing/admin-messages";

type FieldEl = HTMLInputElement | HTMLTextAreaElement;

/** 칸에 붙이는 속성. 칸 컴포넌트(TextField, textarea)에 그대로 펼친다 */
export type TokenBind = {
  onKeyDown: (e: KeyboardEvent<FieldEl>) => void;
  "aria-expanded": boolean;
  "aria-controls": string;
  "aria-activedescendant"?: string;
};

function insertAt(el: FieldEl, start: number, end: number, text: string, write: (v: string) => void) {
  el.focus();
  el.setSelectionRange(start, end);
  if (document.execCommand("insertText", false, text)) return;
  // 글 넣기를 못 하는 브라우저만 값을 갈아 끼운다(이때는 되돌리기 기록이 끊긴다)
  write(el.value.slice(0, start) + text + el.value.slice(end));
  const caret = start + text.length;
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(caret, caret);
  });
}

/**
 * fieldId: 붙일 칸의 id(단추로 열 때 그 칸을 찾는다). write: 갈아 끼우기 대비책.
 * children 에 칸 속성과 단추를 넘긴다 — 칸마다 단추 자리(input 의 trailing, textarea 의 머리)가 달라서다
 */
export function TokenMenu({ fieldId, write, children }: { fieldId: string; write: (v: string) => void; children: (bind: TokenBind, trigger: ReactNode, menu: ReactNode) => ReactNode }) {
  const listId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  /** `[` 로 열었나 — 그러면 넣을 때 친 `[` 를 자리표시로 갈아 낀다 */
  const [bracket, setBracket] = useState(false);

  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("touchstart", away);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("touchstart", away);
    };
  }, [open]);

  const field = () => document.getElementById(fieldId) as FieldEl | null;

  const pick = (i: number) => {
    const el = field();
    const token = COPY_TOKENS[i];
    setOpen(false);
    if (!el || !token) return;
    const caret = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? caret;
    const fromBracket = bracket && caret > 0 && el.value[caret - 1] === "{";
    insertAt(el, fromBracket ? caret - 1 : caret, end, displayToken(token.key), write);
  };

  const onKeyDown = (e: KeyboardEvent<FieldEl>) => {
    if (open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const step = e.key === "ArrowDown" ? 1 : -1;
        setActive((a) => (a + step + COPY_TOKENS.length) % COPY_TOKENS.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        pick(active);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      // 다른 글자를 치면 그냥 글을 쓰는 중이다 — 목록을 닫고 친 `{` 는 글자로 남긴다. Shift 같은 단독 수정 키는 넘긴다
      if (e.key.length === 1 || e.key === "Backspace") setOpen(false);
    }
    if (e.key === "{" && !e.nativeEvent.isComposing) {
      setBracket(true);
      setActive(0);
      setOpen(true);
    }
  };

  const openFromButton = () => {
    const el = field();
    if (!el) return;
    // 칸을 아직 안 눌렀으면 칸 끝에 넣는다. 눌렀으면 그 커서 자리를 지킨다(단추가 mousedown 으로 포커스를 뺏지 않는다)
    if (document.activeElement !== el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
    setBracket(false);
    setActive(0);
    setOpen((o) => !o);
  };

  const trigger = (
    <button
      type="button"
      aria-label={M.tokenButtonLabel}
      aria-expanded={open}
      aria-controls={listId}
      onMouseDown={(e) => e.preventDefault()}
      onClick={openFromButton}
      className={cn(
        "press inline-flex h-7 shrink-0 items-center rounded-md px-2 text-[12px] font-semibold transition-colors duration-fast",
        open ? "bg-acc text-on-ink" : "bg-acc-soft text-acc hover:bg-acc hover:text-on-ink",
      )}
    >
      {M.tokenButton}
    </button>
  );

  const menu = open ? (
    <ul
      id={listId}
      role="listbox"
      aria-label={M.tokenButtonLabel}
      className="animate-scale-in absolute right-0 top-full z-30 mt-1.5 w-[300px] max-w-[calc(100vw-48px)] origin-top-right rounded-[var(--radius-md)] bg-surface p-1.5 shadow-3 ring-1 ring-line"
    >
      {COPY_TOKENS.map((t, i) => (
        <li key={t.key} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => setActive(i)}
            onClick={() => pick(i)}
            className={cn("flex min-h-10 w-full flex-col items-start justify-center rounded-lg px-2.5 py-1.5 text-left", i === active && "bg-acc-soft")}
          >
            <span className="text-[13px] font-semibold text-acc">{displayToken(t.key)}</span>
            <span className="text-[12px] text-dim">{t.hint}</span>
          </button>
        </li>
      ))}
    </ul>
  ) : null;

  const bind: TokenBind = {
    onKeyDown,
    "aria-expanded": open,
    "aria-controls": listId,
    ...(open ? { "aria-activedescendant": `${listId}-${active}` } : {}),
  };

  return (
    <div ref={wrap} className="relative">
      {children(bind, trigger, menu)}
    </div>
  );
}
