// 홈 "곧 할인 마감" 목록 — 썸네일, 제목, 스토어 | 값 | 할인율 | 정가, 남은 시간.
// 홈 화면 파일이 300줄을 넘어 갈랐다(2026-10-02 홈 재구성). 모양과 근거 주석은 그대로 옮겼다.
import Link from "next/link";
import { formatPrice } from "@/lib/currency";
import { PLATFORM_LABEL } from "@/lib/format";
import { cn } from "@/lib/cn";
import { CoverImage } from "@/components/game-card";
import { DiscountText } from "@/components/ui/discount";
import { SaleBadge } from "@/components/sale-badge";
import { Clamp } from "@/components/ui/tooltip";
import { ROW, ROWS } from "@/components/ui/page";
import type { GameSummary } from "@/server/services/games/dto";

export function EndingSoonList({ games: soon }: { games: GameSummary[] }) {
  return (
    <ul className={ROWS}>
      {soon.map((g) => (
        <li key={g.slug}>
          <Link href={`/games/${g.slug}`} className={cn(ROW, "flex items-center gap-3.5 py-[13px]")}>
            {/* 썸네일을 세우는 이유: 제목만 늘어선 목록은 "무슨 게임인지" 를 글자로만 묻는다.
                카드와 같은 460:215 비율이라 같은 그림이 같은 모양으로 읽힌다 */}
            <span className="relative aspect-[460/215] w-16 shrink-0 overflow-hidden rounded-[var(--radius-inset)] bg-surface-3 shadow-hair">
              <CoverImage src={g.coverUrl} alt="" sizes="64px" />
            </span>
            <span className="min-w-0 flex-1">
              <Clamp className="block text-[14.5px] font-bold tracking-[-0.02em] text-ink">{g.titleKo ?? g.titleEn}</Clamp>
              {/* 값은 카드와 같은 문법으로 읽힌다 — 할인가가 굵고, 원래 값은 취소선 회색으로 그 옆에 선다.
                  할인가만 적으면 "얼마나 싸졌나" 를 스탬프 없는 이 줄에서는 알 길이 없다 */}
              <span className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 text-[12px] text-dim">
                {g.best && (
                  <>
                    <span>{PLATFORM_LABEL[g.best.platform] ?? g.best.platform}</span>
                    <span aria-hidden>|</span>
                  </>
                )}
                <span className="font-bold text-ink">{formatPrice(g.best?.currentPrice, g.best?.currency)}</span>
                {/* 할인율을 값 옆에 세운다(2026-09-22, 사용자 지적: "할인율이 안보임").
                    이 줄에는 커버 위 스탬프가 없어서, 취소선 정가만으로는 "얼마나 싸졌나" 를
                    두 숫자를 머릿속에서 나눠 봐야 알 수 있었다. 카드의 스탬프와 같은 브랜드 색이다 */}
                {g.best?.discountPct != null && g.best.discountPct > 0 && (
                  <span className="font-bold text-acc"><DiscountText pct={g.best.discountPct} /></span>
                )}
                {g.best?.listPrice != null && g.best.listPrice !== g.best.currentPrice && (
                  <span className="text-[11px] text-dim-2 line-through">{formatPrice(g.best.listPrice, g.best.currency)}</span>
                )}
              </span>
            </span>
            <SaleBadge variant="inline" discountName={null} discountEndsAt={g.best?.discountEndsAt} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
