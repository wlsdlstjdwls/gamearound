"use client";
// 한 화면 안 탭. 처음엔 게임 상세 아래쪽 탭(목업 .tabs: 업데이트 노트 | 성능 정보)이었고, 2026-10-29 관리자 요금 카드 문구가 같이 쓰며 ui 로 옮겼다.
// 패널은 서버가 다 그려 넘기고 여기는 "어느 쪽이 열렸나" 만 든다 —
// 누른 순간 바뀐다(AGENTS §6). 주소에 싣지 않는 이유: 같은 화면 안에서 한 번 훑고 마는 전환이라
// 뒤로 가기마다 탭이 바뀌면 "상세에서 나가기" 가 두세 번 걸린다.
//
// 키보드: 탭 줄 안에서 좌우 화살표, Home, End 로 옮기고 그 자리에서 연다(WAI-ARIA 탭 패턴, 자동 활성화).
// 닫힌 패널은 hidden 으로 둔다 — 지우면 그 안의 접힘 상태, 판정 결과가 탭을 오갈 때마다 처음으로 돌아간다.
import { useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export type DetailTab = { key: string; label: string; panel: React.ReactNode };

/**
 * active, onChange 를 주면 바깥이 고른 탭을 쥔다(관리자 요금 문구: 고른 카드를 미리 보기도 따라간다).
 * size "sm" 은 탭 안의 탭(성능 정보 안 운영체제)이다 — 회색 판 위에 고른 칸만 흰 면이 서는 분할 단추 차림이다(2026-11-23 사용자 "탭 형태로").
 *   큰 알약 줄이 겹치면 어느 쪽이 바깥인지 안 읽히고, 칩 차림은 거르기 칩으로 읽혔다. 강조는 면 명암뿐이다(밑줄, 막대 금지).
 * keepHeight 는 패널을 한 칸에 겹쳐 두고 가장 긴 패널 높이를 늘 차지한다 — 탭을 바꿀 때 아래 내용이 오르내리지 않게(같은 날 사용자).
 *   닫힌 패널은 hidden 대신 invisible 이라 낭독기, 탭 이동에서도 빠진다.
 */
export function DetailTabs({
  label,
  tabs,
  active: controlled,
  onChange,
  size = "md",
  keepHeight = false,
}: {
  label: string;
  tabs: DetailTab[];
  active?: string;
  onChange?: (key: string) => void;
  size?: "md" | "sm";
  keepHeight?: boolean;
}) {
  const [own, setOwn] = useState(tabs[0]?.key ?? "");
  const active = controlled ?? own;
  const setActive = (key: string) => {
    setOwn(key);
    onChange?.(key);
  };
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
    <div className={cn("flex min-w-0 flex-col", size === "sm" ? "gap-3" : "gap-3.5")}>
      <div
        role="tablist"
        aria-label={label}
        className={cn(
          "inline-flex max-w-full self-start overflow-x-auto",
          size === "sm" ? "gap-0.5 rounded-[var(--radius-sm)] bg-surface-2 p-1" : "gap-1 rounded-full bg-surface p-1 shadow-hair",
        )}
      >
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
              className={
                size === "sm"
                  ? cn(
                      "press tap min-w-[72px] whitespace-nowrap rounded-[var(--radius-xs)] px-4 py-1.5 text-[13px] transition-colors duration-fast",
                      on ? "bg-surface font-bold text-ink shadow-hair" : "font-semibold text-mut hover:text-ink",
                    )
                  : cn(
                      "press min-h-[var(--touch-target)] whitespace-nowrap rounded-full px-5 text-[14px] font-semibold transition-colors duration-fast sm:px-6",
                      on ? "bg-acc-soft text-acc ring-1 ring-acc ring-inset" : "text-mut hover:text-ink",
                    )
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {keepHeight ? (
        <div className="grid min-w-0 [grid-template-areas:'panel']">
          {tabs.map((t) => (
            <div
              key={t.key}
              role="tabpanel"
              id={`${base}-panel-${t.key}`}
              aria-labelledby={`${base}-tab-${t.key}`}
              aria-hidden={t.key !== active}
              tabIndex={t.key === active ? 0 : -1}
              className={cn("min-w-0 [grid-area:panel]", t.key === active ? "animate-rise" : "invisible")}
            >
              {t.panel}
            </div>
          ))}
        </div>
      ) : (
        tabs.map((t) => (
          <div key={t.key} role="tabpanel" id={`${base}-panel-${t.key}`} aria-labelledby={`${base}-tab-${t.key}`} hidden={t.key !== active} tabIndex={0} className="animate-rise">
            {t.panel}
          </div>
        ))
      )}
    </div>
  );
}
