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
