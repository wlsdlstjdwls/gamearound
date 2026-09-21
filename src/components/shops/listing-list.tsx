// 손님이 보는 판매 목록 — 매장 페이지의 "파는 물건".
//
// 매장주 화면(listing-rows)과 컴포넌트를 나눈 이유: 저쪽은 고치는 화면이라 클라이언트고
// 폼이 줄마다 붙는다. 이쪽은 읽기만 하므로 서버 컴포넌트로 둔다(AGENTS §6).
// 한 컴포넌트로 합치면 손님 화면까지 클라이언트 번들을 지고 간다.
import { panelClass } from "@/components/ui/page";
import { Clamp } from "@/components/ui/tooltip";
import { formatPrice } from "@/lib/currency";
import type { Currency } from "@/server/db/schema";
import { LISTING_MESSAGES as M } from "@/lib/shops/listing-messages";
import type { ListingDto } from "@/server/services/listings";

const CONDITION_LABEL: Record<ListingDto["condition"], string> = {
  sealed: M.conditionSealed,
  new: M.conditionNew,
  used: M.conditionUsed,
};

/** 재고 한 줄. 숫자만 내지 않는다 — "0개 있어요" 보다 "품절이에요" 가 답이다 */
function stockLine(listing: ListingDto): string {
  if (listing.status === "soldout" || listing.available === 0) return M.soldout;
  return `${listing.available}${M.availableSuffix}`;
}

export function ListingList({ listings }: { listings: ListingDto[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {listings.map((l) => (
        <li key={l.id} className={panelClass("flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3")}>
          <Clamp lines={1} className="min-w-0 flex-1 text-[13.5px] font-medium text-ink">
            {l.productName}
          </Clamp>
          <span className="text-[12px] text-dim">
            {CONDITION_LABEL[l.condition]} | {stockLine(l)}
          </span>
          <span className="text-[13.5px] font-semibold text-ink">
            {formatPrice(l.priceMinor, l.currency as Currency)}
          </span>
        </li>
      ))}
    </ul>
  );
}
