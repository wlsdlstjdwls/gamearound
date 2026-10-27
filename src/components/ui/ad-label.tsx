// "광고" 표시(2026-10-27, 기획서 4.1). 돈을 받은 노출은 알아볼 수 있어야 한다(표시광고법, 공정위 추천보증 심사지침).
// 일부러 수수하게 둔다 — 회색 글자에 얇은 테두리. 색을 채운 딱지는 카드를 시끄럽게 만든다(10-27 사용자: 홈 딱지가 "더럽다").
// 인디 카드(주목할 게임)와 게시판 홍보 고정 줄이 같이 쓴다.
import { cn } from "@/lib/cn";
import { PROMO_MESSAGES as M } from "@/lib/promo/messages";

export function AdLabel({ className }: { className?: string }) {
  return <span className={cn("inline-flex shrink-0 items-center rounded-[5px] px-1.5 py-px text-[11px] font-semibold text-dim ring-1 ring-line-strong", className)}>{M.ad}</span>;
}
