// 개발자 표지 — 게임패드 아이콘 + "개발자" 글자(2026-11-18).
//
// 지난 모양과 걷은 이유(전부 2026-11-18 사용자): 체크 + 글자, 먹색 알약 + 체크("체크 표시도 별로, 뱃지 형태도 별로"),
// 도트 글자 DEV("못 알아먹겠는데"). 그래서 읽히는 한국어 "개발자" 를 남기고, "게임 개발자" 라는 결은 앞의 게임패드 아이콘이 맡는다.
// 면도 테두리도 없는 글자 + 아이콘이라 딱지로 읽히지 않는다. 색은 대표 파랑(--acc) — 2026-11-18 주황을 써 봤다가 "별로", 여섯 색을
// 실제 줄 모양으로 나란히 보고 사용자가 골랐다. 파랑을 줄이는 중이지만 "확인된 사람" 표시는 파랑이 가장 잘 읽힌다는 판단이다.
import { GamepadIcon } from "@/components/ui/icons";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import { cn } from "@/lib/cn";

export function DevMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 text-[12px] font-bold leading-none text-acc", className)}>
      <GamepadIcon size={14} aria-hidden />
      {M.developerBadge}
    </span>
  );
}
