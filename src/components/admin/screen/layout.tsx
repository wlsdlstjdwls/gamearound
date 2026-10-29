"use client";
// 관리자 화면 본문 부품 — 신세계TV 백오피스 화면 구성을 옮겼다(2026-10-29 밤, 사용자 "메뉴랑 버튼만 가져다 두고 화면 구성은 그대로네").
//
// 백오피스 관리 화면은 어디나 같은 순서로 선다(상품등록, 일반프로모션, 첫구매사은프로모션, 고객상세정보 실측):
//   1. 조회조건 띠(SearchBand) — 회색 띠 안에 "이름표 | 칸" 이 여러 열. 이름표는 칸 왼쪽에 오른쪽 정렬.
//   2. 왼쪽 목록(공통 그리드 screen/data-grid) + 오른쪽 상세(MasterDetail) — 목록 줄을 고르면 오른쪽이 그 줄의 상세로 바뀐다.
//   3. 상세는 탭(ScreenTabs)으로 나누고, 탭 안은 접히는 묶음(FormSection, "− 상품분류" 꼴) 안에 칸(Field)이 여러 열.
//      필수 칸은 이름표 앞 빨간 *, 고칠 수 없는 칸은 회색 칸(ReadValue).
// 색과 간격은 이 서비스 토큰을 쓴다 — 백오피스의 어두운 표 머리, 주황 단추는 가져오지 않았다(이 서비스 결이 아니다).
import { useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { ChevronDownIcon } from "@/components/ui/icons";
import { SCREEN_MESSAGES as SM } from "@/lib/admin/messages";

/** 조회조건 띠. 칸은 SearchItem 으로 넣는다. 넓은 화면에서 이름표, 칸 짝이 네 벌까지 한 줄에 선다 */
export function SearchBand({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section aria-label={label} className="grid gap-x-4 gap-y-2 rounded-xl bg-surface-2 px-4 py-3 sm:grid-cols-2 xl:grid-cols-4">
      {children}
    </section>
  );
}

export function SearchItem({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-2">
      <label htmlFor={htmlFor} className="text-right text-[12.5px] font-semibold text-mut">
        {label}
      </label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** 왼쪽 목록, 오른쪽 상세. 좁은 화면은 위아래로 선다 */
export function MasterDetail({ list, detail, listWidth = "460px" }: { list: React.ReactNode; detail: React.ReactNode; listWidth?: string }) {
  return (
    <div className="grid items-start gap-3 lg:grid-cols-[var(--master-w)_minmax(0,1fr)]" style={{ "--master-w": listWidth } as React.CSSProperties}>
      <div className="min-w-0 lg:sticky lg:top-[calc(var(--header-h)+var(--admin-head-h,76px)+12px)]">{list}</div>
      <div className="min-w-0">{detail}</div>
    </div>
  );
}

/** 상세 탭. 백오피스의 폴더 탭 — 고른 탭만 흰 면이 판과 이어진다 */
export function ScreenTabs({ label, tabs, active, onChange }: { label: string; tabs: Array<{ key: string; label: string; panel: React.ReactNode }>; active: string; onChange: (key: string) => void }) {
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = tabs.find((t) => t.key === active) ?? tabs[0];
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const n = (next + tabs.length) % tabs.length;
    onChange(tabs[n].key);
    refs.current[n]?.focus();
  };
  return (
    <div className="flex min-w-0 flex-col">
      <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line px-1 pt-px">
        {tabs.map((t, i) => {
          const on = t.key === current?.key;
          return (
            <button
              key={t.key}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${t.key}`}
              aria-selected={on}
              aria-controls={`${base}-panel`}
              tabIndex={on ? 0 : -1}
              onClick={() => onChange(t.key)}
              onKeyDown={(e) => onKey(e, i)}
              className={cn(
                "press -mb-px min-h-10 shrink-0 rounded-t-lg border border-b-0 px-3.5 text-[13px] transition-colors duration-fast",
                on ? "border-line bg-surface font-bold text-acc" : "border-transparent font-medium text-mut hover:text-ink",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`${base}-panel`} aria-labelledby={current ? `${base}-tab-${current.key}` : undefined} className="flex flex-col gap-3 rounded-b-xl border border-t-0 border-line bg-surface p-3 sm:p-4">
        {current?.panel}
      </div>
    </div>
  );
}

/** 접히는 묶음 — 백오피스 상세의 "− 상품분류" 꼴. 머리 오른쪽에 그 묶음만의 단추를 둔다(고객상세정보의 "배달지관리" 자리) */
export function FormSection({ title, action, defaultOpen = true, children }: { title: string; action?: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className="overflow-hidden rounded-xl border border-line-soft">
      <div className="flex min-h-10 items-center justify-between gap-2 bg-surface-2 pl-2 pr-2">
        <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="press flex min-h-10 items-center gap-1.5 rounded-md px-1.5 text-[13.5px] font-bold text-ink">
          <ChevronDownIcon size={15} className={cn("text-dim transition-transform duration-base", !open && "-rotate-90")} />
          {title}
        </button>
        {action}
      </div>
      {open && (
        <div id={id} className="grid gap-x-6 gap-y-2.5 p-3 sm:p-4 xl:grid-cols-2">
          {children}
        </div>
      )}
    </section>
  );
}

/** 칸 한 줄 — 이름표 왼쪽(오른쪽 정렬), 필수면 빨간 *. wide 는 묶음 두 열을 다 쓴다 */
export function Field({ label, htmlFor, required, wide, hint, children }: { label: string; htmlFor?: string; required?: boolean; wide?: boolean; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={cn("grid grid-cols-[96px_minmax(0,1fr)] items-start gap-x-3 gap-y-1", wide && "xl:col-span-2")}>
      <label htmlFor={htmlFor} className="flex min-h-11 items-center justify-end gap-0.5 text-right text-[12.5px] font-semibold text-mut">
        {required && (
          <span aria-hidden className="text-danger">
            *
          </span>
        )}
        {label}
        {required && <span className="sr-only">{SM.required}</span>}
      </label>
      <div className="min-w-0">{children}</div>
      {hint && <p className="col-start-2 text-[11.5px] text-dim">{hint}</p>}
    </div>
  );
}

/** 고칠 수 없는 값 — 회색 칸(백오피스의 계산, 코드 칸) */
export function ReadValue({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <div className={cn("flex min-h-11 items-center rounded-xl bg-surface-2 px-3.5 text-[14px] text-mut", align === "right" && "justify-end tabular-nums")}>{children}</div>;
}
