"use client";
// 판매 목록의 한 줄 — 재고를 그 자리에서 고치고, 잘못 올린 줄을 내린다.
//
// 줄마다 폼을 따로 두는 이유: 한 폼에 전부 담아 "모두 저장" 으로 만들면, 한 줄이 막혔을 때
// 어느 줄이 문제인지 사람이 못 찾는다. 재고는 한 번에 한 줄씩 고치는 값이다.
//
// 내리기에 confirm() 을 쓰지 않는다 — 브라우저 모달은 되돌릴 자리를 주지 않으면서 손만 한 번 더 쓰게 한다.
// 지금 지워지는 것은 판매 줄뿐이고 상품(products)은 남는다. 같은 값으로 다시 올릴 수 있다.
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { removeListingAction, updateStockAction, type ListingState } from "@/app/(user)/vendor/[shopSlug]/listings/actions";
import { buttonClass } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { panelClass } from "@/components/ui/page";
import { Clamp } from "@/components/ui/tooltip";
import { formatPrice } from "@/lib/currency";
import type { Currency } from "@/server/db/schema";
import { LISTING_MESSAGES as M } from "@/lib/shops/listing-messages";
import { LISTING_STOCK_MAX } from "@/lib/shops/listing-schemas";
import type { ListingDto } from "@/server/services/listings";

const CONDITION_LABEL: Record<ListingDto["condition"], string> = {
  sealed: M.conditionSealed,
  new: M.conditionNew,
  used: M.conditionUsed,
};

const STATUS_LABEL: Record<ListingDto["status"], string> = {
  draft: M.statusDraft,
  selling: M.statusSelling,
  soldout: M.statusSoldout,
  hidden: M.statusHidden,
};

function PendingButton({ label, variant }: { label: string; variant: "secondary" | "ghost" }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass({ variant, size: "sm" })}>
      {label}
    </button>
  );
}

function ListingRow({ shopSlug, listing }: { shopSlug: string; listing: ListingDto }) {
  const [stockState, stockAction] = useActionState<ListingState, FormData>(updateStockAction.bind(null, shopSlug), null);
  const [removeState, removeAction] = useActionState<ListingState, FormData>(removeListingAction.bind(null, shopSlug), null);
  const failed = (stockState && !stockState.ok && stockState.error) || (removeState && !removeState.ok && removeState.error);

  return (
    <li className={panelClass("flex flex-col gap-2 px-4 py-3.5")}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <Clamp lines={1} className="min-w-0 flex-1 text-[14px] font-semibold text-ink">
          {listing.productName}
        </Clamp>
        <span className="text-[13px] font-semibold text-ink">
          {formatPrice(listing.priceMinor, listing.currency as Currency)}
        </span>
      </div>

      <p className="text-[12px] text-dim">
        {CONDITION_LABEL[listing.condition]} | {STATUS_LABEL[listing.status]}
        {listing.hardwareNameKo ? ` | ${listing.hardwareNameKo}` : ""}
        {listing.barcode ? ` | ${listing.barcode}` : ""}
      </p>

      {failed && (
        <FormMessage tone="error" replayKey={String(failed)}>
          {failed}
        </FormMessage>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <form action={stockAction} className="flex items-end gap-2">
          <input type="hidden" name="listingId" value={listing.id} />
          <div className="flex flex-col gap-1">
            <label htmlFor={`stock-${listing.id}`} className="text-[11.5px] text-dim">
              {M.stockLabel}
            </label>
            <input
              id={`stock-${listing.id}`}
              name="onHand"
              inputMode="numeric"
              defaultValue={listing.onHand}
              max={LISTING_STOCK_MAX}
              // 16px 미만이면 iOS 가 화면을 확대한다(AGENTS §6)
              className="w-20 rounded-[var(--radius-sm)] border border-line-strong bg-bg px-2.5 py-2 text-[16px] text-ink focus-visible:border-ink focus-visible:outline-none"
            />
          </div>
          <PendingButton label={M.stockSave} variant="secondary" />
        </form>

        <form action={removeAction}>
          <input type="hidden" name="listingId" value={listing.id} />
          <PendingButton label={M.remove} variant="ghost" />
        </form>
      </div>
    </li>
  );
}

export function ListingRows({ shopSlug, listings }: { shopSlug: string; listings: ListingDto[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {listings.map((l) => (
        <ListingRow key={l.id} shopSlug={shopSlug} listing={l} />
      ))}
    </ul>
  );
}
