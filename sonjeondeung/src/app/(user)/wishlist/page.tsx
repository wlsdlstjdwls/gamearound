// /wishlist — 찜한 게임 목록 (§5.1 dynamic, 캐시 안 함)
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { formatDiscount, formatKrw, PLATFORM_LABEL } from "@/lib/format";
import { getFreshness, FRESHNESS_LABEL } from "@/lib/freshness";
import { listWishlist } from "@/server/services/wishlist";
import { WishlistRemoveButton } from "@/components/wishlist-button";

export const metadata: Metadata = { title: "위시리스트" };

export default async function WishlistPage() {
  const items = await listWishlist();

  return (
    <section className="space-y-4">
      <header className="flex items-end justify-between">
        <h1 className="text-xl font-bold">위시리스트</h1>
        <p className="text-sm text-slate-400">{items.length}개</p>
      </header>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-800 p-10 text-center text-slate-400">
          아직 찜한 게임이 없습니다. <Link href="/" className="text-amber-300 hover:underline">게임 찾아보기</Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map(({ game }) => {
            const priced = game.platforms.filter((p) => p.currentPrice !== null);
            const lowest = priced.length > 0 ? Math.min(...priced.map((p) => p.currentPrice as number)) : null;
            const title = game.titleKo ?? game.titleEn;
            return (
              <li key={game.id} className="flex gap-4 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                <Link href={`/games/${game.slug}`} className="shrink-0">
                  {game.coverUrl ? (
                    <Image
                      src={game.coverUrl}
                      alt={title}
                      width={120}
                      height={56}
                      unoptimized
                      className="h-14 w-[120px] rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-[120px] items-center justify-center rounded bg-slate-800 text-xs text-slate-500">
                      이미지 없음
                    </div>
                  )}
                </Link>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/games/${game.slug}`} className="truncate font-semibold hover:text-amber-300">
                      {title}
                    </Link>
                    <WishlistRemoveButton gameId={game.id} />
                  </div>
                  {game.platforms.length === 0 ? (
                    <p className="text-xs text-slate-500">플랫폼 가격 정보 없음</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {game.platforms.map((p) => {
                        const fresh = getFreshness(p.lastSyncedAt, p.syncStatus);
                        const isLowest = lowest !== null && p.currentPrice === lowest;
                        return (
                          <li key={p.id} className="flex items-center gap-2">
                            <span className="w-16 shrink-0 text-slate-400">{PLATFORM_LABEL[p.platform] ?? p.platform}</span>
                            <span className={isLowest ? "font-semibold text-amber-300" : ""}>{formatKrw(p.currentPrice)}</span>
                            {p.discountPct ? (
                              <span className="rounded bg-emerald-900/60 px-1.5 py-0.5 text-xs text-emerald-300">
                                {formatDiscount(p.discountPct)}
                              </span>
                            ) : null}
                            {isLowest && priced.length > 1 && <span className="text-xs text-amber-400">최저가</span>}
                            {fresh !== "fresh" && <span className="text-xs text-slate-500">{FRESHNESS_LABEL[fresh]}</span>}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <div className="text-xs">
                    <Link href={`/alerts?game=${encodeURIComponent(game.slug)}`} className="text-slate-400 hover:text-amber-300">
                      할인 알림 만들기 →
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
