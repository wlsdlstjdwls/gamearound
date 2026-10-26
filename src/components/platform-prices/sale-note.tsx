// 지금 도는 행사의 이름과 남은 기간 — "플랫폼별 가격 비교" **제목 옆** 곁말(2026-09-30, 사용자 지정).
// 행사는 스토어마다 달라서 어느 스토어의 행사인지를 앞에 적는다. 값은 **최저가 카드**의 것이다 —
// 실제로 살 자리가 그 카드이고, 그 카드의 행사가 이 화면의 행사다.
import { SaleBadge } from "@/components/sale-badge";
import type { PlatformDto } from "@/server/services/games";
import { brandNameOf, byPrice } from "@/components/platform-prices/order";

export function PlatformSaleNote({ platforms }: { platforms: PlatformDto[] }) {
  const cheapest = [...platforms].sort(byPrice)[0] ?? null;
  if (!cheapest || !cheapest.discountPct || cheapest.discountPct <= 0) return null;
  if (!cheapest.discountName && !cheapest.discountEndsAt) return null;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className="text-[12px] font-semibold text-dim">{brandNameOf(cheapest)}</span>
      <SaleBadge discountName={cheapest.discountName} discountEndsAt={cheapest.discountEndsAt} discountStartsAt={cheapest.discountStartsAt} variant="full" />
    </span>
  );
}
