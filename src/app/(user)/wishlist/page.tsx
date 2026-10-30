// /wishlist — 찜한 게임 목록 (§5.1 dynamic, 캐시 안 함)
// 리디자인: 기본 정렬은 할인순 — 찜 목록의 용건은 "지금 사도 되는가"다.
//
// 2026-10-27(사용자): 줄에서 카드로("게임 목록이 카드 형태가 아니네"), 할인 알림 단추를 누르고 싶게, 정렬 이름 "할인 중 먼저" 를 "할인순" 으로,
// 고른 정렬은 다음 접속에도 남는다(lib/prefs). 정렬 단추는 둘 다 주소에 값을 명시한다 — 빈 주소는 기억한 정렬로 연다.
// 2026-10-29: 인디 게임 찜도 아래 칸에 선다(components/wishlist/indie-wishes). 정렬은 가격이 있는 게임 칸에만 건다.
import { cheapestOf, formatPrice } from "@/lib/currency";
import type { Metadata } from "next";
import Link from "next/link";
import { DiscountBadge } from "@/components/ui/discount";
import { EmptyState } from "@/components/empty-state";
import { WishlistRemoveButton } from "@/components/wishlist-button";
import { FadeImage } from "@/components/ui/fade-image";
import { ImageFallback } from "@/components/ui/image-fallback";
import { Page, PageHead, SectionHead } from "@/components/ui/page";
import { Clamp } from "@/components/ui/tooltip";
import { PLATFORM_LABEL } from "@/lib/format";
import { DEVICE_LABEL, DEVICES, deviceOf } from "@/lib/platform";
import { gamesHref } from "@/lib/games-query";
import { collectedAtText, getFreshness } from "@/lib/freshness";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import { listWishlist, type WishlistItem } from "@/server/services/wishlist";
import { getCurrentUser } from "@/server/services/users";
import { listAlerts } from "@/server/services/alerts";
import { listMyIndieWishes } from "@/server/services/indie";
import { IndieWishes } from "@/components/wishlist/indie-wishes";
import { StoreMore, type StoreMoreRow } from "@/components/wishlist/store-more";
import { NavChip, NavPendingScope, PendingRegion } from "@/components/ui/nav-pending";
import { BellIcon } from "@/components/ui/icons";
import { RememberPref } from "@/components/remember-pref";
import { PREF_COOKIES, readPref } from "@/lib/prefs";
import { cookies } from "next/headers";
import { cn } from "@/lib/cn";
import { WISHLIST_MESSAGES } from "@/lib/wishlist/messages";

export const metadata: Metadata = { title: WISHLIST_MESSAGES.title };

