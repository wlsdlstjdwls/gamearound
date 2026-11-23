// 가격 그래프 — 최근 1년 price_snapshots → 클라이언트 차트에 JSON prop (§5.1)
// 가격은 "값이 바뀐 시점"만 기록되므로 기록이 적은 게임은 그래프가 거의 평평하다. 대신 현재 할인, 행사 기간을 함께 보여준다.
//
// 2026-11-23 사용자 "-30% 빨강으로, 화면 전체 서비스 기획 관점으로 UI/UX 개선". 이 화면의 질문은 "지금 사도 되나" 하나다. 그래서:
//  - 돈 이야기(할인율, 최저가 도달)는 상세의 가격 카드와 같은 빨강 하나로 말한다. 파랑(머리말, 최대 할인율)과 초록(지금이 그때예요)이 섞여
//    같은 뜻이 세 색이었다. 파랑은 누르는 것에만 남긴다
//  - 그래프 판에 제목을 세운다. 음영 안내 문구는 걷었다(같은 날 사용자 "지워")
//  - 첫 판에 결론 한 줄("최근 1년 중 가장 싼 값이에요" 또는 "최근 최저가보다 N원 비싸요")을 단다 — 숫자 셋을 견주는 일을 사람에게 맡기지 않는다
//  - 플랫폼별 판은 싼 순서로 세운다(첫 판이 곧 현재 최저가 플랫폼)
//  - 플랫폼별 판은 눌리지 않으므로 떠오르는 hover(lift)를 걷고, 지금 할인 중이면 행사 이름과 남은 기간, 지금 값이 기록 최저면 그 표시를 단다
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

/** 최근 최저가를 마지막으로 본 시각 */
function lowestAt(s: PriceSeries): string {
  const low = lowestOf(s);
  return [...s.points].reverse().find((p) => p.price === low)?.t ?? s.points[s.points.length - 1].t;
}

/** 현재가가 가장 싼 플랫폼 */
/** 통화가 섞였을 때의 규칙은 lib/currency 가 갖는다 — 화면마다 다르게 고르면 "최저가"가 서로 달라진다 */
const bestDeal = (series: PriceSeries[]): PriceSeries | null => cheapestOf(series);

/**
 * 이 화면의 문구(규약 2장). 2026-10-27 화면을 판 셋(요약, 그래프, 플랫폼별)으로 다시 세우며 한곳에 모았다.
 * 문장은 습니다체다(2026-11-23 사용자 "습니다/합니다체로, 문구 수정") — 가격 판단을 돕는 고지라 할인 예측 판과 같은 결로 맞췄다
 */
