"use client";
// 할인 행사 배지 — 행사명("여름 세일")과 남은 기간("2일 남음")을 표시.
// 남은 기간은 마운트 후에만 계산한다(캐시된 RSC 시각으로 굳는 것 방지 — useNow).
import { formatSaleWindow, saleRemaining } from "@/lib/format";
import { useNow } from "@/components/use-now";

type Props = {
  discountName: string | null | undefined;
  discountEndsAt: string | null | undefined;
  discountStartsAt?: string | null;
  /** compact = 카드/탭용 한 줄 배지, full = 상세 행용(기간 문자열까지) */
  variant?: "compact" | "full";
};

export function SaleBadge({ discountName, discountEndsAt, discountStartsAt, variant = "compact" }: Props) {
  const now = useNow();
  const remaining = now === null ? null : saleRemaining(discountEndsAt, now);
  const window = formatSaleWindow(discountStartsAt, discountEndsAt);

  if (!discountName && !remaining && !window) return null;

  if (variant === "compact") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px]">
        {discountName && <span className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">{discountName}</span>}
        {remaining && (
          <span className={remaining.urgent ? "font-semibold text-red-300" : "text-slate-400"}>
            {remaining.text}
          </span>
        )}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-baseline justify-end gap-x-1.5 gap-y-0.5">
      {discountName && <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-xs font-semibold text-amber-300">{discountName}</span>}
      {window && <span className="text-sm text-slate-100">{window}</span>}
      {remaining && (
        <span className={`text-xs ${remaining.urgent ? "font-semibold text-red-300" : "text-slate-400"}`}>({remaining.text})</span>
      )}
    </span>
  );
}
