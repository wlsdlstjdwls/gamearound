// 가격 그래프 — 최근 1년 price_snapshots → 클라이언트 차트에 JSON prop (§5.1)
// 가격은 "값이 바뀐 시점"만 기록되므로 기록이 적은 게임은 그래프가 거의 평평하다. 대신 현재 할인, 행사 기간을 함께 보여준다.
import { DbUnavailablePage } from "@/components/db-unavailable";
import { DB_DOWN, orDbDown } from "@/lib/db-errors";
import { gamePricesPath } from "@/lib/routes";
import { cheapestOf, formatPrice } from "@/lib/currency";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DiscountText } from "@/components/ui/discount";
import { EmptyState } from "@/components/empty-state";
import { PriceChart } from "@/components/price-chart";
import { SaleBadge } from "@/components/sale-badge";
import { BackLink } from "@/components/ui/back-link";
import { Page, SectionHead } from "@/components/ui/page";
import { DiscountBadge } from "@/components/ui/discount";
import { CoverImage } from "@/components/game-card";
import { Clamp } from "@/components/ui/tooltip";
import { stagger } from "@/lib/motion";
import { formatDate, PLATFORM_LABEL } from "@/lib/format";
import { bestDiscountOf, isAtBestDiscount } from "@/lib/price-stats";
import { displayTitle, getGameBySlugCached } from "@/server/services/games";
import { getPriceHistory, type PriceSeries } from "@/server/services/prices";
import { decodeSlugParam } from "@/lib/slug";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = decodeSlugParam((await params).slug);
  const game = await orDbDown(getGameBySlugCached(slug));
  if (game === DB_DOWN) return {};
  if (!game) return { title: "게임을 찾을 수 없음" };
  return { title: `${displayTitle(game)} 가격 변동`, description: `${displayTitle(game)}의 최근 1년 플랫폼별 가격 변동 그래프` };
}

/** 기록된 스냅샷 기준 최저가 — 수집 시작 이전 가격은 알 수 없으므로 "기록 기준"이라고 표기한다 */
function lowestOf(s: PriceSeries): number {
  return Math.min(...s.points.map((p) => p.price));
}

/** 현재가가 가장 싼 플랫폼 */
/** 통화가 섞였을 때의 규칙은 lib/currency 가 갖는다 — 화면마다 다르게 고르면 "최저가"가 서로 달라진다 */
const bestDeal = (series: PriceSeries[]): PriceSeries | null => cheapestOf(series);

/** 이 화면의 문구(규약 2장). 2026-10-27 화면을 판 셋(요약, 그래프, 플랫폼별)으로 다시 세우며 한곳에 모았다 */
const PRICE_PAGE = {
  kicker: "가격 변동 | 최근 1년",
  summaryLabel: "가격 요약",
  chartLabel: "가격 그래프",
  nowCheapest: (platform: string) => `지금 가장 싼 곳 | ${platform}`,
  notOnSale: "지금은 할인 중이 아니에요",
  topDiscount: "기록 기준 최대 할인",
  nowIsBest: "지금이 그때예요",
  noDiscountRecord: "할인 기록이 아직 없어요",
  lowest: "기록 기준 최저가",
  sameAsNow: "지금 값과 같아요",
  shadeNote: "음영은 할인이 진행된 구간이에요",
  perPlatform: "플랫폼별 요약",
  perPlatformNote: "기록된 값 기준",
  records: (n: number) => `기록 ${n}건`,
  colTopDiscount: "최대 할인",
  colLowest: "최저",
  colHighest: "최고",
  emptyTitle: "아직 가격 기록이 없어요",
  emptyBody: "가격은 값이 바뀔 때만 기록해요. 기록이 쌓이면 그래프가 그려져요.",
  emptyAction: "상세로 돌아가기",
} as const;

