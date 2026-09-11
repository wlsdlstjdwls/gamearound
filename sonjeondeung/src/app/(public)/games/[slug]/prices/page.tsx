// 가격 그래프 — 최근 1년 price_snapshots → 클라이언트 차트에 JSON prop (§5.1)
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PriceChart } from "@/components/price-chart";
import { formatDate, formatKrw, PLATFORM_LABEL } from "@/lib/format";
import { displayTitle, getGameBySlugCached } from "@/server/services/games";
import { getPriceHistory } from "@/server/services/prices";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGameBySlugCached(slug);
  if (!game) return { title: "게임을 찾을 수 없음" };
  return { title: `${displayTitle(game)} 가격 변동`, description: `${displayTitle(game)}의 최근 1년 플랫폼별 가격 변동 그래프` };
}

export default async function PricesPage({ params }: Props) {
  const { slug } = await params;
  const game = await getGameBySlugCached(slug);
  if (!game) notFound();

  const series = await getPriceHistory(slug, { days: 365 });
  const title = displayTitle(game);

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
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 sm:p-4">
            <PriceChart series={series} />
          </div>

          {/* 표 뷰(접근성 보조): 플랫폼별 최저/최고/최근 */}
          <section aria-labelledby="summary-heading" className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 id="summary-heading" className="mb-2 text-sm font-semibold text-slate-300">
              플랫폼별 요약
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-slate-500">
                  <tr>
                    <th scope="col" className="py-1 pr-3 font-medium">플랫폼</th>
                    <th scope="col" className="py-1 pr-3 font-medium">최저가</th>
                    <th scope="col" className="py-1 pr-3 font-medium">최고가</th>
                    <th scope="col" className="py-1 pr-3 font-medium">최근 기록</th>
                    <th scope="col" className="py-1 font-medium">기록 수</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {series.map((s) => {
                    const prices = s.points.map((p) => p.price);
                    const last = s.points[s.points.length - 1];
                    return (
                      <tr key={s.platform}>
                        <th scope="row" className="py-1.5 pr-3 text-left font-medium text-slate-200">
                          {PLATFORM_LABEL[s.platform] ?? s.platform}
                        </th>
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

      <p className="text-xs text-slate-500">가격은 각 스토어에서 주기적으로 수집되며 실시간이 아닙니다. 값이 변경된 시점만 기록됩니다.</p>
    </div>
  );
}
