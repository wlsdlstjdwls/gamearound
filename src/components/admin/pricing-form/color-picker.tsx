"use client";
// 색 고르기 — 문구 칸 오른쪽 끝의 작은 색 동그라미. 누르면 팝업에서 기본 색, 직접 선택, 스포이트로 고른다
// (2026-10-30 사용자 "글자가 아니라 색상으로, 클릭 가능하게, 커스텀도, 스포이트도, 행 너무 차지하니까 해당 문구 옆에").
// 앞 판(tone-picker)은 색 이름 칩 줄을 칸마다 한 행씩 깔아 폼이 길어졌다.
//
// 팝업은 body 로 포털해 fixed 로 띄운다 — 폼 묶음(FormSection)이 overflow-hidden 이라 제자리에 그리면 잘린다.
// 직접 선택은 브라우저 색상 선택기(input type=color)다. 스포이트는 EyeDropper 를 아는 브라우저(크롬, 엣지)에서만 단추를 세운다 —
// 모르는 브라우저에서 눌러도 아무 일이 없는 단추는 고장으로 읽힌다. 고르는 즉시 값이 바뀌고 미리 보기도 따라간다(AGENTS 6장).
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { toneDot } from "@/components/payments/copy-tone";
import { PRICING_ADMIN_MESSAGES as M } from "@/lib/pricing/admin-messages";
import { isHexColor, type ToneValue } from "@/lib/pricing/copy-tones";

type Kind = "badge" | "box" | "text";
type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };

/** 팝업 폭(px)과 칸과의 간격. 기본 색 다섯 개와 직접 선택 줄이 한 줄씩 들어가는 폭 */
const POP_W = 244;
const GAP = 6;
const EDGE = 8;
/** 직접 선택을 처음 열 때의 색 — 토큰 값은 #hex 가 아니라 색상 선택기에 넘길 수 없다. 서비스 파랑(--acc 라이트 값) */
const CUSTOM_START = "#2563eb";

function eyeDropper(): EyeDropperCtor | null {
  return (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper ?? null;
}

function nameOf(tone: string): string {
  return isHexColor(tone) ? tone : (M.toneLabels[tone as keyof typeof M.toneLabels] ?? tone);
}

export function ColorPicker<T extends string>({
  label,
  kind,
  tones,
  value,
  fallback,
  onChange,
}: {
  /** 무엇의 색인가(낭독기, 말풍선). "강조 배지 색상" */
  label: string;
  kind: Kind;
  tones: readonly T[];
  /** 저장된 값. 비면 fallback(고르기 전 색) */
  value: ToneValue<T> | undefined;
  fallback: T;
  /**
   * 고른 색. "기본 색으로" 단추는 두지 않는다(2026-10-30 사용자 "필요 없을 듯") — 기본 색도 보기 동그라미 하나라 그걸 누르면 된다
   */
  onChange: (tone: ToneValue<T>) => void;
}) {
  const id = useId();
  const current = value ?? fallback;
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const t = trigger.current?.getBoundingClientRect();
    if (!t) return;
    const h = pop.current?.offsetHeight ?? 0;
    const below = t.bottom + GAP;
    const top = below + h > window.innerHeight - EDGE ? Math.max(EDGE, t.top - GAP - h) : below;
    const left = Math.min(Math.max(EDGE, t.right - POP_W), window.innerWidth - EDGE - POP_W);
    setPos({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  // 바깥 누름(mousedown + touchstart, AGENTS 6장)과 Esc 로 닫는다. 스포이트로 화면을 찍는 동안은 브라우저가 누름을 가져가 닫히지 않는다
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => {
      const n = e.target as Node;
      if (!pop.current?.contains(n) && !trigger.current?.contains(n)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("touchstart", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("touchstart", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const pickFromScreen = async () => {
    const Ctor = eyeDropper();
    if (!Ctor) return;
    try {
      const { sRGBHex } = await new Ctor().open();
      const hex = sRGBHex.toLowerCase();
      if (isHexColor(hex)) onChange(hex);
    } catch {
      // Esc 로 스포이트를 거둔 것 — 고른 색이 없을 뿐 오류가 아니다
    }
  };

  // 팝업은 누른 뒤에만 그려져(브라우저) 서버 그림과 어긋날 일이 없다 — 렌더에서 바로 본다
  const canPick = open && eyeDropper() !== null;
  const dot = toneDot(kind, current);
  const dotBase = "inline-block size-5 shrink-0 rounded-full";

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label={M.colorTrigger(label, nameOf(current))}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
        className="press inline-flex size-8 items-center justify-center rounded-lg hover:bg-surface-2"
      >
        <span aria-hidden className={cn(dotBase, "shadow-[0_0_0_1px_var(--line)]", dot.className)} style={dot.style} />
      </button>
      {open &&
        createPortal(
          <div
            ref={pop}
            id={id}
            role="dialog"
            aria-label={label}
            className={cn("fixed z-[60] flex flex-col gap-2.5 rounded-xl bg-surface p-3 shadow-2 ring-1 ring-line", pos ? "animate-fade-in" : "invisible")}
            style={{ top: pos?.top ?? 0, left: pos?.left ?? 0, width: POP_W }}
          >
            <p className="text-[12px] font-semibold text-mut">{label}</p>
            <div className="flex flex-wrap gap-2">
              {tones.map((t) => {
                const d = toneDot(kind, t);
                const on = current === t;
                return (
                  <button
                    key={t}
                    type="button"
                    aria-label={nameOf(t)}
                    aria-pressed={on}
                    onClick={() => onChange(t)}
                    className={cn("press inline-flex size-9 items-center justify-center rounded-full", on && "shadow-[0_0_0_2px_var(--acc)]")}
                  >
                    <span aria-hidden className={cn(dotBase, "size-6", d.className)} style={d.style} />
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1.5 border-t border-line-soft pt-2.5">
              <label className={cn("press relative inline-flex h-8 flex-1 cursor-pointer items-center gap-2 rounded-lg px-2 text-[12.5px] text-ink-2 hover:bg-surface-2", isHexColor(current) && "shadow-[0_0_0_2px_var(--acc)]")}>
                {/* 무지개 고리는 "아무 색이나" 를 뜻하는 그림이라 토큰이 아닌 색 이름을 쓴다(색상환 아이콘) */}
                <span aria-hidden className={cn(dotBase, "size-4 bg-[conic-gradient(red,yellow,lime,cyan,blue,magenta,red)]")} style={isHexColor(current) ? { background: current } : undefined} />
                {isHexColor(current) ? current : M.colorCustom}
                <input type="color" value={isHexColor(current) ? current : CUSTOM_START} onChange={(e) => {
                    const hex = e.target.value.toLowerCase();
                    if (isHexColor(hex)) onChange(hex);
                  }} className="absolute inset-0 cursor-pointer opacity-0" aria-label={M.colorCustom} />
              </label>
              {canPick && (
                <button type="button" onClick={pickFromScreen} className="press inline-flex h-8 items-center rounded-lg px-2 text-[12.5px] text-ink-2 hover:bg-surface-2">
                  {M.colorEyedropper}
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
