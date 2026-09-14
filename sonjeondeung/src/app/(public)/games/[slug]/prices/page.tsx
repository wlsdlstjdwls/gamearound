// 가격 그래프 — 최근 1년 price_snapshots → 클라이언트 차트에 JSON prop (§5.1)
// 가격은 "값이 바뀐 시점"만 기록되므로 기록이 적은 게임은 그래프가 거의 평평하다. 대신 현재 할인·행사 기간을 함께 보여준다.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PriceChart } from "@/components/price-chart";
import { SaleBadge } from "@/components/sale-badge";
import { formatDate, formatDiscount, formatKrw, PLATFORM_LABEL } from "@/lib/format";
import { displayTitle, getGameBySlugCached } from "@/server/services/games";
import { getPriceHistory, type PriceSeries } from "@/server/services/prices";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGameBySlugCached(slug);
  if (!game) return { title: "게임을 찾을 수 없음" };
  return { title: `${displayTitle(game)} 가격 변동`, description: `${displayTitle(game)}의 최근 1년 플랫폼별 가격 변동 그래프` };
}

/** 기록된 스냅샷 기준 최저가 — 수집 시작 이전 가격은 알 수 없으므로 "기록 기준"이라고 표기한다 */
function lowestOf(s: PriceSeries): number {
  return Math.min(...s.points.map((p) => p.price));
}

/** 현재가가 가장 싼 플랫폼 */
function bestDeal(series: PriceSeries[]): PriceSeries | null {
  const priced = series.filter((s) => s.currentPrice !== null);
  if (priced.length === 0) return null;
  return priced.reduce((a, b) => ((b.currentPrice ?? Infinity) < (a.currentPrice ?? Infinity) ? b : a));
}

export default async function PricesPage({ params }: Props) {
  const { slug } = await params;
  const game = await getGameBySlugCached(slug);
  if (!game) notFound();

  const series = await getPriceHistory(slug, { days: 365 });
  const title = displayTitle(game);
  const best = bestDeal(series);

  return (
    <div className="space-y-5">
      <nav aria-label="브레드크럼" className="text-sm text-slate-400">
        <Link href={`/games/${game.slug}`} className="hover:text-amber-300">
          ← {title}
        </Link>
      </nav>
      <h1 className="text-xl font-bold sm:text-2xl">가격 변동 (최근 1년)</h1>

      {series.length === 0 ? (
        <EmptyState
          title="아직 가격 이력이 없습니다"
          description="가격은 값이 바뀔 때만 기록됩니다. 수집이 누적되면 그래프가 표시됩니다."
          action={{ href: `/games/${game.slug}`, label: "상세로 돌아가기" }}
        />
      ) : (
        <>
          {best && (
            <section aria-labelledby="best-heading" className="rounded-xl border border-amber-400/30 bg-slate-900/60 p-4">
              <h2 id="best-heading" className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                지금 가장 싼 곳
              </h2>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-sm font-semibold text-slate-200">{PLATFORM_LABEL[best.platform] ?? best.platform}</span>
                <span className="text-2xl font-bold text-slate-100">{formatKrw(best.currentPrice)}</span>
                {best.discountPct && best.discountPct > 0 ? (
                  <>
                    <span className="text-sm text-slate-500 line-through">{formatKrw(best.listPrice)}</span>
                    <span className="rounded-md bg-amber-400 px-1.5 py-0.5 text-xs font-bold text-slate-950">{formatDiscount(best.discountPct)}</span>
                    <SaleBadge discountName={best.discountName} discountStartsAt={best.discountStartsAt} discountEndsAt={best.discountEndsAt} />
                  </>
                ) : (
                  <span className="text-xs text-slate-500">할인 중이 아님</span>
                )}
                <span className="text-xs text-slate-500">기록 기준 최저 {formatKrw(lowestOf(best))}</span>
              </div>
            </section>
          )}

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 sm:p-4">
            <PriceChart series={series} />
          </div>

          {/* 표 뷰(접근성 보조): 플랫폼별 현재가·할인·최저/최고 */}
          <section aria-labelledby="summary-heading" className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 id="summary-heading" className="mb-2 text-sm font-semibold text-slate-300">
              플랫폼별 요약
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-slate-500">
                  <tr>
                    <th scope="col" className="py-1 pr-3 font-medium">플랫폼</th>
                    <th scope="col" className="py-1 pr-3 font-medium">현재가</th>
                    <th scope="col" className="py-1 pr-3 font-medium">할인</th>
                    <th scope="col" className="py-1 pr-3 font-medium">행사 · 종료</th>
                    <th scope="col" className="py-1 pr-3 font-medium">최저가(기록)</th>
                    <th scope="col" className="py-1 pr-3 font-medium">최고가(기록)</th>
                    <th scope="col" className="py-1 pr-3 font-medium">최근 기록</th>
                    <th scope="col" className="py-1 font-medium">기록 수</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {series.map((s) => {
                    const prices = s.points.map((p) => p.price);
                    const last = s.points[s.points.length - 1];
                    const onSale = Boolean(s.discountPct && s.discountPct > 0);
                    return (
                      <tr key={s.platform}>
                        <th scope="row" className="py-1.5 pr-3 text-left font-medium text-slate-200">
                          {PLATFORM_LABEL[s.platform] ?? s.platform}
                        </th>
                        <td className="py-1.5 pr-3 text-slate-100">{formatKrw(s.currentPrice)}</td>
                        <td className="py-1.5 pr-3 text-amber-300">{onSale ? formatDiscount(s.discountPct) : "-"}</td>
                        <td className="py-1.5 pr-3">
                          {onSale ? (
                            <SaleBadge discountName={s.discountName} discountStartsAt={s.discountStartsAt} discountEndsAt={s.discountEndsAt} />
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="py-1.5 pr-3 text-amber-300">{formatKrw(Math.min(...prices))}</td>
                        <td className="py-1.5 pr-3 text-slate-300">{formatKrw(Math.max(...prices))}</td>
                        <td className="py-1.5 pr-3 text-slate-300">
                          {formatKrw(last.price)} <span className="text-xs text-slate-500">({formatDate(last.t)})</span>
                        </td>
                        <td className="py-1.5 text-slate-400">{s.points.length}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <p className="text-xs text-slate-500">
        가격은 각 스토어에서 주기적으로 수집되며 실시간이 아닙니다. <strong className="font-semibold text-slate-400">값이 변경된 시점만 기록</strong>되므로, 수집을 시작한
        뒤 아직 가격이 바뀌지 않은 게임은 선이 평평하게 보입니다. 할인 기간은 스토어가 공개하는 경우에만 표시합니다(Steam: 종료 시각·행사명, Xbox: 시작·종료).
      </p>
    </div>
  );
}
