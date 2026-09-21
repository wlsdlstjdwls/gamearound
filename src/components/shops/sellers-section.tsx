// 게임 상세의 "파는 곳" — 이 게임을 실물로 파는 매장.
//
// 디지털 가격 비교와 다른 칸으로 둔다. 저쪽은 스토어가 파는 내려받기고 이쪽은 매장이 파는 물건이다 —
// 한 표에 섞으면 "이 값을 누르면 살 수 있나" 가 줄마다 달라진다.
//
// 파는 곳이 없으면 칸 자체를 그리지 않는다(호출부가 판단한다). 카탈로그 7만 개 중 매장이 붙은 게임은
// 아직 극소수라, 모든 게임 상세에 "아직 없어요" 를 한 칸 세우면 그 문장이 화면의 기본값이 된다.
import Link from "next/link";
import { ROW, ROWS } from "@/components/ui/page";
import { cn } from "@/lib/cn";
import { Clamp } from "@/components/ui/tooltip";
import { formatPrice } from "@/lib/currency";
import { shopPath } from "@/lib/routes";
import type { Currency } from "@/server/db/schema";
import { LISTING_MESSAGES } from "@/lib/shops/listing-messages";
import type { SellerDto } from "@/server/services/listings";

const CONDITION_LABEL: Record<SellerDto["condition"], string> = {
  sealed: LISTING_MESSAGES.conditionSealed,
  new: LISTING_MESSAGES.conditionNew,
  used: LISTING_MESSAGES.conditionUsed,
};

export function SellersSection({ sellers }: { sellers: SellerDto[] }) {
  return (
    <ul className={ROWS}>
      {sellers.map((s, i) => (
        // 같은 매장이 같은 게임을 신품과 중고 두 줄로 올릴 수 있다 — slug 만으로는 키가 겹친다
        <li key={`${s.shopSlug}-${s.condition}-${i}`}>
          <Link
            href={shopPath(s.shopSlug)}
            className={cn(ROW, "flex flex-wrap items-baseline gap-x-3 gap-y-1 py-[13px]")}
          >
            <Clamp lines={1} className="min-w-0 flex-1 text-[13.5px] font-medium text-ink">
              {s.shopName}
            </Clamp>
            <span className="text-[12px] text-dim">
              {CONDITION_LABEL[s.condition]}
              {s.address ? ` | ${s.address}` : ""}
            </span>
            <span className="text-[13.5px] font-semibold text-ink">
              {formatPrice(s.priceMinor, s.currency as Currency)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
