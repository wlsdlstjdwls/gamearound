"use client";
// 할인 행사 배지 — 행사명("가을 세일")과 남은 기간("2일 남음").
// 남은 기간은 마운트 후에만 계산한다(캐시된 RSC 시각으로 굳는 것 방지 — useNow).
//
// 행사명이 브랜드색인 이유(2026-09-21): 전에는 회색 면에 회색 글자라 "미드위크 할인" 이
// 옆의 출시일, 버전 문자열과 같은 무게로 읽혔다. 그런데 이 말은 메타 정보가 아니라 **할인의 이름**이고,
// 같은 줄의 할인율이 이미 브랜드색이다. 둘을 같은 색으로 묶어야 한 가지 사실로 읽힌다.
// 빨강은 여기 쓰지 않는다 — 이 화면에서 빨강은 "마감 임박" 한 뜻만 갖는다(아래 danger).
//
// 남은 기간은 **알약**이다(2026-09-30, 사용자: "16시간 남음, 2일 남음 색상이 별로야").
// 앞서는 맨 글자였다 — 임박은 벽돌색 굵은 글자, 아니면 회색 글자에 괄호. 벽돌색은 회청 바탕에서 갈색으로 읽혔고,
// 회색 괄호는 출시일 같은 메타와 무게가 같아 "시간이 간다" 는 말로 안 읽혔다. 이제 둘 다 면을 갖는다:
// 임박은 옅은 빨강 면 + 진한 빨강 글자 + 같은 색 테두리, 아니면 중립 면 + 짙은 글자.
// 면을 꽉 찬 빨강으로 칠하지 않는 이유 — 카드마다 선 자리라 스무 장이 한 화면에 빨간 딱지로 깔린다.
import { formatSaleWindow, saleRemaining, type SaleRemaining } from "@/lib/format";
import { useNow } from "@/components/use-now";
import { ClockIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/** 남은 기간 알약. 임박일 때만 점이 뛴다 — 점이 늘 있으면 "급하다" 가 아니라 장식이 된다 */
function Remaining({ remaining }: { remaining: SaleRemaining }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 self-center rounded-full px-2 py-[3px] text-[11.5px] font-semibold leading-none tabular-nums",
        remaining.urgent ? "bg-danger-soft text-danger shadow-[inset_0_0_0_1px_var(--danger-line)]" : "bg-surface-2 text-ink-2",
      )}
    >
      {remaining.urgent ? <span aria-hidden className="pulse-dot size-1.5 rounded-full bg-danger" /> : <ClockIcon size={12} />}
      {remaining.text}
    </span>
  );
}

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
