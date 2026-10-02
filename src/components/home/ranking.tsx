// 홈 "지금 인기 순위" — 번호가 붙은 목록(2026-10-02 홈 재구성).
//
// 카드 격자가 아니라 목록인 이유: 순위는 순서 자체가 정보다. 격자는 왼쪽 위부터 읽는다는 약속이 약해
// 3위와 4위가 같은 줄 끝과 다음 줄 처음에 갈려 선다. 번호와 한 줄씩 내려가는 모양이 "몇 위" 를 먼저 말한다.
// 넓은 화면은 다섯씩 두 기둥(1~5, 6~10) — 한 기둥 열 줄은 첫 화면을 다 먹는다.
//
// 좁은 화면에도 grid-cols-1 을 적는다 — 틀이 없으면 암묵 칸이 잘린 제목의 한 줄 폭만큼 늘어 문서가 가로로 밀린다(할 일 판과 같은 함정).
//
// 윗자리 셋만 번호를 브랜드 색으로 칠한다. 열 개를 다 칠하면 아무것도 강조되지 않는다.
import Link from "next/link";
import { formatPrice } from "@/lib/currency";
import { PLATFORM_LABEL } from "@/lib/format";
import { cn } from "@/lib/cn";
import { stagger } from "@/lib/motion";
import { CoverImage, SavingLine } from "@/components/game-card";
import { DiscountText } from "@/components/ui/discount";
import { Clamp } from "@/components/ui/tooltip";
import { ROW } from "@/components/ui/page";
import type { GameSummary } from "@/server/services/games/dto";

/** 번호를 칠하는 윗자리 수 */
const PODIUM = 3;

export function HomeRanking({ games }: { games: GameSummary[] }) {
  return (
    <ol className="grid grid-cols-1 gap-x-10 sm:grid-flow-col sm:grid-cols-2 sm:grid-rows-5">
      {games.map((g, i) => (
        <li key={g.slug} className="enter-item border-t border-line-soft first:border-t-0 sm:[&:nth-child(6)]:border-t-0" style={stagger(i)}>
          <Link href={`/games/${g.slug}`} className={cn(ROW, "flex items-center gap-3.5 py-3")}>
            <span
              className={cn(
                "w-7 shrink-0 text-center text-[22px] font-extrabold tabular-nums tracking-[-0.04em]",
                i < PODIUM ? "text-acc" : "text-dim-2",
              )}
            >
              {i + 1}
            </span>
            <span className="relative aspect-[460/215] w-[92px] shrink-0 overflow-hidden rounded-[var(--radius-inset)] bg-surface-3 shadow-hair">
              <CoverImage src={g.coverUrl} alt="" sizes="92px" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <Clamp className="block text-[15px] font-bold tracking-[-0.02em] text-ink">{g.titleKo ?? g.titleEn}</Clamp>
              {g.best && g.best.currentPrice !== null && (
                <span className="flex flex-wrap items-baseline gap-x-1.5 text-[12.5px] text-dim">
                  <span>{PLATFORM_LABEL[g.best.platform] ?? g.best.platform}</span>
                  <span aria-hidden>|</span>
                  {g.best.discountPct != null && g.best.discountPct > 0 && (
                    <span className="font-bold text-acc">
                      <DiscountText pct={g.best.discountPct} />
                    </span>
                  )}
                  <span className="text-[14px] font-extrabold text-ink">{formatPrice(g.best.currentPrice, g.best.currency)}</span>
                </span>
              )}
              <SavingLine saving={g.saving} className="text-[12px]" />
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