const PRICE_PAGE = {
  kicker: "가격 변동 | 최근 1년",
  chartTitle: "가격 그래프",
  atLowest: "최근 최저가",
  summaryLabel: "가격 요약",
  /** 요약 첫 판 머리(2026-11-23 사용자 "지금 가장 싼 곳 | Xbox 문구랑 표현방식 변경"). 플랫폼 이름은 글자 줄에 끼우지 않고 오른쪽 딱지로 세운다 */
  nowCheapest: "현재 최저가",
  /** 지금 값과 최근 최저가를 견준 한 줄 — 이 화면의 질문 "지금 사도 되나" 에 대한 답 */
  verdictLowest: "최근 1년 중 가장 낮은 가격입니다.",
  verdictAbove: (diff: string) => `최근 최저가보다 ${diff} 높습니다.`,
  notOnSale: "현재 진행 중인 할인이 없습니다.",
  /** "기록 기준" 을 "최근" 으로(2026-11-23 사용자) — 이 화면은 최근 1년 기록만 본다 */
  topDiscount: "최근 최대 할인",
  nowIsBest: "지금이 최대 할인입니다",
  noDiscountRecord: "할인 기록이 아직 없습니다",
  lowest: "최근 최저가",
  perPlatform: "플랫폼별 요약",
  perPlatformNote: "기록된 값 기준",
  records: (n: number) => `기록 ${n}건`,
  colTopDiscount: "최대 할인",
  colLowest: "최저",
  colHighest: "최고",
  emptyTitle: "아직 가격 기록이 없습니다",
  emptyBody: "가격은 값이 바뀔 때만 기록합니다. 기록이 쌓이면 그래프가 그려집니다.",
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
          <span className="relative aspect-[460/215] w-[120px] shrink-0 overflow-hidden rounded-[var(--radius-cover)] bg-surface-3 shadow-hair sm:w-[150px]">
            <CoverImage src={game.coverUrl} alt="" sizes="150px" />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-mut">{PRICE_PAGE.kicker}</p>
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
            // 숫자 셋을 판 하나에: 현재 최저가(큰 값과 결론 한 줄), 최근 최대 할인, 최근 최저가. "살 때인가" 를 한눈에 읽는다
            <section aria-label={PRICE_PAGE.summaryLabel} className="enter-item grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]" style={stagger(1)}>
              <div className="flex flex-col gap-2 rounded-[var(--radius-panel)] bg-surface p-5 shadow-[var(--elev-card)]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-semibold text-mut">{PRICE_PAGE.nowCheapest}</span>
                  <span className="rounded-[var(--radius-xs)] bg-surface-2 px-2 py-[3px] text-[12px] font-bold text-ink-2">{PLATFORM_LABEL[best.platform] ?? best.platform}</span>
                </div>
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
                {/* 결론 한 줄 — 최근 최저가와 견준다. 최저면 빨강(돈 이야기), 아니면 차이만 담담히 */}
                {best.currentPrice !== null && (
                  <p className="border-t border-line-soft pt-2 text-[13px]">
                    {best.currentPrice <= lowestOf(best) ? (
                      <b className="font-bold text-danger">{PRICE_PAGE.verdictLowest}</b>
                    ) : (
                      <span className="font-semibold text-ink-2">{PRICE_PAGE.verdictAbove(formatPrice(best.currentPrice - lowestOf(best), best.currency))}</span>
                    )}
                  </p>
                )}
              </div>
              <StatCard label={PRICE_PAGE.topDiscount}>
                {top ? (
                  <>
                    <span className="text-[24px] font-extrabold tracking-[-0.035em] text-danger">
                      <DiscountText pct={top.discountPct} />
                    </span>
                    <span className="text-[12.5px] text-mut">
                      {formatPrice(top.price, best.currency)} | {isAtBestDiscount(best.discountPct, top) ? <b className="font-bold text-danger">{PRICE_PAGE.nowIsBest}</b> : formatDate(top.t)}
                    </span>
                  </>
                ) : (
                  <span className="text-[15px] font-bold text-dim">{PRICE_PAGE.noDiscountRecord}</span>
                )}
              </StatCard>
              <StatCard label={PRICE_PAGE.lowest}>
                <span className="text-[24px] font-extrabold tracking-[-0.035em] text-ink">{formatPrice(lowestOf(best), best.currency)}</span>
                {/* 언제였는지 — 같은 값이 여러 번이면 가장 최근. 지금 값과 같다는 말은 첫 판의 결론 줄이 한다 */}
                <span className="text-[12.5px] text-mut">{formatDate(lowestAt(best))}</span>
              </StatCard>
            </section>
          )}

          <section aria-labelledby="price-chart-heading" className="enter-item flex flex-col gap-3 rounded-[var(--radius-panel)] bg-surface p-4 shadow-[var(--elev-card)] sm:p-6" style={stagger(2)}>
            <SectionHead id="price-chart-heading" size="sub" title={PRICE_PAGE.chartTitle} />
            <PriceChart series={series} />
          </section>

          {/* 플랫폼마다 판 한 장(2026-10-27, 일곱 칸 표에서). 표는 좁은 화면에서 칸이 접혀 숫자가 어느 칸인지 안 읽혔다 */}
          <section aria-labelledby="summary-heading" className="flex flex-col gap-3">
            <SectionHead id="summary-heading" title={PRICE_PAGE.perPlatform} note={PRICE_PAGE.perPlatformNote} />
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...series].sort((a, b) => (a.currentPrice ?? Infinity) - (b.currentPrice ?? Infinity)).map((s, i) => {
                const prices = s.points.map((p) => p.price);
                const record = bestDiscountOf(s.points);
                const onSale = Boolean(s.discountPct && s.discountPct > 0);
                const atLowest = s.currentPrice !== null && s.currentPrice <= Math.min(...prices);
                return (
                  <li key={s.platform} className="enter-item flex flex-col gap-3 rounded-[var(--radius-md)] bg-surface p-4 shadow-[var(--elev-card)]" style={stagger(3 + i)}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[15px] font-bold text-ink">{PLATFORM_LABEL[s.platform] ?? s.platform}</span>
                      <span className="text-[11.5px] text-dim">
                        {PRICE_PAGE.records(s.points.length)} | {formatDate(s.points[s.points.length - 1].t)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-[22px] font-extrabold tracking-[-0.035em] text-ink">{formatPrice(s.currentPrice, s.currency)}</span>
                        <DiscountBadge pct={s.discountPct} size="sm" />
                        {atLowest && onSale && <span className="text-[12px] font-bold text-danger">{PRICE_PAGE.atLowest}</span>}
                      </div>
                      {onSale && <SaleBadge discountName={s.discountName} discountStartsAt={s.discountStartsAt} discountEndsAt={s.discountEndsAt} />}
                    </div>
                    <dl className="grid grid-cols-3 gap-2 border-t border-line-soft pt-3 text-[12px]">
                      <div className="flex flex-col gap-0.5">
                        <dt className="text-dim">{PRICE_PAGE.colTopDiscount}</dt>
                        <dd className="font-bold text-danger">{record ? <DiscountText pct={record.discountPct} /> : <span className="font-semibold text-dim-2">-</span>}</dd>
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
