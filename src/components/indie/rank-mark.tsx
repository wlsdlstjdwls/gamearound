// 명예의 전당 순위 표기 — 굵은 숫자 + 작은 "위"(2026-11-20 사용자 "1위, 2위 3위 뱃지 표기가 좀 꾸지다").
//
// 전에는 1위 파란 알약, 2, 3위 파란 원, 4위 아래는 맨 글자로 셋이 다 달랐다. 파란 면이 셋이나 서서 "누를 것" 처럼 읽혔고(파랑은 링크 색),
// 숫자와 "위" 가 같은 크기라 순위가 한눈에 안 들어왔다. 이제 어디서나 숫자가 주인공이고 "위" 는 꼬리다.
// tone 은 앉는 자리 하나만 가른다: 그림 위(onImage)는 반투명 어두운 면에 흰 글자, 흰 판 위(plain)는 면 없이 잉크 글자.
import { cn } from "@/lib/cn";

/** 숫자와 꼬리 글자 크기. lg 는 1위 큰 판, md 는 2, 3위 카드 그림 위, sm 은 4~10위 줄 */
const SIZE = {
  lg: { num: "text-[22px]", unit: "text-[12px]" },
  md: { num: "text-[19px]", unit: "text-[11.5px]" },
  sm: { num: "text-[21px]", unit: "text-[12px]" },
} as const;

/** 그림 위 받침 — 어떤 그림이든 흰 글자가 서게 잉크를 반투명으로 깐다. 테두리, 그림자 없이 면 하나 */
const ON_IMAGE = "rounded-[var(--radius-sm)] bg-[color-mix(in_oklab,var(--ink)_62%,transparent)] px-2.5 py-1 text-on-ink backdrop-blur-sm";

export function RankMark({
  rank,
  unit,
  size = "sm",
  tone = "plain",
  className,
  lead,
}: {
  rank: number;
  /** 꼬리 글자("위"). 문구는 lib/indie/fame 에서 받는다 */
  unit: string;
  size?: keyof typeof SIZE;
  tone?: "plain" | "onImage";
  className?: string;
  /** 숫자 앞에 서는 말과 그림(1위 판의 트로피 + "이번 달"). 꼬리 글자와 같은 크기로 선다 */
  lead?: React.ReactNode;
}) {
  const s = SIZE[size];
  return (
    <span className={cn("inline-flex items-baseline gap-0.5 leading-none", tone === "onImage" ? ON_IMAGE : "text-ink", className)}>
      {lead && <span className={cn(s.unit, "mr-1.5 inline-flex items-center gap-1 self-center font-bold")}>{lead}</span>}
      <span className={cn(s.num, "font-black tabular-nums tracking-[-0.03em]")}>{rank}</span>
      <span className={cn(s.unit, "font-bold", tone === "plain" && "text-mut")}>{unit}</span>
    </span>
  );
}
