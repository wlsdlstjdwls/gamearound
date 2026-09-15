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

/** 로딩 스피너 — CSS animate-spin */
export function SpinnerIcon(p: IconProps) {
  return (
    <svg {...base(p)} className={`animate-spin ${p.className ?? ""}`}>
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}
