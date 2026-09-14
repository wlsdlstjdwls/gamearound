"use client";
// 할인 행사 배지 — 행사명("가을 세일")과 남은 기간("2일 남음").
// 남은 기간은 마운트 후에만 계산한다(캐시된 RSC 시각으로 굳는 것 방지 — useNow).
import { formatSaleWindow, saleRemaining } from "@/lib/format";
import { useNow } from "@/components/use-now";

type Props = {
  discountName: string | null | undefined;
  discountEndsAt: string | null | undefined;
  discountStartsAt?: string | null;
  /** compact = 카드/탭용 한 줄, full = 상세 행용(기간 문자열까지) */
  variant?: "compact" | "full";
};

export function SaleBadge({ discountName, discountEndsAt, discountStartsAt, variant = "compact" }: Props) {
  const now = useNow();
  const remaining = now === null ? null : saleRemaining(discountEndsAt, now);
  const saleWindow = formatSaleWindow(discountStartsAt, discountEndsAt);

  if (!discountName && !remaining && !saleWindow) return null;

  if (variant === "compact") {
    return (
      <span className="inline-flex flex-wrap items-baseline gap-x-1 text-[12px] text-dim">
        {discountName && <span>{discountName}</span>}
        {discountName && remaining && <span aria-hidden>·</span>}
        {remaining && <span className={remaining.urgent ? "font-semibold text-danger" : "text-mut"}>{remaining.text}</span>}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-[12.5px]">
      {discountName && <span className="rounded-[5px] bg-surface-2 px-1.5 py-0.5 text-[11.5px] font-semibold text-ink-2">{discountName}</span>}
      {saleWindow && <span className="text-mut">{saleWindow}</span>}
      {remaining && <span className={remaining.urgent ? "font-semibold text-danger" : "text-dim"}>({remaining.text})</span>}
    </span>
  );
}
