// /shops — 매장 찾기. 설계서 §11 "공개, 유입".
//
// 캐시를 걸지 않는다(서비스의 listActiveShops 주석). 승인 직후 매장주가 자기 페이지를 보러 오는데
// 목록에 없는 화면을 보여 주는 것이 캐시로 아끼는 왕복 하나보다 비싸다.
//
// 거리순이 아니라 이름순인 이유는 SHOP_DIRECTORY_MESSAGES 주석에 있다 — 좌표를 아직 안 받는다.
import { DbUnavailable } from "@/components/db-unavailable";
import { DB_DOWN, orDbDown } from "@/lib/db-errors";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { CtaTile } from "@/components/ui/cta-tile";
import { Page, PageHead } from "@/components/ui/page";
import { Clamp } from "@/components/ui/tooltip";
import { buttonClass } from "@/components/ui/button";
import { stagger } from "@/lib/motion";
import { ROUTES, shopPath } from "@/lib/routes";
import { firstParam } from "@/lib/games-query";
import { SHOP_DIRECTORY_MESSAGES as M } from "@/lib/shops/messages";
import { listActiveShops, type ShopPublic } from "@/server/services/shops";
import { NavPendingScope, PendingRegion } from "@/components/ui/nav-pending";

export const metadata: Metadata = { title: M.title, description: M.lead };

type Search = Record<string, string | string[] | undefined>;
type Props = { searchParams: Promise<Search> };

/** 현재 조건에서 쪽만 바꾼 /shops 주소. 기본값은 빼서 같은 화면이 같은 주소가 되게 한다 */
function shopsHref(q: string | undefined, page: number): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${ROUTES.shops}?${qs}` : ROUTES.shops;
}

/** 카드 둘째 줄. 온라인 전용과 주소 없음은 빈칸이 아니라 그 사실을 적는다 */
function whereLine(shop: ShopPublic): string {
  if (shop.addressType === "online_only") return M.onlineOnly;
  if (!shop.address) return M.noAddress;
  return shop.addressDetail ? `${shop.address} ${shop.addressDetail}` : shop.address;
}

export default async function ShopsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = firstParam(sp.q)?.trim() || undefined;
  const pageNum = Math.max(Number(firstParam(sp.page)) || 1, 1);
  const loaded = await orDbDown(listActiveShops(q, pageNum));
  // DB 가 안 열린 날: 제목은 세우고 목록 자리에만 안내를 둔다(components/db-unavailable)
  if (loaded === DB_DOWN) {
    return (
      <Page gap={26}>
        <PageHead title={M.title} />
        <DbUnavailable retryHref={ROUTES.shops} />
      </Page>
    );
  }
  const result = loaded;

  return (
    <Page gap={26}>
      <NavPendingScope>
      {/* 검색칸이 제목 행 오른쪽에 붙는다 — 이 화면에서 할 일이 그것 하나라서다.
          검색은 서버 액션이 아니라 GET 이다: 찾은 화면의 주소가 그대로 남아야 공유되고 뒤로 가기가 산다 */}
      <PageHead
        title={M.title}
        note={result.total > 0 ? `${result.total}${M.countSuffix}` : undefined}
        action={
          <form action={ROUTES.shops} method="get" className="flex flex-wrap items-center gap-2">
        <label htmlFor="shop-q" className="sr-only">
          {M.searchLabel}
        </label>
        <input
          id="shop-q"
          name="q"
          defaultValue={q ?? ""}
          placeholder={M.searchPlaceholder}
          // 16px 미만이면 iOS 가 화면을 확대한다(AGENTS §6)
          className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3.5 text-[16px] text-ink placeholder:text-dim focus-visible:border-acc focus-visible:outline-none sm:w-[220px] sm:flex-none"
        />
            <button type="submit" className={buttonClass({ variant: "primary" })}>
              {M.searchSubmit}
            </button>
          </form>
        }
      />

      {/* 검색어로 거른 화면이 비면 그 사실을 말한다. 거르지 않은 화면은 비어도 입점 칸이 격자에 선다 —
          "아직 없어요" 판 하나보다 첫 매장이 설 자리를 보여 주는 편이 매장주에게 다음 행동을 준다 */}
      <PendingRegion>
      {q && result.items.length === 0 ? (
        <EmptyState title={M.empty} action={{ href: ROUTES.business, label: M.emptyAction }} />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {result.items.map((shop, i) => (
            <li key={shop.slug} className="enter-item" style={stagger(i)}>
              <Link href={shopPath(shop.slug)} className="card-panel press flex h-full flex-col gap-1.5 px-5 py-4">
                <Clamp lines={1} className="text-[15px] font-bold tracking-[-0.02em] text-ink">
                  {shop.name}
                </Clamp>
                <Clamp lines={2} className="text-[12.5px] leading-[1.6] text-mut">
                  {[whereLine(shop), shop.phone].filter(Boolean).join(" | ")}
                </Clamp>
              </Link>
            </li>
          ))}
          {/* 입점 칸은 마지막 쪽에만 — 쪽마다 서면 매장 사이에 광고가 끼어든 것처럼 읽힌다 */}
          {result.page >= result.totalPages ? (
            <li className="enter-item" style={stagger(result.items.length)}>
              <CtaTile
                href={ROUTES.business}
                title={result.items.length === 0 ? M.emptyAll : M.ctaTileTitle}
                body={M.ctaTileBody}
                compact={result.items.length > 0}
              />
            </li>
          ) : null}
        </ul>
      )}
      </PendingRegion>

      {result.totalPages > 1 && (
        <Pagination page={result.page} totalPages={result.totalPages} hrefFor={(p) => shopsHref(q, p)} />
      )}
      </NavPendingScope>
    </Page>
  );
}
