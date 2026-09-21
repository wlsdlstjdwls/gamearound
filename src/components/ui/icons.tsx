// 인라인 SVG 아이콘 — 외부 아이콘 패키지를 들이지 않는다(몇 개 때문에 번들을 늘릴 이유 없음). currentColor 사용.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 18, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...rest,
  };
}

/** 검색 — 헤더 입력칸 왼쪽. 유니코드 ⌕ 를 쓰면 글꼴마다 굵기와 기준선이 달라 입력칸이 들쭉날쭉했다 */
export function SearchIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

export function EyeIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" />
      <path d="M9.9 5.2A10.5 10.5 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1" />
      <path d="M6.6 6.6C3.8 8.5 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.3-1" />
    </svg>
  );
}

export function CheckIcon(p: IconProps) {
  return (
    <svg {...base({ strokeWidth: 3, ...p })}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

/** 뒤로 — 되돌아가는 링크 앞에 선다. 화살표 "글자"(←)는 화면 문구에서 금지지만(AGENTS §4),
 *  그건 글 안에 섞이는 기호 얘기다. 여기 화살표는 글이 아니라 아이콘이고, 어디로 가는지는 옆 문구가 말한다 */
export function ChevronLeftIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="m14.5 5-7 7 7 7" />
    </svg>
  );
}

/** 입력칸 비우기 */
export function XIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M6 6 18 18M18 6 6 18" />
    </svg>
  );
}

export function ChevronDownIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function LogOutIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M21 3v18" opacity="0.5" />
    </svg>
  );
}

export function AlertCircleIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <path d="M12 16.5h.01" />
    </svg>
  );
}

/** 위시리스트 — 헤더 메뉴(좁은 화면은 글자 없이 이것만 선다) */
export function HeartIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 20s-7-4.4-7-9.2A4 4 0 0 1 12 8a4 4 0 0 1 7 2.8c0 4.8-7 9.2-7 9.2Z" />
    </svg>
  );
}

/** 가격 알림 — 헤더 메뉴. 종을 고른 이유: 이 화면에서 알림은 "값이 내려가면 알려 준다" 는 약속이라
    느낌표(AlertCircle)의 경고와 뜻이 다르다 */
export function BellIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16S18 14 18 9Z" />
      <path d="M13.7 19a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

/** 메뉴 — 좁은 화면 헤더의 햄버거. 줄 사이는 6px, 24 그리드 한가운데에 맞춘다 */
export function MenuIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}

/** 로딩 스피너 — CSS animate-spin */
export function SpinnerIcon(p: IconProps) {
  return (
    <svg {...base(p)} className={`animate-spin ${p.className ?? ""}`}>
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}

/**
 * 스팀덱 — 손잡이 둘에 화면 하나. 밸브 로고를 쓰지 않는 이유는 그게 상표라서다.
 * 기기 실루엣은 사실만 말하고, 어느 등급인지는 옆 글자가 말한다.
 */
export function DeckIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <rect x="2" y="6" width="20" height="12" rx="4" />
      <rect x="7.5" y="9.5" width="9" height="5" rx="1" />
      <circle cx="5" cy="10" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="19" cy="14" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** 모자람 — 부위 판정에서 "이건 안 된다" 자리. XIcon 과 달리 원 안에 담아 상태로 읽히게 한다 */
export function XCircleIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15 9-6 6M9 9l6 6" />
    </svg>
  );
}

/** 충족 */
export function CheckCircleIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </svg>
  );
}

/** 확인 못 함 — 물음표가 아니라 가로줄이다. 물음표는 "네가 답하라" 로 읽힌다 */
export function MinusCircleIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12h7" />
    </svg>
  );
}
