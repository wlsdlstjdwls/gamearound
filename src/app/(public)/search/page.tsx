// 검색 결과 — searchParams(q, sort) 처리 (§5.1). Route Handler 불필요.
// 리디자인: 카드 그리드 → 가로 행 리스트. 제목, 플랫폼, 가격을 같은 축에서 비교할 수 있다.
import { formatPrice } from "@/lib/currency";
import type { Metadata } from "next";
import Link from "next/link";
import { CoverImage } from "@/components/game-card";
import { EmptyState } from "@/components/empty-state";
import { PlatformBadges } from "@/components/platform-badges";
import { Page, PageHead, ROW, ROWS } from "@/components/ui/page";
import { chipClass } from "@/components/ui/chip";
import { cn } from "@/lib/cn";
import { formatDate, formatDiscount } from "@/lib/format";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import { searchGames, type GameSummary } from "@/server/services/games";
import { MAX_PARAM_LEN } from "@/lib/games-query";

// Next 가 정적으로 읽는 값이라 리터럴이어야 한다 — 근거, 수치는 lib/cache 의 LIST_REVALIDATE_SECONDS 와 같게 유지
export const revalidate = 3600;

type Props = { searchParams: Promise<{ q?: string | string[]; sort?: string | string[] }> };

const SORTS = [
  { key: "relevance", label: "관련도순" },
  { key: "discount", label: "할인율순" },
  { key: "price", label: "가격순" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];

function readOne(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v ?? "").trim();
}
function readQuery(q: string | string[] | undefined): string {
  return readOne(q).slice(0, MAX_PARAM_LEN);
}
function readSort(v: string | string[] | undefined): SortKey {
  const s = readOne(v);
  return SORTS.some((x) => x.key === s) ? (s as SortKey) : "relevance";
}

/** 관련도순은 서비스가 준 순서를 그대로 쓴다. 나머지는 화면에서만 다시 정렬한다(질의는 그대로) */
function sortResults(items: GameSummary[], sort: SortKey): GameSummary[] {
  if (sort === "relevance") return items;
  const copy = [...items];
  if (sort === "discount") return copy.sort((a, b) => (b.best?.discountPct ?? 0) - (a.best?.discountPct ?? 0));
  return copy.sort((a, b) => (a.best?.currentPrice ?? Infinity) - (b.best?.currentPrice ?? Infinity));
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = readQuery((await searchParams).q);
  return { title: q ? `"${q}" 검색 결과` : "검색" };
}

function ReportBlock({ q }: { q: string }) {
  return (
    <EmptyState
      title="찾는 게임이 없나요?"
      description="제목의 일부만 넣거나 영문 제목으로 다시 검색해 보세요."
      action={{ href: `${ROUTES.game}?q=${encodeURIComponent(q)}`, label: "전체 목록에서 찾기" }}
    />
  );
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = readQuery(sp.q);
  const sort = readSort(sp.sort);

  if (!q) {
    return (
      <Page gap={20}>
        <PageHead title="검색" />
        <EmptyState
          title="검색어를 입력하세요"
          description="위 검색창에 게임 제목(한글 또는 영문)을 입력하면 결과가 바로 따라와요."
          action={{ href: ROUTES.game, label: "전체 게임 목록 보기" }}
        />
      </Page>
    );
  }

  const results = sortResults(await searchGames(q), sort);

  return (
    <Page gap={20}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2">
        <PageHead
          title={<>&ldquo;{q}&rdquo; 검색 결과</>}
          note={
            <span aria-live="polite">{results.length}건</span>
          }
        />
        <div role="group" aria-label="정렬" className="flex gap-1">
          {SORTS.map((s) => (
            <Link
              key={s.key}
              href={`${ROUTES.search}?q=${encodeURIComponent(q)}&sort=${s.key}`}
              aria-current={s.key === sort ? "true" : undefined}
              className={chipClass({ active: s.key === sort })}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {results.length === 0 ? (
        <ReportBlock q={q} />
      ) : (
        <>
          <ul className={ROWS}>
              {results.map((g, i) => {
                const title = g.titleKo ?? g.titleEn;
                const best = g.best;
                const hasDiscount = Boolean(best?.discountPct && best.discountPct > 0);
                return (
                  <li key={g.slug} className="enter-item" style={stagger(i)}>
                    <Link href={`/games/${g.slug}`} className={cn(ROW, "flex flex-wrap items-center gap-4 py-3.5")}>
                      <div className="relative aspect-[460/215] w-24 shrink-0 overflow-hidden rounded-[var(--radius-inset)] bg-surface-3">
                        <CoverImage src={g.coverUrl} alt={`${title} 커버`} sizes="96px" />
                      </div>
                      <div className="min-w-[180px] flex-1">
                        <p className="text-[14.5px] font-bold tracking-[-0.01em] text-ink">{title}</p>
                        <p className="mt-0.5 text-[12px] text-dim">
                          {g.titleKo ? `${g.titleEn} | ` : ""}
                          {best?.releaseDate ? `${formatDate(best.releaseDate)} 출시` : "출시일 미상"}
                        </p>
                        <div className="mt-1.5">
                          <PlatformBadges platforms={g.platforms} />
                        </div>
                      </div>
                      <div className="ml-auto text-right">
                        <p className="text-[17px] font-bold tracking-[-0.02em] text-ink">{formatPrice(best?.currentPrice, best?.currency)}</p>
                        <p className="mt-0.5 text-[12px] text-dim">
                          {hasDiscount && best ? (
                            <>
                              <span className="text-dim-2 line-through">{formatPrice(best.listPrice, best.currency)}</span>
                              {" | "}
                              {formatDiscount(best.discountPct)}
                            </>
                          ) : (
                            "할인 없음"
                          )}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
          </ul>
          <ReportBlock q={q} />
        </>
      )}
    </Page>
  );
}
