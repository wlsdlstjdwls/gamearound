"use client";
// 상세 아래쪽 탭(목업 .tabs: 업데이트 노트 | 성능 정보). 두 패널은 서버가 다 그려 넘기고 여기는 "어느 쪽이 열렸나" 만 든다 —
// 누른 순간 바뀐다(AGENTS §6). 주소에 싣지 않는 이유: 같은 화면 안에서 한 번 훑고 마는 전환이라
// 뒤로 가기마다 탭이 바뀌면 "상세에서 나가기" 가 두세 번 걸린다.
//
// 키보드: 탭 줄 안에서 좌우 화살표, Home, End 로 옮기고 그 자리에서 연다(WAI-ARIA 탭 패턴, 자동 활성화).
// 닫힌 패널은 hidden 으로 둔다 — 지우면 그 안의 접힘 상태, 판정 결과가 탭을 오갈 때마다 처음으로 돌아간다.
import { useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export type DetailTab = { key: string; label: string; panel: React.ReactNode };

export function DetailTabs({ label, tabs }: { label: string; tabs: DetailTab[] }) {
  const [active, setActive] = useState(tabs[0]?.key ?? "");
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const base = useId();

  const move = (i: number) => {
    const n = (i + tabs.length) % tabs.length;
    setActive(tabs[n].key);
    refs.current[n]?.focus();
  };
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    move(next);
  };

  return (
    <div className="flex min-w-0 flex-col gap-3.5">
      <div role="tablist" aria-label={label} className="inline-flex max-w-full gap-1 self-start overflow-x-auto rounded-full bg-surface p-1 shadow-hair">
        {tabs.map((t, i) => {
          const on = t.key === active;
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
              aria-controls={`${base}-panel-${t.key}`}
              tabIndex={on ? 0 : -1}
              onClick={() => setActive(t.key)}
              onKeyDown={(e) => onKey(e, i)}
              className={cn(
                "press min-h-[var(--touch-target)] whitespace-nowrap rounded-full px-5 text-[14px] font-semibold transition-colors duration-fast sm:px-6",
                on ? "bg-acc-soft text-acc ring-1 ring-acc ring-inset" : "text-mut hover:text-ink",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {tabs.map((t) => (
        <div key={t.key} role="tabpanel" id={`${base}-panel-${t.key}`} aria-labelledby={`${base}-tab-${t.key}`} hidden={t.key !== active} tabIndex={0}>
          {t.panel}
        </div>
      ))}
    </div>
  );
}
