"use client";
// 프로그램 이동 단추 — 한 관리 화면에서 다른 관리 화면(프로그램)으로 건너가는 자리(2026-10-30 사용자 "프로그램 이동 버튼 UI 공통화, 앞으로 이렇게").
// 백오피스 고객상세정보 맨 위 단추 줄(주문이력, 상담처리...)처럼 낱말은 **건너갈 화면 이름 그대로**다 — "~에서 고치기" 같은 설명을 붙이지 않는다.
// 이름은 메뉴 표(ADMIN_NAV, programOf)에서 저절로 가져온다 — 화면마다 손으로 적으면 메뉴 이름을 바꿀 때 단추만 옛 이름으로 남는다.
// 바깥 사이트로 가는 링크(공개 화면, 스토어)는 프로그램이 아니라 여기 오지 않는다.
//
// 2026-11-04(사용자 "화면 이동 + 해당 행 선택까지, 공통 버튼으로, 화면 이동은 이 버튼으로", 이어서 "아이콘 말고 프로그램 이름이 나와야지, 툴팁으로 뭐 하는지"):
// - select: 건너간 화면에서 그 줄을 골라 연다. 처음 여는 탭은 주소(?select=)로, 이미 열린 탭은 껍데기가 말을 보내(program-shell/select) 고른다
// - tip: 이 자리에서 그 화면으로 왜 가는지(화면마다 다르다). 올리면 말풍선으로 뜬다
// 아이콘만 있는 단추는 두지 않는다 — 어디로 가는지 글자로 보여야 한다.
//
// 모양(같은 날 사용자 "화면이동 공통버튼이 너무 밋밋해, 다른 버튼과 차별점"): 저장, 추가 같은 **이 화면 안의 행동** 단추(테두리 회색)와 갈라
// "다른 프로그램으로 건너간다" 가 한눈에 읽히게 한다 — 옅은 파랑 면 + 그 프로그램의 메뉴 아이콘 + 끝의 꺾쇠. 메뉴 기둥과 같은 아이콘이라
// 어느 화면으로 가는지 그림으로도 맞는다. 올리면 채운 파랑으로 바뀌고 꺾쇠가 살짝 나간다.
import Link from "next/link";
import { ChevronLeftIcon, SidePanelIcon } from "@/components/ui/icons";
import { useTooltip } from "@/components/ui/tooltip";
import { ITEMS } from "@/components/admin/admin-nav-items";
import { programOf } from "@/components/admin/program-shell/programs";
import { cn } from "@/lib/cn";
import { programPath } from "@/lib/routes";

export function ProgramLink({
  href,
  select,
  tip,
  children,
  className,
}: {
  href: string;
  /** 건너간 화면에서 골라 열 줄의 열쇠(공통코드관리면 그룹코드) */
  select?: string | null;
  /** 이 자리에서 그 화면으로 가는 까닭(말풍선). 화면마다 다르다 */
  tip?: string;
  /** 단추 글자. 비우면 메뉴의 프로그램 이름 */
  children?: React.ReactNode;
  className?: string;
}) {
  const { triggerProps, tooltip } = useTooltip<HTMLAnchorElement>(tip ?? "", !!tip, "tap");
  const program = programOf(href.split("?")[0]!);
  // 메뉴에 없는 화면(게임 고치기 등)은 창 그림으로 선다
  const Icon = ITEMS.find((i) => i.href === program.key)?.Icon ?? SidePanelIcon;
  return (
    <>
      <Link
        href={programPath(href, select)}
        {...(tip ? triggerProps : {})}
        className={cn(
          "press tap group inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-acc/30 bg-acc-soft pl-2 pr-1.5 text-[12.5px] font-semibold text-acc",
          "transition-colors duration-fast hover:border-acc hover:bg-acc hover:text-on-ink focus-visible:ring-2 focus-visible:ring-acc focus-visible:ring-offset-1",
          className,
        )}
      >
        <Icon size={14} />
        {children ?? program.label}
        <ChevronLeftIcon size={13} className="rotate-180 opacity-70 transition-transform duration-fast group-hover:translate-x-0.5" aria-hidden />
      </Link>
      {tip && tooltip}
    </>
  );
}
