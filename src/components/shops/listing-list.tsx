// 손님이 보는 판매 목록 — 매장 페이지의 "파는 물건".
//
// 매장주 화면(listing-rows)과 컴포넌트를 나눈 이유: 저쪽은 고치는 화면이라 클라이언트고
// 폼이 줄마다 붙는다. 이쪽은 읽기만 하므로 서버 컴포넌트로 둔다(AGENTS §6).
// 한 컴포넌트로 합치면 손님 화면까지 클라이언트 번들을 지고 간다.
import { FadeImage } from "@/components/ui/fade-image";
import { panelClass } from "@/components/ui/page";
import { Clamp } from "@/components/ui/tooltip";
import { formatPrice } from "@/lib/currency";
import type { Currency } from "@/server/db/schema";
import { LISTING_MESSAGES as M, PHOTO_MESSAGES } from "@/lib/shops/listing-messages";
import type { ListingDto } from "@/server/services/listings";

const CONDITION_LABEL: Record<ListingDto["condition"], string> = {
  sealed: M.conditionSealed,
  new: M.conditionNew,
  used: M.conditionUsed,
};

/** 재고 한 줄. 숫자만 내지 않는다 — "0개 있어요" 보다 "품절이에요" 가 답이다 */
/** 줄 옆 대표 사진의 한 변(px). 줄 높이를 크게 늘리지 않으면서 물건 모양은 알아볼 크기 */
const COVER = 56;

function stockLine(listing: ListingDto): string {
  if (listing.status === "soldout" || listing.available === 0) return M.soldout;
  return `${listing.available}${M.availableSuffix}`;
}

export function ListingList({ listings }: { listings: ListingDto[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {listings.map((l) => (
        <li key={l.id} className={panelClass("flex items-center gap-3 px-4 py-3")}>
          {l.coverPhotoUrl && (
            <FadeImage
              src={l.coverPhotoUrl}
              alt={PHOTO_MESSAGES.alt(l.productName, 1)}
              width={COVER}
              height={COVER}
              sizes={`${COVER}px`}
              className="shrink-0 rounded-[var(--radius-sm)] object-cover"
              style={{ width: COVER, height: COVER }}
            />
          )}
          <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-1">
            <Clamp lines={1} className="min-w-0 flex-1 text-[13.5px] font-medium text-ink">
              {l.productName}
            </Clamp>
            <span className="text-[12px] text-dim">
              {CONDITION_LABEL[l.condition]} | {stockLine(l)}
            </span>
            <span className="text-[13.5px] font-semibold text-ink">
              {formatPrice(l.priceMinor, l.currency as Currency)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
