// 항목별 순위 판(2026-10-28, 사용자 "각 항목마다 순위도, 가시성이 중요"). 내 게임 통계와 게임 하나 자세히가 같이 쓴다.
//
// 막대 길이가 곧 자리다: 1위면 꽉 차고, 꼴찌 쪽일수록 짧다(lib/indie/stats-rank 의 rankPosition 을 뒤집은 값).
// "120개 중 37위" 를 숫자로만 두면 좋은 건지 나쁜 건지 한 번 더 계산해야 한다 — 막대가 그 계산을 대신한다.
// 숫자는 늘 글자로 함께 선다(색이나 길이만으로 말하지 않는다). 순위가 없는 항목은 바닥 막대와 "아직 순위 밖이에요".
// 상태가 없어 서버 컴포넌트다. 자라는 모션은 전역 .bar-grow + stagger(i).
import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { stagger } from "@/lib/motion";
import { INDIE_PROMO_MESSAGES as M } from "@/lib/indie/promo-messages";
import { rankPosition, topPercent } from "@/lib/indie/stats-rank";

/** 순위가 꼴찌여도 막대가 보이게 남기는 최소 폭(%) — 0 이면 "막대가 없다" 와 "꼴찌다" 가 구분되지 않는다 */
const MIN_BAR_PCT = 4;

export type RankItem = { label: string; rank: number | null; note?: string };

export function RankPanel({ title, lead, items, population, className }: { title: string; lead: string; items: RankItem[]; population: number; className?: string }) {
  return (
    <section aria-label={title} className={cn("flex flex-col gap-4 rounded-[var(--radius-panel)] bg-surface p-4 shadow-hair sm:p-5", className)}>
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[15px] font-bold text-ink">{title}</h2>
        <p className="text-[12.5px] text-dim">{lead}</p>
      </div>
      <ul className="flex flex-col gap-3.5">
        {items.map((it, i) => {
          const has = it.rank !== null && population > 0;
          const fill = has ? Math.max(MIN_BAR_PCT, (1 - rankPosition(it.rank!, population)) * 100) : 0;
          const pct = has ? topPercent(it.rank!, population) : null;
          return (
            <li key={it.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 sm:grid-cols-[132px_minmax(0,1fr)_168px]">
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[13.5px] font-semibold text-ink">{it.label}</span>
                {it.note && <span className="truncate text-[11.5px] text-dim">{it.note}</span>}
              </span>
              <span className="col-span-2 row-start-2 h-2.5 overflow-hidden rounded-full bg-surface-2 sm:col-span-1 sm:row-start-auto">
                {has && <span className={cn("bar-grow block h-full rounded-full", it.rank === 1 ? "bg-acc" : "bg-acc/75")} style={{ "--bar-w": `${fill}%`, ...stagger(i) } as CSSProperties} />}
              </span>
              <span className="col-start-2 row-start-1 flex items-baseline justify-end gap-1.5 text-right sm:col-start-auto sm:row-start-auto">
                {has ? (
                  <>
                    <b className="text-[18px] font-black tabular-nums text-ink">{M.statsRank(it.rank!)}</b>
                    <span className="text-[12px] tabular-nums text-mut">
                      {M.statsOfPopulation(population)}{pct !== null && ` | ${M.statsTopPercent(pct)}`}
                    </span>
                  </>
                ) : (
                  <span className="text-[12.5px] text-dim">{M.statsRankNone}</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
