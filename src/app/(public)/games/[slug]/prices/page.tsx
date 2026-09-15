// 가격 그래프 — 최근 1년 price_snapshots → 클라이언트 차트에 JSON prop (§5.1)
// 가격은 "값이 바뀐 시점"만 기록되므로 기록이 적은 게임은 그래프가 거의 평평하다. 대신 현재 할인, 행사 기간을 함께 보여준다.
import { cheapestOf, formatPrice } from "@/lib/currency";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PriceChart } from "@/components/price-chart";
import { SaleBadge } from "@/components/sale-badge";
import { Card, Page, SectionHead } from "@/components/ui/page";
import { formatDate, formatDiscount, PLATFORM_LABEL } from "@/lib/format";
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
  const game = await getGameBySlugCached(slug);
  if (!game) notFound();

  const series = await getPriceHistory(slug, { days: 365 });
  const title = displayTitle(game);
  const best = bestDeal(series);

  return (
    <Page gap={20}>
      <nav aria-label="브레드크럼">
        <Link href={`/games/${game.slug}`} className="text-[12.5px] text-dim transition-colors hover:text-ink">
          {title} 상세로
        </Link>
      </nav>

      <h1 className="text-2xl font-bold tracking-[-0.03em] text-ink">가격 변동 | 최근 1년</h1>

      {series.length === 0 ? (
        <EmptyState
          title="아직 가격 이력이 없습니다"
          description="가격은 값이 바뀔 때만 기록됩니다. 수집이 누적되면 그래프가 표시됩니다."
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
              <div className="text-right">
                <p className="text-[11.5px] text-dim">기록 기준 최저가</p>
                <p className="text-[15px] font-bold text-ink">
                  {formatPrice(lowestOf(best), best.currency)}
                  {best.currentPrice === lowestOf(best) && <span className="ml-1 text-[12px] font-normal text-acc">현재가와 동일</span>}
                </p>
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
                <span>최저(기록)</span>
                <span>최고(기록)</span>
                <span>기록 수</span>
              </div>
              <ul className="divide-y divide-line-soft">
                {series.map((s) => {
                  const prices = s.points.map((p) => p.price);
                  const onSale = Boolean(s.discountPct && s.discountPct > 0);
                  return (
                    <li key={s.platform} className={`${COLS} text-[13px] text-ink`}>
                      <span className="font-semibold">{PLATFORM_LABEL[s.platform] ?? s.platform}</span>
                      <span>{formatPrice(s.currentPrice, s.currency)}</span>
                      <span className={onSale ? "text-acc" : "text-dim"}>{onSale ? formatDiscount(s.discountPct) : "-"}</span>
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
