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

/** 딸린 것이 더 있다는 표시 — 플랫폼 줄의 추가 콘텐츠 버튼(components/platform-addons) */
export function PlusIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

/** 더 볼 것이 있다는 표시 — 값 줄에 붙어 툴팁을 여는 자리(components/ui/tooltip 의 InfoTip) */
export function InfoIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 7.5h.01" />
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

/**
 * 필터 — 좁은 화면의 필터 시트를 여는 단추.
 * 깔때기가 아니라 슬라이더 세 줄인 이유: 이 화면의 필터는 "거른다" 보다 "값을 맞춘다" 에 가깝고
 * (정렬까지 같은 시트에 있다), 깔때기는 작은 크기에서 삼각형 얼룩으로만 보인다.
 */
export function FilterIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 7h10" />
      <path d="M18 7h2" />
      <path d="M4 17h4" />
      <path d="M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
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

/* ── 좁은 화면 전체 메뉴(site-menu)의 줄 그림 ──
   메뉴 줄에 그림을 붙인 이유(2026-09-22 사용자 요청): 시트 안에서 줄은 글자 하나뿐이라
   훑을 때 걸리는 것이 없었다. 그림이 있으면 같은 자리를 두 번째부터는 모양으로 찾는다.
   넷 다 같은 규칙으로 그린다 — 24 격자, 2px 선, 채움 없음(base). */

/** 게임 목록 — 패드. 목록 화면의 주인공이 게임이라 목록 줄이 아니라 물건을 그린다 */
export function GamepadIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M6 12h4" />
      <path d="M8 10v4" />
      <circle cx="15.5" cy="11.5" r="1" />
      <circle cx="18" cy="14" r="1" />
      <path d="M17.5 18h-11A3.5 3.5 0 0 1 3 14.5v-1A5.5 5.5 0 0 1 8.5 8h7a5.5 5.5 0 0 1 5.5 5.5v1a3.5 3.5 0 0 1-3.5 3.5Z" />
    </svg>
  );
}

/** 출시 예정 — 달력. 이 화면이 세는 것은 개수가 아니라 날짜다 */
export function ClockIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function CalendarIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </svg>
  );
}

/** 설정 — 슬라이더. 톱니는 16px 에서 톱니가 뭉개져 회색 원으로만 보인다 */
export function SlidersIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M5 6h14" />
      <path d="M5 12h14" />
      <path d="M5 18h14" />
      <circle cx="9" cy="6" r="2" />
      <circle cx="15" cy="12" r="2" />
      <circle cx="9" cy="18" r="2" />
    </svg>
  );
}

/** 관리자 — 방패. 이 줄만 아무나 못 들어가는 자리라는 것을 모양으로 말한다 */
export function ShieldIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 3l7 3v5.5c0 4.2-2.9 7.9-7 9.5-4.1-1.6-7-5.3-7-9.5V6l7-3Z" />
    </svg>
  );
}

/** 스토어 — 장바구니 가방. "이 스토어에서는 아직 확인 중" 자리(플랫폼 정보의 빈 타일)에 선다 */
export function StoreIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M5 8h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 8Z" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    </svg>
  );
}

/* ── 온보딩 퀘스트 지도의 칸 그림(2026-10-08) — 위와 같은 규칙(24 격자, 2px 선, 채움 없음) ── */

/** 기기 단계 — 모니터 */
export function MonitorIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8" />
      <path d="M12 16v4" />
    </svg>
  );
}

/** 할인 성향 단계 — 가격표 */
export function TagIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M3 12V4.5A1.5 1.5 0 0 1 4.5 3H12l9 9-9 9-9-9Z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </svg>
  );
}

/* ── 기기 입력 줄의 부품 그림(2026-10-08) — 줄 왼쪽 칸에 서서 무엇을 적는 줄인지 글보다 먼저 말한다 ── */

/** 프로세서 — 다리 달린 칩 */
export function CpuIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="0.5" />
      <path d="M9 2.5V6M15 2.5V6M9 18v3.5M15 18v3.5M2.5 9H6M2.5 15H6M18 9h3.5M18 15h3.5" />
    </svg>
  );
}

/** 그래픽 — 팬 달린 카드 */
export function GpuIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <rect x="2.5" y="6" width="19" height="11" rx="2" />
      <circle cx="9" cy="11.5" r="2.5" />
      <path d="M15 10h3.5M15 13h3.5M5 17v2.5" />
    </svg>
  );
}

/** 메모리 — 램 막대 */
export function MemoryIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <rect x="2.5" y="7" width="19" height="9" rx="1.5" />
      <path d="M6.5 10.5v2M10 10.5v2M14 10.5v2M17.5 10.5v2M5 16v2.5M19 16v2.5" />
    </svg>
  );
}

/** 구독 패스 — 한쪽에 절취선이 있는 티켓. 온보딩 구독 카드 */
export function TicketIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v8a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2V8Z" />
      <path d="M15 6v2M15 11v2M15 16v2" />
    </svg>
  );
}

/** 휴대 기기(스위치) — 양옆에 손잡이가 붙은 화면. 온보딩 플랫폼 카드에서 PC(모니터), 콘솔(패드)과 가른다 */
export function HandheldIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <rect x="6.5" y="6" width="11" height="12" rx="1" />
      <path d="M6.5 6H5a2.5 2.5 0 0 0-2.5 2.5v7A2.5 2.5 0 0 0 5 18h1.5M17.5 6H19a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 19 18h-1.5" />
      <circle cx="4.5" cy="10" r="0.6" />
      <circle cx="19.5" cy="14" r="0.6" />
    </svg>
  );
}