const SORTS = [
  { key: "sale", label: "할인순" },
  { key: "added", label: "추가순" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];

// 알림 단추는 걸린 알림을 안다(2026-10-27, 사용자). 이미 건 게임에 "만들기" 를 내밀면 안 걸린 줄 알고 또 만든다.
// 누르면 어느 쪽이든 같은 ?game= 폼으로 간다 — 그 폼이 있는 알림을 고치기로 연다.
const ALERT_STATE = {
  none: "할인 알림 만들기",
  on: "알림 받는 중",
  paused: "알림 멈춤",
} as const;
type AlertState = keyof typeof ALERT_STATE;
const SORT_KEYS: readonly SortKey[] = SORTS.map((s) => s.key);

type Props = { searchParams: Promise<{ sort?: string | string[] }> };

/** 주소에 명시된 정렬. 없거나 모르는 값이면 undefined — 그때는 기억한 정렬을 쓴다 */
function readSortParam(v: string | string[] | undefined): SortKey | undefined {
  return readPref(Array.isArray(v) ? v[0] : v, SORT_KEYS);
}

function maxDiscount(item: WishlistItem): number {
  return Math.max(0, ...item.game.platforms.map((p) => p.discountPct ?? 0));
}

function isOnSale(item: WishlistItem): boolean {
  return maxDiscount(item) > 0;
}

export default async function WishlistPage({ searchParams }: Props) {
  const explicit = readSortParam((await searchParams).sort);
  const sort: SortKey = explicit ?? readPref((await cookies()).get(PREF_COOKIES.wishlistSort)?.value, SORT_KEYS) ?? "sale";
  // 세 질의는 서로 기다릴 일이 없어 나란히 묻는다(Neon 왕복은 줄 세운 수가 속도를 정한다)
  // 사용자는 레이아웃이 이미 읽었다(요청 안에서 한 번만 묻는다) — 줄에 끼워도 왕복이 늘지 않는다
  const [items, alerts, indie, me] = await Promise.all([listWishlist(), listAlerts(), listMyIndieWishes(), getCurrentUser()]);
  // 찜 할인 알림이 켜져 있나(sync/dispatch-wish-alerts). 머리 한 줄이 "할인하면 알려 드려요" 를 말할지 정한다
  const saleAlerts = me?.wishSaleAlertsOffAt === null;
  // 한 게임에 플랫폼별 알림이 여럿일 수 있다 — 하나라도 켜져 있으면 받는 중
  const alertState = new Map<string, AlertState>();
  for (const a of alerts) {
    if (a.isActive) alertState.set(a.gameId, "on");
    else if (!alertState.has(a.gameId)) alertState.set(a.gameId, "paused");
  }
  const onSaleCount = items.filter(isOnSale).length;
  // listWishlist 는 추가순(최근 먼저)으로 온다 — "할인 중 먼저"만 화면에서 다시 정렬한다
  const sorted = sort === "added" ? items : [...items].sort((a, b) => maxDiscount(b) - maxDiscount(a));

  return (
    <Page gap={26}>
      <RememberPref name={PREF_COOKIES.wishlistSort} value={explicit} />
      <NavPendingScope>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <PageHead title={WISHLIST_MESSAGES.title} />
          <p className="mt-1.5 text-[13.5px] text-mut">
            {items.length}개 중 <span className="font-bold text-acc">{onSaleCount}개가 지금 할인 중</span>이에요.{" "}
            {saleAlerts ? WISHLIST_MESSAGES.saleAlertsOn : WISHLIST_MESSAGES.saleAlertsOff}{" "}
            <Link href={ROUTES.alerts} className="font-semibold text-ink-2 underline-offset-2 hover:text-acc hover:underline">
              {WISHLIST_MESSAGES.saleAlertsLink}
            </Link>
          </p>
        </div>
        <div role="group" aria-label="정렬" className="flex shrink-0 gap-1.5">
          {SORTS.map((s) => (
            <NavChip key={s.key} group="sort" href={`${ROUTES.wishlist}?sort=${s.key}`} active={s.key === sort}>
              {s.label}
            </NavChip>
          ))}
        </div>
      </header>

      <PendingRegion className="flex flex-col gap-4">
      <SectionHead title={WISHLIST_MESSAGES.gamesSection} note={items.length > 0 ? `${items.length}개` : undefined} size="sub" />
      {items.length === 0 ? (
        <EmptyState
          title="아직 찜한 게임이 없어요"
          description="게임 상세에서 찜하면 할인 소식을 이 자리에서 먼저 보여 드려요."
          // 단추 이름대로 할인 중인 게임만 걸러 연다(게임 탐색 > 할인 게임 칸과 같은 sale=1). 전체 목록으로 가면 이름과 딴 화면이다
          action={{ href: gamesHref({}, { onSale: true }), label: "할인 목록 보기" }}
        />
      ) : (
        // min(): 화면이 칸보다 좁아도 칸이 줄어야 한다. 안 씌우면 360px 기기에서 카드가 화면 밖으로 나간다
        // 좁은 화면은 한 줄 가로 카드(커버 왼쪽)다(2026-10-28 사용자 "불필요한 스크롤"). 세로 카드면 다섯 개에 2,000px 을 내려야 했다
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(min(270px,100%),1fr))] sm:gap-5">
          {sorted.map(({ game }, i) => {
            // "최저" 표시는 같은 통화끼리만 뜻이 있다 — 기준을 lib/currency 한 곳에서만 정한다
            const cheapest = cheapestOf(game.platforms);
            // "최저가" 는 기기 줄끼리 비교할 때만 뜻이 있다 — 값 있는 기기가 하나뿐이면 붙이지 않는다
            const pricedCount = new Set(game.platforms.filter((p) => p.currentPrice !== null).map((p) => deviceOf(p.platform))).size;
            const title = game.titleKo ?? game.titleEn;
            const stalest = game.platforms.find((p) => getFreshness(p.lastSyncedAt, p.syncStatus) !== "fresh");
            const alert = alertState.get(game.id) ?? "none";

            return (
              // 카드(2026-10-27). 게임 목록 카드처럼 흰 판 위 커버가 먼저 서고, 값 줄과 알림 단추가 아래에 앉는다
              // 커버는 다른 카드(game-card 의 CARD_SHELL, COVER_CLASS)처럼 판 안쪽에 둥글게 앉힌다(2026-10-28 사용자 "찜 카드만 이미지 형태가 달라 이상하다").
              // 판 끝까지 붙어 모서리만 잘리던 모양이 홈, 목록 카드와 달랐다
              <li key={game.id} className="enter-item lift group flex gap-3 overflow-hidden p-2 sm:flex-col sm:gap-1 sm:p-2.5 rounded-[var(--radius-panel)] bg-surface shadow-[var(--elev-card)] transition-shadow duration-base hover:shadow-[var(--elev-card-hover)]" style={stagger(i)}>
                <Link href={`/games/${game.slug}`} className="cover-zoom relative block min-h-[96px] w-[108px] shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-surface-3 shadow-hair sm:w-auto" tabIndex={-1} aria-hidden>
                  {game.coverUrl ? (
                    <FadeImage
                      src={game.coverUrl}
                      alt=""
                      width={460}
                      height={215}
                      unoptimized
                      className="cover-zoom-img absolute inset-0 h-full w-full object-cover sm:static sm:aspect-[460/215] sm:h-auto"
                      fallback={<ImageFallback label="" className="absolute inset-0 h-full w-full sm:static sm:aspect-[460/215] sm:h-auto" />}
                    />
                  ) : (
                    <ImageFallback label="" className="absolute inset-0 h-full w-full sm:static sm:aspect-[460/215] sm:h-auto" />
                  )}
                </Link>

                <div className="flex min-w-0 flex-1 flex-col gap-2 py-1 pr-1 sm:gap-2.5 sm:px-1.5 sm:pb-1 sm:pt-2">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/games/${game.slug}`} className="min-w-0 text-[15px] font-extrabold tracking-[-0.025em] text-ink hover:text-acc">
                      <Clamp>{title}</Clamp>
                    </Link>
                    <WishlistRemoveButton gameId={game.id} title={title} />
                  </div>

                  {/* 플랫폼 줄은 게임과 상관없이 기기 갈래 넷(DEVICES)을 같은 순서로 세운다(2026-10-30 사용자 "카드 높이가 다르다").
                      파는 플랫폼만 그리면 줄 수가 게임마다 달라 카드 키가 들쭉날쭉하다. 스토어 일곱 줄 대신 기기 넷으로 묶은 이유는
                      찜 카드의 질문이 "내 기기로 얼마인가" 라서다(같은 사용자 지시). 한 기기에 스토어가 여럿이면 가장 싼 줄을 대표로 쓰고
                      스토어 이름을 작게 붙인다 — 스토어별 값 비교는 상세 가격표가 한다 */}
                  <ul className="flex flex-col gap-1 text-[12.5px]">
                    {DEVICES.map((d) => {
                      const rows = game.platforms.filter((row) => deviceOf(row.platform) === d);
                      const p = cheapestOf(rows) ?? rows[0];
                      const isLowest = p !== undefined && p === cheapest;
                      // 그 기기를 파는 스토어가 둘 이상이면 "+1" 을 붙이고 스토어별 값은 말풍선에 둔다(components/wishlist/store-more).
                      // 줄에 스토어 이름을 적던 때는 칸이 좁아 "Stea..." 로 잘렸고, Epic 에서도 파는 게임이 Steam 전용으로 읽혔다(2026-10-30 사용자)
                      const others = p ? rows.filter((row) => row !== p) : [];
                      // 싼 순서로 세운다. 값이 없는 스토어(가격 확인 중)는 맨 뒤로 간다
                      const storeRows: StoreMoreRow[] = p
                        ? [p, ...others.sort((a, b) => (a.currentPrice ?? Infinity) - (b.currentPrice ?? Infinity))].map((row) => ({
                            store: PLATFORM_LABEL[row.platform] ?? row.platform,
                            price: formatPrice(row.currentPrice, row.currency),
                            lowest: row === p,
                          }))
                        : [];
                      return (
                        // 칸이 270px 까지 좁아져 "최저가" 낱말이 한 줄에 같이 못 선다 — 최저가는 낱말 대신 파랑 굵은 값으로 말한다
                        <li key={d} className="flex min-w-0 items-baseline gap-1.5 whitespace-nowrap">
                          <span className="w-[96px] shrink-0 whitespace-nowrap text-dim">{DEVICE_LABEL[d]}</span>
                          {p ? (
                            <>
                              <span className={cn("relative shrink-0", isLowest && pricedCount > 1 ? "font-bold text-acc" : "text-ink")}>
                                {formatPrice(p.currentPrice, p.currency)}
                                {isLowest && pricedCount > 1 && <span className="sr-only"> 최저가</span>}
                              </span>
                              <DiscountBadge pct={p.discountPct} size="sm" />
                              {storeRows.length > 1 && <StoreMore device={DEVICE_LABEL[d]} rows={storeRows} />}
                            </>
                          ) : (
                            <span className="text-dim">{WISHLIST_MESSAGES.platformMissing}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  {/* 오래된 값 알림도 자리를 늘 잡아 둔다 — 있는 카드만 한 줄 길어지면 높이가 다시 갈린다 */}
                  <p className={cn("text-[12px] text-warn", !stalest && "invisible")} aria-hidden={!stalest}>
                    {stalest ? `${collectedAtText(stalest.lastSyncedAt)} | 스토어에서 확인 권장` : WISHLIST_MESSAGES.platformMissing}
                  </p>
                  {/* 누르고 싶은 단추로(2026-10-27, 사용자). 카드 바닥 전체 폭, 파랑 면 위 종 — 누르면 채운 파랑으로 바뀐다.
                      받는 중이면 처음부터 채운 파랑, 멈춤이면 회색 테두리라 세 상태가 한눈에 갈린다 */}
                  <Link
                    href={`${ROUTES.alerts}?game=${encodeURIComponent(game.slug)}`}
                    data-alert={alert}
                    className={cn(
                      "press group/alert mt-auto inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-[var(--radius-sm)] text-[14px] font-bold transition-colors duration-base",
                      alert === "on" && "bg-acc text-on-ink hover:opacity-90",
                      alert === "paused" && "border border-line bg-surface text-mut hover:border-acc hover:text-acc",
                      alert === "none" && "bg-acc-soft text-acc hover:bg-acc hover:text-on-ink",
                    )}
                  >
                    <BellIcon size={16} className="transition-transform duration-base group-hover/alert:-rotate-12" />
                    {ALERT_STATE[alert]}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      </PendingRegion>
      </NavPendingScope>
      <IndieWishes items={indie} />
    </Page>
  );
}
