"use client";
// 할인 행사 배지 — 행사명("가을 세일")과 남은 기간("2일 남음").
// 남은 기간은 마운트 후에만 계산한다(캐시된 RSC 시각으로 굳는 것 방지 — useNow).
//
// 행사명이 브랜드색인 이유(2026-09-21): 전에는 회색 면에 회색 글자라 "미드위크 할인" 이
// 옆의 출시일, 버전 문자열과 같은 무게로 읽혔다. 그런데 이 말은 메타 정보가 아니라 **할인의 이름**이고,
// 같은 줄의 할인율이 이미 브랜드색이다. 둘을 같은 색으로 묶어야 한 가지 사실로 읽힌다.
// 빨강은 여기 쓰지 않는다 — 이 화면에서 빨강은 "마감 임박" 한 뜻만 갖는다(아래 danger).
//
// 남은 기간은 **시계 + 글자**다. 면도 테두리도 없다(2026-09-30 두 번 손질).
// 처음엔 맨 글자였는데 벽돌색이라 갈색으로 읽혔다("색상이 별로"). 같은 날 옅은 분홍 면 + 빨강 테두리 +
// 뛰는 점의 알약으로 바꿨더니 "촌스럽다" — 카드마다 분홍 딱지가 붙어 화면이 시끄러워졌다.
// 급함은 면이 아니라 **글자색 하나**로 말한다: 임박은 맑은 빨강(--danger) 굵은 글자, 아니면 보조 회색.
// 시계 그림은 "남은 시간" 이라는 뜻을 글자보다 먼저 알려서, 가격 옆 숫자와 섞이지 않게 한다.
import { formatSaleWindow, saleRemaining, type SaleRemaining } from "@/lib/format";
import { useNow } from "@/components/use-now";
import { ClockIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/** 남은 기간. 색 하나로만 급함을 말한다 — 면을 깔면 카드마다 딱지가 붙는다 */
function Remaining({ remaining }: { remaining: SaleRemaining }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 self-center text-[12px] leading-none tabular-nums",
        remaining.urgent ? "font-semibold text-danger" : "font-medium text-dim",
      )}
    >
      <ClockIcon size={13} strokeWidth={2.2} />
      {remaining.text}
    </span>
  );
}

type Props = {
  discountName: string | null | undefined;
  discountEndsAt: string | null | undefined;
  discountStartsAt?: string | null;
  /** compact = 카드/탭용 한 줄, full = 상세 행용(기간 문자열까지), inline = 남은 기간만(시계 + 글자) */
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
   */
  if (variant === "inline") {
    if (!remaining) return null;
    return <Remaining remaining={remaining} />;
  }

  if (variant === "compact") {
    return (
      <span className="inline-flex flex-wrap items-baseline gap-x-1 text-[12px] text-dim">
        {discountName && <span className="font-semibold text-acc">{discountName}</span>}
        {remaining && <Remaining remaining={remaining} />}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-[12.5px]">
      {discountName && <span className="rounded-[5px] bg-acc-soft px-1.5 py-0.5 text-[11.5px] font-bold text-acc">{discountName}</span>}
      {saleWindow && <span className="text-mut">{saleWindow}</span>}
      {remaining && <Remaining remaining={remaining} />}
    </span>
  );
}
