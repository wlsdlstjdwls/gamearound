// /shops — 매장 찾기. 설계서 §11 "공개, 유입".
//
// 캐시를 걸지 않는다(서비스의 listActiveShops 주석). 승인 직후 매장주가 자기 페이지를 보러 오는데
// 목록에 없는 화면을 보여 주는 것이 캐시로 아끼는 왕복 하나보다 비싸다.
//
// 거리순이 아니라 이름순인 이유는 SHOP_DIRECTORY_MESSAGES 주석에 있다 — 좌표를 아직 안 받는다.
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { Page, SectionHead, cardClass } from "@/components/ui/page";
import { Clamp } from "@/components/ui/tooltip";
import { buttonClass } from "@/components/ui/button";
import { stagger } from "@/lib/motion";
import { ROUTES, shopPath } from "@/lib/routes";
import { firstParam } from "@/lib/games-query";
import { SHOP_DIRECTORY_MESSAGES as M } from "@/lib/shops/messages";
import { listActiveShops, type ShopPublic } from "@/server/services/shops";

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
  const result = await listActiveShops(q, pageNum);

  return (
    <Page gap={20}>
      <SectionHead title={M.title} note={result.total > 0 ? `${result.total}${M.countSuffix}` : undefined} />

      {/* 검색은 서버 액션이 아니라 GET 이다 — 찾은 화면의 주소가 그대로 남아야 공유되고 뒤로 가기가 산다 */}
      <form action={ROUTES.shops} method="get" className={cardClass("flex flex-wrap items-center gap-2 p-3")}>
        <label htmlFor="shop-q" className="sr-only">
          {M.searchLabel}
        </label>
        <input
          id="shop-q"
          name="q"
          defaultValue={q ?? ""}
          placeholder={M.searchPlaceholder}
          // 16px 미만이면 iOS 가 화면을 확대한다(AGENTS §6)
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-[16px] text-ink placeholder:text-dim focus-visible:border-ink focus-visible:outline-none"
        />
        <button type="submit" className={buttonClass({ variant: "primary" })}>
          {M.searchSubmit}
        </button>
      </form>

      {result.items.length === 0 ? (
        <EmptyState
          title={q ? M.empty : M.emptyAll}
          description={M.lead}
          action={{ href: ROUTES.business, label: M.emptyAction }}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {result.items.map((shop, i) => (
            <li key={shop.slug} className="enter-item" style={stagger(i)}>
              <Link
                href={shopPath(shop.slug)}
                className={cardClass("lift press flex h-full flex-col gap-1 px-4 py-3.5 transition-colors hover:border-ink")}
              >
                <Clamp lines={1} className="text-[14px] font-semibold text-ink">
                  {shop.name}
                </Clamp>
                <Clamp lines={2} className="text-[12px] text-dim">
                  {whereLine(shop)}
                </Clamp>
                {shop.phone && <span className="text-[12px] text-dim">{shop.phone}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {result.totalPages > 1 && (
        <Pagination page={result.page} totalPages={result.totalPages} hrefFor={(p) => shopsHref(q, p)} />
      )}
    </Page>
  );
}
