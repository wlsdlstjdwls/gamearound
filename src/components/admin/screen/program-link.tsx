// 프로그램 이동 단추 — 한 관리 화면에서 다른 관리 화면(프로그램)으로 건너가는 자리(2026-10-30 사용자 "프로그램 이동 버튼 UI 공통화, 앞으로 이렇게").
// 백오피스 고객상세정보 맨 위 단추 줄(주문이력, 상담처리...)처럼 낱말은 **건너갈 화면 이름 그대로**다 — "~에서 고치기" 같은 설명을 붙이지 않는다.
// 이름은 ADMIN_NAV(메뉴와 같은 말)에서 가져온다. 바깥 사이트로 가는 링크(공개 화면, 스토어)는 프로그램이 아니라 여기 오지 않는다.
// 서버, 클라이언트 어디서나 쓰도록 "use client" 를 붙이지 않는다.
//
// select(2026-11-04, 사용자 "화면 이동 + 해당 행 선택까지, 공통 버튼으로, 화면 이동은 이 버튼으로"): 건너간 화면에서 그 줄을 골라 연다.
// 처음 여는 탭은 주소(?select=)로, 이미 열린 탭은 껍데기가 말을 보내(program-shell/select) 고른다. 받는 화면은 두 길을 다 받는다.
// icon: 칸 옆에 붙는 작은 단추(아이콘만). 그때는 label 이 낭독 이름이자 말풍선이다
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { programPath } from "@/lib/routes";

export function ProgramLink({
  href,
  select,
  icon,
  label,
  children,
  className,
}: {
  href: string;
  /** 건너간 화면에서 골라 열 줄의 열쇠(공통코드관리면 그룹코드) */
  select?: string | null;
  /** 아이콘만 있는 작은 단추로 그린다 */
  icon?: React.ReactNode;
  /** 아이콘 단추의 이름(낭독, 말풍선) */
  label?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const to = programPath(href, select);
  if (icon)
    return (
      <Link
        href={to}
        aria-label={label}
        title={label}
        className={cn("press flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-line-strong text-dim transition-colors duration-fast hover:border-acc hover:text-acc", className)}
      >
        {icon}
      </Link>
    );
  return (
    <Link href={to} className={cn(buttonClass({ variant: "secondary", size: "sm" }), "whitespace-nowrap", className)}>
      {children}
    </Link>
  );
}
