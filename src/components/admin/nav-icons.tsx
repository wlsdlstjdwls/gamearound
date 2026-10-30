// 관리자 메뉴 그림 — 이 메뉴에서만 쓴다.
//
// 공용 icons.tsx 에 넣지 않은 이유(AGENTS §3: 1곳이면 지역에 둔다): 이 일곱은 관리자 화면의
// 일곱 칸과 일대일로 붙어 있어 다른 화면이 부를 일이 없다. 공용 파일에 섞으면 손님 화면이 쓰는
// 대여섯 개 사이에 관리자 전용 그림이 묻힌다.
//
// 그림은 글자를 대신하지 않는다 — 이 메뉴는 그림과 글자를 늘 함께 세운다. 그림이 맡는 일은
// 세로로 선 일곱 줄에서 **눈이 돌아올 자리를 만드는 것**이다. 글자만 있는 목록은 훑을 때
// 어느 줄에 있었는지를 매번 다시 읽어야 한다.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 18, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...rest,
  };
}

/** 업무 현황 — 묶음 기둥이 나란히 선 판 */
export function BoardIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <rect x="3" y="4" width="5" height="16" rx="1.5" />
      <rect x="10" y="4" width="5" height="10" rx="1.5" />
      <rect x="17" y="4" width="4" height="13" rx="1.5" />
    </svg>
  );
}

/** 수집 현황 — 소스마다 한 칸씩 서는 격자 */
export function PulseIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M3 12h4l2.5-6 4 13 2.5-7h5" />
    </svg>
  );
}

/** 실행 로그 — 시간 순으로 쌓인 줄 */
export function LogIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h10" />
    </svg>
  );
}

/** 공통코드관리 — 꺾쇠 괄호 */
export function CodeIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M8 6l-5 6 5 6" />
      <path d="M16 6l5 6-5 6" />
      <path d="M13.5 5l-3 14" />
    </svg>
  );
}

/** 알림템플릿관리 — 줄이 비어 있는 종이 */
export function TemplateIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h3" />
    </svg>
  );
}

/** 알림발송관리 — 종이비행기 */
export function SendIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M21 3L10 14" />
      <path d="M21 3l-7 18-4-7-7-4 18-7z" />
    </svg>
  );
}

/** 매칭 대기 — 둘을 잇는 고리 */
export function LinkIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M10 13.5a4 4 0 0 0 5.7.3l2.6-2.6a4 4 0 0 0-5.7-5.7l-1.5 1.5" />
      <path d="M14 10.5a4 4 0 0 0-5.7-.3l-2.6 2.6a4 4 0 0 0 5.7 5.7l1.5-1.5" />
    </svg>
  );
}

/** 회사 이름 — 건물 */
export function BuildingIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" />
      <path d="M15 11h2a2 2 0 0 1 2 2v8" />
      <path d="M3 21h18" />
      <path d="M9 7h2M9 11h2M9 15h2" />
    </svg>
  );
}

/** 상품 매핑 — 매장이 올린 물건 상자 */
export function BoxIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M21 8.5 12 3.5 3 8.5v7L12 20.5l9-5v-7Z" />
      <path d="m3 8.5 9 5 9-5" />
      <path d="M12 13.5v7" />
    </svg>
  );
}

/** 입점 신청 — 차양을 단 가게 */
export function StoreIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 10v10h16V10" />
      <path d="M3 10 5 4h14l2 6a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0Z" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

/** 할 일 — 체크한 목록 */
export function CheckListIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="m3 7 2 2 3-3" />
      <path d="m3 17 2 2 3-3" />
      <path d="M12 8h9" />
      <path d="M12 18h9" />
    </svg>
  );
}

/** 데이터 점검 — 돋보기. 기계가 카탈로그를 훑어 찾은 것을 본다 */
export function SearchCheckIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
      <path d="m8 11 2 2 4-4" />
    </svg>
  );
}

/** 게시글 — 말풍선 안의 글 두 줄 */
export function ChatIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12Z" />
      <path d="M9 10h6" />
      <path d="M9 14h4" />
    </svg>
  );
}

// 2026-10-29(사용자 "왼쪽 메뉴 아이콘이 겹치는 게 있다"): 광고 관리와 화면 연출이 둘 다 화면(Monitor) 그림이었다.
// 수익 다섯 칸은 각자 하는 일을 그린다 — 광고는 확성기, 구독은 사람들, 결제는 카드. 화면 연출은 반짝임.

/** 광고 관리 — 확성기. 돈 받고 앞에 세워 주는 자리 */
export function MegaphoneIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

/** 구독 관리 — 사람 둘. 지금 돈을 내고 있는 사람들 */
export function UsersIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" />
      <path d="M18 14.2a6.5 6.5 0 0 1 3.5 5.8" />
    </svg>
  );
}

/** 결제 관리 — 카드 */
export function CardIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M2.5 10h19" />
      <path d="M6.5 15h4" />
    </svg>
  );
}

/** 화면 연출 — 반짝임. 공개 화면의 인트로, 효과 */
export function SparkleIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
      <path d="M12 8.5 13.2 10.8 15.5 12 13.2 13.2 12 15.5 10.8 13.2 8.5 12 10.8 10.8Z" />
    </svg>
  );
}

/**
 * 기둥 접기 단추 — 왼쪽이 갈린 사각형(2026-10-29 사용자 "접기 단추는 smokespot 참고", desktop-sidebar 의 PanelLeftIcon).
 * 평소에는 패널 그림만, 손을 올리면 접힐 쪽 화살표가 뜬다(arrowClassName 으로 호버 때만 보이게 한다)
 */
export function PanelLeftIcon({ arrow, arrowClassName, ...p }: IconProps & { arrow: "collapse" | "expand"; arrowClassName?: string }) {
  return (
    <svg {...base(p)}>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M9.5 4v16" />
      {/* 화살표는 오른쪽 칸(9.5~21) 가운데 기준으로 대칭이다 */}
      {arrow === "collapse" ? <path d="M16.5 9.5 14 12l2.5 2.5" className={arrowClassName} /> : <path d="M14 9.5 16.5 12 14 14.5" className={arrowClassName} />}
    </svg>
  );
}
