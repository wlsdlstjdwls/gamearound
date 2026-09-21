"use client";
// 할인 행사 배지 — 행사명("가을 세일")과 남은 기간("2일 남음").
// 남은 기간은 마운트 후에만 계산한다(캐시된 RSC 시각으로 굳는 것 방지 — useNow).
import { formatSaleWindow, saleRemaining } from "@/lib/format";
import { useNow } from "@/components/use-now";

type Props = {
  discountName: string | null | undefined;
  discountEndsAt: string | null | undefined;
  discountStartsAt?: string | null;
  /** compact = 카드/탭용 한 줄, full = 상세 행용(기간 문자열까지), inline = 남은 기간만(점 + 글자) */
  variant?: "compact" | "full" | "inline";
};

export function SaleBadge({ discountName, discountEndsAt, discountStartsAt, variant = "compact" }: Props) {
  const now = useNow();
  const remaining = now === null ? null : saleRemaining(discountEndsAt, now);
  const saleWindow = formatSaleWindow(discountStartsAt, discountEndsAt);

  if (!discountName && !remaining && !saleWindow) return null;

  /*
   * inline — 행사명을 버리고 남은 기간만 남긴다. 카드 메타 줄의 오른쪽 끝처럼
   * 자리가 한 줄뿐이고 왼쪽에 이미 다른 값이 선 자리에 쓴다.
   * 임박일 때만 점을 붙이는 이유: 점이 늘 있으면 "급하다" 는 신호가 아니라 장식이 된다.
   */
  if (variant === "inline") {
    if (!remaining) return null;
    return (
      <span className={`inline-flex shrink-0 items-center gap-1.5 text-[12.5px] ${remaining.urgent ? "font-bold text-danger" : "text-mut"}`}>
        {remaining.urgent && <span aria-hidden className="pulse-dot size-1.5 rounded-full bg-danger" />}
        {remaining.text}
      </span>
    );
  }

  if (variant === "compact") {
    return (
      <span className="inline-flex flex-wrap items-baseline gap-x-1 text-[12px] text-dim">
        {discountName && <span>{discountName}</span>}
        {discountName && remaining && <span aria-hidden>|</span>}
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
