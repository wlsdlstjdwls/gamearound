// 사전예약 표지 — 목록 카드, 홈 카드, 상세 머리가 같은 모양을 쓴다.
//
// 2026-11-18 회차 둘: 처음엔 연한 파랑 딱지였고, 사용자가 "최저가처럼 글자만" 이라 해서 파란 글자로 바꿨더니
// 같은 날 "눈에 너무 안 띈다". 그래서 먹색 알약 + 달력 아이콘이다. 파랑으로 채우지 않는 이유: 대표색 남발(같은 날 사용자 "파란색 너무 남발"),
// 그리고 카드 안 파랑은 이미 할인율, 역대 최저가가 쓴다 — 사전예약은 값 판정이 아니라 판매 상태라 다른 색으로 갈린다.
// 서버 컴포넌트다(상태 없음). 클라이언트 파일에서 문자열 상수로 가져오지 않게 컴포넌트로 둔다(AGENTS 6장).
import { CalendarIcon } from "@/components/ui/icons";
import { PREORDER_LABEL } from "@/lib/games/messages";
import { cn } from "@/lib/cn";

const SIZE = {
  sm: "h-5 gap-1 px-1.5 text-[11.5px]",
  md: "h-7 gap-1.5 px-2.5 text-[12.5px]",
} as const;
const ICON = { sm: 12, md: 14 } as const;

export function PreorderMark({ size = "sm", className }: { size?: keyof typeof SIZE; className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-[var(--radius-xs)] bg-ink font-bold leading-none text-on-ink", SIZE[size], className)}>
      <CalendarIcon size={ICON[size]} strokeWidth={2.4} />
      {PREORDER_LABEL}
    </span>
  );
}
