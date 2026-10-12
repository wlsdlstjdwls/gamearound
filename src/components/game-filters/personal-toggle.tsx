"use client";
// 필터 맨 위 "내 취향" 토글 — 온보딩에서 고른 취향으로 목록을 거를지 켜고 끈다.
//
// 예전에는 목록 위 한 줄이 이 일을 했다("내 조건으로 골라 보여 드려요 ... 전체 보기, 조건 바꾸기").
// 2026-10-12 사용자 결정으로 그 줄을 걷고 필터 안으로 들였다 — 거르는 일은 필터 자리에서 켜고 끄는 게 맞고,
// 걸린 값(플랫폼, 장르)은 바로 아래 칩과 드롭다운이 이미 보여 준다. 취향을 고치는 길은 설정에 있다.
//
// 버튼이 아니라 링크다. 켜고 끄는 것이 곧 주소(all=1 이 붙느냐)를 바꾸는 일이라 다른 필터 칩과 같은 방식이다.
// 그림은 ui/switch 의 SwitchTrack 을 빌린다 — 설정 화면의 같은 토글과 같은 모양이어야 같은 값으로 읽힌다.
//
// 클라이언트 조각인 이유: 누른 순간 스위치가 먼저 넘어가야 한다(2026-10-12 사용자: "토글은 빨라야 한다").
// 목록 조회는 뒤에서 따라온다 — 조건 칩과 같은 useOptimisticToggle(ui/chip-nav)을 쓴다.
import Link from "next/link";
import { SwitchTrack } from "@/components/ui/switch";
import { Clamp } from "@/components/ui/tooltip";
import { isPlainClick, useOptimisticToggle } from "@/components/ui/chip-nav";
import { cn } from "@/lib/cn";
import { ONBOARDING_MESSAGES } from "@/lib/onboarding/messages";

const M = ONBOARDING_MESSAGES.list;

/** 페이지가 계산해 넘기는 값. 취향이 없는 사람(손님, 관리자, 온보딩 안 함)에게는 null 이라 토글이 서지 않는다 */
export type PersonalFilter = {
  applied: boolean;
  /** 취향 이름들(Steam, 어드벤처 등). 켜져 있을 때 무엇으로 걸렀는지 한 줄로 적는다 */
  labels: readonly string[];
  /** 누르면 갈 주소 — 켜져 있으면 끈 주소, 꺼져 있으면 켠 주소 */
  href: string;
};

export function PersonalToggle({ personal, sheet }: { personal: PersonalFilter; sheet: boolean }) {
  const { labels, href } = personal;
  const [applied, setApplied] = useOptimisticToggle(personal.applied);
  return (
    <Link
      // 거르는 자리라 맨 위로 튀지 않는다(groups 의 KEEP_SCROLL 과 같은 이유). 그 파일을 가져오면 서로를 부른다
      scroll={false}
      onClick={(e) => {
        if (isPlainClick(e)) setApplied(!applied);
      }}
      href={href}
      className={cn(
        "press flex items-center gap-3 rounded-[var(--radius-md)] px-3.5 transition-colors duration-base",
        sheet ? "min-h-[60px] py-3" : "min-h-[52px] py-2.5",
        applied ? "bg-acc-soft hover:bg-acc-soft" : "bg-surface-2 hover:bg-surface-3",
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn("text-[14px] font-bold tracking-[-0.02em]", applied ? "text-acc" : "text-ink")}>{M.toggle}</span>
        {applied && labels.length > 0 && (
          <Clamp lines={1} className="text-[12px] text-mut">
            {labels.join(", ")}
          </Clamp>
        )}
      </span>
      <SwitchTrack on={applied} />
      <span className="sr-only">{applied ? M.on : M.off}</span>
    </Link>
  );
}
