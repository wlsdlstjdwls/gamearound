// 선택형 칩 — "여러 값 중 하나를 고르는" 자리(필터, 정렬, 플랫폼, 기간, 페이지)에 쓴다.
// 같은 모양이 7곳에 문자열로 복제돼 있었다. 선택 상태의 대비(잉크 필 ↔ 테두리)는 이 파일에서만 정한다.
import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type ChipSize = "sm" | "md" | "page";

const SIZE: Record<ChipSize, string> = {
  /** 관리자 목록, 차트 기간처럼 조밀한 자리 */
  sm: "px-2.5 py-1 text-[12px]",
  /** 기본 — 목록 필터, 정렬, 플랫폼 선택 */
  md: "px-3 py-1.5 text-[12.5px]",
  /** 페이지네이션 — 숫자 폭이 달라도 정사각에 가깝게 */
  page: "h-8 min-w-8 justify-center px-3 text-[12.5px]",
};

/*
 * 고른 칩과 안 고른 칩(2026-09-21 리디자인).
 *
 * 안 고른 칩에서 테두리를 걷어냈다. 필터 기둥에 칩이 스무 개 서면 테두리 스무 겹이 먼저 읽히고,
 * 그 소음 속에서 "잉크로 채워진 한 칸" 을 찾는 일이 되레 어려워진다. 안 고른 값은 회색 글자로만
 * 두고, 고른 값만 면을 갖는다 — 화면에서 채워진 면은 곧 "지금 걸린 조건" 이라는 뜻이다.
 * hover 는 면을 미리 보여 주는 몫이다(--surface-2).
 */
const ACTIVE = "bg-ink font-semibold text-on-ink";
const IDLE = "text-mut hover:bg-surface-2 hover:text-ink";

export function chipClass(opts: { active?: boolean; size?: ChipSize; className?: string } = {}): string {
  const { active = false, size = "md", className } = opts;
  return cn(
    // tap: 손가락 기기에서만 최소 높이를 44px 로 올린다(globals.css). 칩은 12~13px 글자라
    // 실제 높이가 30~33px 밖에 되지 않아 필터, 페이지 이동에서 옆 칩이 눌리는 자리였다
    "press tap inline-flex items-center rounded-full transition-colors duration-base",
    SIZE[size],
    active ? ACTIVE : IDLE,
    className,
  );
}

type ChipLinkProps = Omit<ComponentProps<typeof Link>, "className"> & {
  active?: boolean;
  size?: ChipSize;
  className?: string;
};

/** 링크 칩 — 상태가 쿼리스트링에 있는 필터, 정렬용(클라이언트 JS 불필요) */
export function ChipLink({ active = false, size, className, children, ...rest }: ChipLinkProps) {
  return (
    <Link aria-current={active ? "true" : undefined} className={chipClass({ active, size, className })} {...rest}>
      {children}
    </Link>
  );
}

type ChipButtonProps = ComponentProps<"button"> & {
  active?: boolean;
  size?: ChipSize;
};

/** 버튼 칩 — 상태가 컴포넌트 안에 있는 경우(차트 기간 등) */
export function ChipButton({ active = false, size, className, type = "button", children, ...rest }: ChipButtonProps) {
  return (
    <button type={type} aria-pressed={active} className={chipClass({ active, size, className })} {...rest}>
      {children}
    </button>
  );
}
