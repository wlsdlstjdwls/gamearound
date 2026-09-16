// 가격 그래프 — 최근 1년 price_snapshots → 클라이언트 차트에 JSON prop (§5.1)
// 가격은 "값이 바뀐 시점"만 기록되므로 기록이 적은 게임은 그래프가 거의 평평하다. 대신 현재 할인, 행사 기간을 함께 보여준다.
import { cheapestOf, formatPrice } from "@/lib/currency";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PriceChart } from "@/components/price-chart";
import { SaleBadge } from "@/components/sale-badge";
import { BackLink } from "@/components/ui/back-link";
import { Card, Page, PageHead, SectionHead } from "@/components/ui/page";
import { formatDate, formatDiscount, PLATFORM_LABEL } from "@/lib/format";
import { bestDiscountOf, isAtBestDiscount } from "@/lib/price-stats";
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
/** 통화가 섞였을 때의 규칙은 lib/currency 가 갖는다 — 화면마다 다르게 고르면 "최저가"가 서로 달라진다 */
const bestDeal = (series: PriceSeries[]): PriceSeries | null => cheapestOf(series);

const COLS = "grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-x-3 px-4 py-[13px]";

export default async function PricesPage({ params }: Props) {
  const { slug } = await params;
  // 둘 다 slug 만 있으면 된다 — 줄 세울 이유가 없다(왕복 한 번이 200ms 대)
  const [game, series] = await Promise.all([getGameBySlugCached(slug), getPriceHistory(slug, { days: 365 })]);
  if (!game) notFound();
  const title = displayTitle(game);
  const best = bestDeal(series);

  return (
    <Page gap={20}>
      <BackLink href={`/games/${game.slug}`}>{title} 상세로</BackLink>

      <PageHead title="가격 변동 | 최근 1년" />

      {series.length === 0 ? (
        <EmptyState
          title="아직 가격 이력이 없습니다"
          description="가격은 값이 바뀔 때만 기록해요. 기록이 쌓이면 그래프가 표시돼요."
          action={{ href: `/games/${game.slug}`, label: "상세로 돌아가기" }}
        />
      ) : (
        <>
          {best && (
            <Card className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 p-[18px]">
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold text-mut">{PLATFORM_LABEL[best.platform] ?? best.platform}</span>
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <span className="text-2xl font-bold tracking-[-0.03em] text-ink">{formatPrice(best.currentPrice, best.currency)}</span>
                  {best.discountPct && best.discountPct > 0 ? (
                    <>
                      <span className="text-[13px] text-dim-2 line-through">{formatPrice(best.listPrice, best.currency)}</span>
                      <span className="rounded-[6px] bg-ink px-2 py-[3px] text-[11.5px] font-bold text-on-ink">
                        {formatDiscount(best.discountPct)}
                      </span>
                      <SaleBadge discountName={best.discountName} discountStartsAt={best.discountStartsAt} discountEndsAt={best.discountEndsAt} />
                    </>
                  ) : (
                    <span className="text-[12px] text-dim">할인 중이 아님</span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-x-7 gap-y-3 text-right">
                {/* 할인율을 먼저 둔다 — 정가가 바뀌어도 흔들리지 않아 "살 때인가" 를 그대로 말해 준다 */}
                <div>
                  <p className="text-[11.5px] text-dim">기록 기준 최대 할인</p>
                  {(() => {
                    const top = bestDiscountOf(best.points);
                    if (!top) return <p className="text-[15px] font-bold text-dim">할인 기록 없음</p>;
                    return (
                      <p className="text-[15px] font-bold text-ink">
                        {formatDiscount(top.discountPct)}
                        <span className="ml-1 text-[12px] font-normal text-mut">{formatPrice(top.price, best.currency)}</span>
                        {isAtBestDiscount(best.discountPct, top) ? (
                          <span className="ml-1 text-[12px] font-normal text-ok">지금이 그때예요</span>
                        ) : (
                          <span className="ml-1 text-[12px] font-normal text-dim">{formatDate(top.t)}</span>
                        )}
                      </p>
                    );
                  })()}
                </div>
                <div>
                  <p className="text-[11.5px] text-dim">기록 기준 최저가</p>
                  <p className="text-[15px] font-bold text-ink">
                    {formatPrice(lowestOf(best), best.currency)}
                    {best.currentPrice === lowestOf(best) && <span className="ml-1 text-[12px] font-normal text-ok">현재가와 동일</span>}
                  </p>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-[18px]">
            <PriceChart series={series} />
            <p className="mt-2 text-right text-[11.5px] text-dim">음영 = 할인 진행 구간</p>
          </Card>

          {/* 표 뷰(접근성 보조): 플랫폼별 현재가, 할인, 최저/최고 */}
          <section aria-labelledby="summary-heading" className="flex flex-col gap-3">
            <SectionHead id="summary-heading" title="플랫폼별 요약" note="기록된 스냅샷 기준" />
            <Card className="overflow-hidden">
              <div className={`${COLS} border-b border-line text-[11.5px] text-dim`}>
                <span>플랫폼</span>
                <span>현재가</span>
                <span>할인</span>
                <span>최대 할인(기록)</span>
                <span>최저(기록)</span>
                <span>최고(기록)</span>
                <span>기록 수</span>
              </div>
              <ul className="divide-y divide-line-soft">
                {series.map((s) => {
                  const prices = s.points.map((p) => p.price);
                  const onSale = Boolean(s.discountPct && s.discountPct > 0);
                  const top = bestDiscountOf(s.points);
                  return (
                    <li key={s.platform} className={`${COLS} text-[13px] text-ink`}>
                      <span className="font-semibold">{PLATFORM_LABEL[s.platform] ?? s.platform}</span>
                      <span>{formatPrice(s.currentPrice, s.currency)}</span>
                      <span className={onSale ? "text-ok" : "text-dim"}>{onSale ? formatDiscount(s.discountPct) : "-"}</span>
                      <span className={top ? "text-mut" : "text-dim"}>
                        {top ? formatDiscount(top.discountPct) : "-"}
                      </span>
                      <span>{formatPrice(Math.min(...prices), s.currency)}</span>
                      <span className="text-mut">{formatPrice(Math.max(...prices), s.currency)}</span>
                      <span className="text-dim">
                        {s.points.length}건 <span className="text-[11.5px]">({formatDate(s.points[s.points.length - 1].t)})</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </section>
        </>
      )}
    </Page>
  );
}
