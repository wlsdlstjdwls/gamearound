// /wishlist — 찜한 게임 목록 (§5.1 dynamic, 캐시 안 함)
// 리디자인: 기본 정렬은 "할인 중 먼저" — 찜 목록의 용건은 "지금 사도 되는가"다.
import { cheapestOf, formatPrice } from "@/lib/currency";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { WishlistRemoveButton } from "@/components/wishlist-button";
import { FadeImage } from "@/components/ui/fade-image";
import { ImageFallback } from "@/components/ui/image-fallback";
import { Page, PageHead } from "@/components/ui/page";
import { Clamp } from "@/components/ui/tooltip";
import { formatDiscount, PLATFORM_LABEL } from "@/lib/format";
import { collectedAtText, getFreshness } from "@/lib/freshness";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import { ChipLink } from "@/components/ui/chip";
import { listWishlist, type WishlistItem } from "@/server/services/wishlist";
import { cardClass } from "@/components/ui/page";

export const metadata: Metadata = { title: "위시리스트" };

const SORTS = [
  { key: "sale", label: "할인 중 먼저" },
  { key: "added", label: "추가순" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];

type Props = { searchParams: Promise<{ sort?: string | string[] }> };

function readSort(v: string | string[] | undefined): SortKey {
  const s = Array.isArray(v) ? v[0] : v;
  return s === "added" ? "added" : "sale";
}

function maxDiscount(item: WishlistItem): number {
  return Math.max(0, ...item.game.platforms.map((p) => p.discountPct ?? 0));
}

function isOnSale(item: WishlistItem): boolean {
  return maxDiscount(item) > 0;
}

export default async function WishlistPage({ searchParams }: Props) {
  const sort = readSort((await searchParams).sort);
  const items = await listWishlist();
  const onSaleCount = items.filter(isOnSale).length;
  // listWishlist 는 추가순(최근 먼저)으로 온다 — "할인 중 먼저"만 화면에서 다시 정렬한다
  const sorted = sort === "added" ? items : [...items].sort((a, b) => maxDiscount(b) - maxDiscount(a));

  return (
    <Page gap={20}>
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <PageHead title="위시리스트" />
          <p className="mt-1 text-[13px] text-mut">
            {items.length}개 중 <span className="font-semibold text-ok">{onSaleCount}개가 지금 할인 중</span>입니다.
          </p>
        </div>
        <div role="group" aria-label="정렬" className="flex gap-1">
          {SORTS.map((s) => (
            <ChipLink
              key={s.key}
              href={s.key === "sale" ? ROUTES.wishlist : `${ROUTES.wishlist}?sort=${s.key}`}
              active={s.key === sort}
            >
              {s.label}
            </ChipLink>
          ))}
        </div>
      </header>

      {items.length === 0 ? (
        <EmptyState
          title="아직 찜한 게임이 없습니다"
          description="게임 상세에서 위시리스트에 담으면 할인 시작 시 이 자리에서 먼저 보여 드립니다."
          action={{ href: ROUTES.game, label: "할인 목록 보기" }}
        />
      ) : (
        // min(): 화면이 330px 보다 좁아도 칸이 줄어야 한다. 안 씌우면 360px 기기에서 카드가 화면 밖으로 나간다
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(330px,100%),1fr))] gap-4">
          {sorted.map(({ game }, i) => {
            // "최저" 표시는 같은 통화끼리만 뜻이 있다 — 기준을 lib/currency 한 곳에서만 정한다
            const cheapest = cheapestOf(game.platforms);
            const pricedCount = game.platforms.filter((p) => p.currentPrice !== null).length;
            const title = game.titleKo ?? game.titleEn;
            const stalest = game.platforms.find((p) => getFreshness(p.lastSyncedAt, p.syncStatus) !== "fresh");

            return (
              <li key={game.id} className={cardClass("enter-item flex gap-3.5 p-4")} style={stagger(i)}>
                <Link href={`/games/${game.slug}`} className="shrink-0">
                  {game.coverUrl ? (
                    <FadeImage
                      src={game.coverUrl}
                      alt={title}
                      width={104}
                      height={60}
                      unoptimized
                      className="h-[60px] w-[104px] rounded-lg object-cover"
                      fallback={<ImageFallback label="" className="h-[60px] w-[104px] rounded-lg" />}
                    />
                  ) : (
                    <ImageFallback label="" className="h-[60px] w-[104px] rounded-lg" />
                  )}
                </Link>

                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/games/${game.slug}`} className="min-w-0 text-[14.5px] font-bold tracking-[-0.01em] text-ink hover:text-acc">
                      <Clamp>{title}</Clamp>
                    </Link>
                    <WishlistRemoveButton gameId={game.id} />
                  </div>

                  {game.platforms.length === 0 ? (
                    <p className="text-[12px] text-dim">플랫폼 가격 정보 없음</p>
                  ) : (
                    <ul className="flex flex-col gap-1 text-[12.5px]">
                      {game.platforms.map((p) => {
                        const isLowest = cheapest !== null && p.platform === cheapest.platform;
                        return (
                          <li key={p.id} className="flex items-baseline gap-2">
                            <span className="w-[52px] shrink-0 text-dim">{PLATFORM_LABEL[p.platform] ?? p.platform}</span>
                            <span className={isLowest ? "font-bold text-ink" : "text-ink"}>{formatPrice(p.currentPrice, p.currency)}</span>
                            {p.discountPct ? (
                              <span className="rounded-[5px] bg-surface-2 px-1.5 py-px text-[11px] text-ink-2">{formatDiscount(p.discountPct)}</span>
                            ) : null}
                            {isLowest && pricedCount > 1 && <span className="font-semibold text-ok">최저가</span>}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <p className="mt-auto text-[12px]">
                    {stalest ? (
                      <span className="text-warn">{collectedAtText(stalest.lastSyncedAt)} | 스토어에서 확인 권장</span>
                    ) : (
                      <Link href={`${ROUTES.alerts}?game=${encodeURIComponent(game.slug)}`} className="text-acc hover:underline">
                        할인 알림 만들기
                      </Link>
                    )}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Page>
  );
}