export default async function PricesPage({ params }: Props) {
  const slug = decodeSlugParam((await params).slug);
  // 둘 다 slug 만 있으면 된다 — 줄 세울 이유가 없다(왕복 한 번이 200ms 대)
  const loaded = await orDbDown(Promise.all([getGameBySlugCached(slug), getPriceHistory(slug, { days: 365 })]));
  if (loaded === DB_DOWN) return <DbUnavailablePage retryHref={gamePricesPath(slug)} />;
  const [game, series] = loaded;
  if (!game) notFound();
  const title = displayTitle(game);
  const best = bestDeal(series);
  const top = best ? bestDiscountOf(best.points) : null;

  return (
    <Page gap={22}>
      <BackLink href={`/games/${game.slug}`}>{title} 상세로</BackLink>

      {/* 머리: 커버 한 장 + 게임 이름과 "가격 변동". 어느 게임의 그래프인지가 첫 줄에 서야 한다(2026-10-27 개선 — 예전 제목은 "가격 변동 | 최근 1년" 뿐이었다) */}
      <header className="enter-item flex items-center gap-4" style={stagger(0)}>
        {game.coverUrl && (
          <span className="relative aspect-[460/215] w-[120px] shrink-0 overflow-hidden rounded-[var(--radius-inset)] bg-surface-3 shadow-hair sm:w-[150px]">
            <CoverImage src={game.coverUrl} alt="" sizes="150px" />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-acc">{PRICE_PAGE.kicker}</p>
          <h1 className="text-[24px] font-extrabold leading-tight tracking-[-0.04em] text-ink sm:text-[28px]">
            <Clamp>{title}</Clamp>
          </h1>
        </div>
      </header>

      {series.length === 0 ? (
        <EmptyState title={PRICE_PAGE.emptyTitle} description={PRICE_PAGE.emptyBody} action={{ href: `/games/${game.slug}`, label: PRICE_PAGE.emptyAction }} />
      ) : (
        <>
          {best && (
            // 숫자 셋을 판 하나에: 지금 가장 싼 곳(큰 값), 기록 최대 할인, 기록 최저가. "살 때인가" 를 한눈에 읽는다
            <section aria-label={PRICE_PAGE.summaryLabel} className="enter-item grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]" style={stagger(1)}>
              <div className="flex flex-col gap-2 rounded-[var(--radius-panel)] bg-surface p-5 shadow-[var(--elev-card)]">
                <span className="text-[12.5px] font-semibold text-mut">{PRICE_PAGE.nowCheapest(PLATFORM_LABEL[best.platform] ?? best.platform)}</span>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                  <span className="text-[30px] font-extrabold leading-none tracking-[-0.045em] text-ink sm:text-[34px]">{formatPrice(best.currentPrice, best.currency)}</span>
                  <DiscountBadge pct={best.discountPct} />
                  {best.discountPct && best.discountPct > 0 ? <span className="text-[13px] text-dim-2 line-through">{formatPrice(best.listPrice, best.currency)}</span> : null}
                </div>
                {best.discountPct && best.discountPct > 0 ? (
                  <SaleBadge discountName={best.discountName} discountStartsAt={best.discountStartsAt} discountEndsAt={best.discountEndsAt} />
                ) : (
                  <span className="text-[12.5px] text-dim">{PRICE_PAGE.notOnSale}</span>
                )}
              </div>
              <StatCard label={PRICE_PAGE.topDiscount}>
                {top ? (
                  <>
                    <span className="text-[24px] font-extrabold tracking-[-0.035em] text-acc">
                      <DiscountText pct={top.discountPct} />
                    </span>
                    <span className="text-[12.5px] text-mut">
                      {formatPrice(top.price, best.currency)} | {isAtBestDiscount(best.discountPct, top) ? <b className="font-semibold text-ok">{PRICE_PAGE.nowIsBest}</b> : formatDate(top.t)}
                    </span>
                  </>
                ) : (
                  <span className="text-[15px] font-bold text-dim">{PRICE_PAGE.noDiscountRecord}</span>
                )}
              </StatCard>
              <StatCard label={PRICE_PAGE.lowest}>
                <span className="text-[24px] font-extrabold tracking-[-0.035em] text-ink">{formatPrice(lowestOf(best), best.currency)}</span>
                {best.currentPrice === lowestOf(best) && <span className="text-[12.5px] font-semibold text-ok">{PRICE_PAGE.sameAsNow}</span>}
              </StatCard>
            </section>
          )}

          <section aria-label={PRICE_PAGE.chartLabel} className="enter-item rounded-[var(--radius-panel)] bg-surface p-4 shadow-[var(--elev-card)] sm:p-6" style={stagger(2)}>
            <PriceChart series={series} />
            <p className="mt-2 text-right text-[11.5px] text-dim">{PRICE_PAGE.shadeNote}</p>
          </section>

          {/* 플랫폼마다 판 한 장(2026-10-27, 일곱 칸 표에서). 표는 좁은 화면에서 칸이 접혀 숫자가 어느 칸인지 안 읽혔다 */}
          <section aria-labelledby="summary-heading" className="flex flex-col gap-3">
            <SectionHead id="summary-heading" title={PRICE_PAGE.perPlatform} note={PRICE_PAGE.perPlatformNote} />
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {series.map((s, i) => {
                const prices = s.points.map((p) => p.price);
                const record = bestDiscountOf(s.points);
                return (
                  <li key={s.platform} className="enter-item lift flex flex-col gap-3 rounded-[var(--radius-md)] bg-surface p-4 shadow-[var(--elev-card)]" style={stagger(3 + i)}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[15px] font-bold text-ink">{PLATFORM_LABEL[s.platform] ?? s.platform}</span>
                      <span className="text-[11.5px] text-dim">
                        {PRICE_PAGE.records(s.points.length)} | {formatDate(s.points[s.points.length - 1].t)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[22px] font-extrabold tracking-[-0.035em] text-ink">{formatPrice(s.currentPrice, s.currency)}</span>
                      <DiscountBadge pct={s.discountPct} size="sm" />
                    </div>
                    <dl className="grid grid-cols-3 gap-2 border-t border-line-soft pt-3 text-[12px]">
                      <div className="flex flex-col gap-0.5">
                        <dt className="text-dim">{PRICE_PAGE.colTopDiscount}</dt>
                        <dd className="font-semibold text-ink">{record ? <DiscountText pct={record.discountPct} /> : "-"}</dd>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <dt className="text-dim">{PRICE_PAGE.colLowest}</dt>
                        <dd className="font-semibold text-ink">{formatPrice(Math.min(...prices), s.currency)}</dd>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <dt className="text-dim">{PRICE_PAGE.colHighest}</dt>
                        <dd className="font-semibold text-mut">{formatPrice(Math.max(...prices), s.currency)}</dd>
                      </div>
                    </dl>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </Page>
  );
}

/** 요약 판의 작은 칸(기록 최대 할인, 기록 최저가) */
function StatCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[var(--radius-panel)] bg-surface p-5 shadow-[var(--elev-card)]">
      <span className="text-[12.5px] font-semibold text-mut">{label}</span>
      {children}
    </div>
  );
}
