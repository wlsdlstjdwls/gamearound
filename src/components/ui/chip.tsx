// 선택형 칩 — "여러 값 중 하나를 고르는" 자리(필터, 정렬, 플랫폼, 기간, 페이지)에 쓴다.
// 같은 모양이 7곳에 문자열로 복제돼 있었다. 선택 상태의 대비(잉크 필 ↔ 테두리)는 이 파일에서만 정한다.
import Link from "next/link";
import type { ComponentProps } from "react";
import { CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export type ChipSize = "xs" | "sm" | "md" | "lg" | "page";

const SIZE: Record<ChipSize, string> = {
  /*
   * 가장 얇은 칸 — **칩 하나의 높이가 곧 그 줄의 높이**인 자리에만 쓴다(걸린 조건 띠).
   *
   * 왜 sm 으로 안 되나(2026-09-22, 사용자 지적: "뱃지내 패딩이 위아래 공백이 너무 많다"):
   * sm 은 py-1(4px)에 줄높이가 기본값(1.5)이라 12px 글자가 18px 자리를 차지한다 — 합쳐 26px 이다.
   * 그 26px 이 다른 자리에서는 안 보이지만(칩이 여러 줄로 서서 서로 높이를 나눠 갖는다)
   * 한 줄짜리 띠에서는 띠 두께 그 자체가 된다.
   *
   * 줄높이를 1.3 으로 조이고 위아래를 3px 로 줄여 22px 로 만든다. 더 줄이지 않는 이유:
   * 안에 11px 짜리 X 표시가 들어가고, 그 아래로는 글자와 아이콘이 테두리에 닿는다.
   * 손가락 목표는 여기서 줄지 않는다 — compact 가 44px 을 덧면으로 따로 준다(chipClass 주석).
   */
  xs: "px-2.5 py-[3px] text-[12px] leading-[1.3]",
  /** 관리자 목록, 차트 기간처럼 조밀한 자리 */
  sm: "px-2.5 py-1 text-[12px]",
  /** 기본 — 목록 필터, 정렬, 플랫폼 선택 */
  md: "px-3 py-1.5 text-[12.5px]",
  /**
   * 손가락으로 고르는 자리 — 모바일 필터 시트.
   * md 를 그대로 쓰면 글자 12.5px 에 상자 30px 이라, 화면을 가득 덮은 시트 안에서는 칩이
   * "누를 것" 이 아니라 "적어 둔 말" 로 읽힌다(.tap 이 주는 44px 은 보이지 않는 범위다).
   * 폭도 같이 키운다 — 시트는 기둥과 달리 232px 제약이 없다.
   */
  lg: "px-4 py-2 text-[13.5px]",
  /** 페이지네이션 — 숫자 폭이 달라도 정사각에 가깝게 */
  page: "h-8 min-w-8 justify-center px-3 text-[12.5px]",
};

/*
 * 고른 칩과 안 고른 칩(2026-09-21 리디자인).
 *
 * 고른 칩은 잉크가 아니라 브랜드 보라다(2026-09-21). 검정 필은 "눌린 버튼" 으로 읽혀서
 * 화면에서 브랜드가 할인 스탬프에만 남아 있었다 — 지금 걸린 조건도 같은 색으로 말한다.
 * 글자는 --on-ink 를 쓴다(스탬프와 같은 짝): 라이트에서 보라 위 흰 글자, 다크에서는 --acc 가
 * 밝은 보라로 뒤집히고 --on-ink 도 검정으로 뒤집혀 두 테마 모두 대비가 선다.
 *
 * 안 고른 칩에서 테두리를 걷어냈다. 필터 기둥에 칩이 스무 개 서면 테두리 스무 겹이 먼저 읽히고,
 * 그 소음 속에서 "채워진 한 칸" 을 찾는 일이 되레 어려워진다. 안 고른 값은 회색 글자로만
 * 두고, 고른 값만 면을 갖는다 — 화면에서 채워진 면은 곧 "지금 걸린 조건" 이라는 뜻이다.
 * hover 는 면을 미리 보여 주는 몫이다(--surface-2).
 */
const ACTIVE = "bg-acc font-semibold text-on-ink hover:bg-acc-hover";
const IDLE = "text-mut hover:bg-surface-2 hover:text-ink";

/*
 * 테두리를 두른 짝(outline). 위의 "테두리를 걷는다" 는 칩이 스무 개 서는 **기둥**의 사정이다 —
 * 좁은 화면 필터 시트에는 칩이 넷뿐이고, 거기서는 반대 문제가 난다: hover 가 없는 손가락 기기에서
 * 안 고른 칩이 회색 글자 한 덩어리라 무엇이 눌리는지가 안 보인다(2026-09-22, 사용자 지적).
 * 그래서 이 모드에서만 헤어라인을 준다. 고른 칩에도 같은 두께의 테두리를 둘러야 두 상태의 높이가
 * 1px 씩 어긋나지 않는다 — cn 은 단순 이어붙이기라 나중 클래스가 이기지 않는다(lib/cn).
 */
const ACTIVE_OUTLINE = "border border-acc bg-acc font-semibold text-on-ink hover:bg-acc-hover";
const IDLE_OUTLINE = "border border-line-strong bg-surface text-ink shadow-hair hover:border-ink hover:bg-surface-2";

/**
 * filled: 고른 상태는 아니지만 고른 칩과 같은 면을 쓰는 칩(걸린 조건의 해제 칩).
 * className 으로 면을 덮어쓰면 안 되는 이유(2026-10-02, 사용자: "호버하면 글자가 안 보인다"):
 * cn 은 클래스를 합치기만 하고 겹친 것을 지우지 않는다. IDLE 의 hover:bg-surface-2 와 덮어쓴
 * hover:bg-acc-hover 가 둘 다 남아 CSS 순서로 밝은 면이 이겼고, 그 위에 흰 글자가 섰다.
 */
export function chipClass(opts: { active?: boolean; filled?: boolean; size?: ChipSize; className?: string; compact?: boolean; outline?: boolean } = {}): string {
  const { active = false, filled = false, size = "md", className, compact = false, outline = false } = opts;
  const on = active || filled;
  return cn(
    // tap: 손가락 기기에서만 최소 높이를 44px 로 올린다(globals.css). 칩은 12~13px 글자라
    // 실제 높이가 30~33px 밖에 되지 않아 필터, 페이지 이동에서 옆 칩이 눌리는 자리였다.
    //
    // compact 는 그 44px 을 **덧면으로** 준다(tap-inset). 칩의 높이가 곧 그 줄의 높이인 자리
    // (걸린 조건 띠)에서만 쓴다 — 거기서는 상자를 키우면 띠가 통째로 두꺼워진다.
    // 누르는 범위는 두 방식 모두 44px 이다.
    "press inline-flex items-center rounded-full transition-colors duration-base",
    compact ? "tap-inset" : "tap",
    SIZE[size],
    outline ? (on ? ACTIVE_OUTLINE : IDLE_OUTLINE) : on ? ACTIVE : IDLE,
    className,
  );
}

/*
 * 켜고 끄는 칩 앞에 서는 네모(2026-09-22, 사용자 지적: "무료 제외인건지 아닌건지 티가 안 난다").
 *
 * 고르는 칩은 "옆 칩과 견줘 이것만 면을 가졌다" 로 상태를 말한다. 그런데 켜고 끄는 값은 칩이
 * 하나뿐이라 견줄 상대가 없다 — 혼자 선 칩은 채워져 있어도 그게 '켜짐' 인지 그 칩의 원래 색인지
 * 알 길이 없다. 네모 안의 체크는 옆을 안 보고도 읽힌다.
 *
 * 색을 따로 정하지 않는다(border-current). 켠 칩은 보라 면 위 흰 글자, 끈 칩은 흰 면 위 잉크
 * 글자인데 둘 다 글자와 같은 색으로 서야 네모가 칩에 얹힌 딴 물건으로 보이지 않는다.
 */
export function ChipCheck({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "-ml-0.5 mr-1.5 flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-[4px] border border-current",
        // 끈 상태의 빈 네모는 옅게 둔다 — 또렷하면 "이미 뭔가 걸려 있다" 로 먼저 읽힌다
        on ? "opacity-100" : "opacity-50",
      )}
    >
      <CheckIcon size={11} className={cn("transition-opacity duration-fast", on ? "opacity-100" : "opacity-0")} />
    </span>
  );
}

type ChipLinkProps = Omit<ComponentProps<typeof Link>, "className"> & {
  active?: boolean;
  size?: ChipSize;
  className?: string;
  compact?: boolean;
  outline?: boolean;
};

/** 링크 칩 — 상태가 쿼리스트링에 있는 필터, 정렬용(클라이언트 JS 불필요) */
export function ChipLink({ active = false, size, className, compact, outline, children, ...rest }: ChipLinkProps) {
  return (
    <Link aria-current={active ? "true" : undefined} className={chipClass({ active, size, className, compact, outline })} {...rest}>
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
