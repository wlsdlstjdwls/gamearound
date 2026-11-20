// 필터 조각들이 같이 쓰는 값. 클라이언트 조각(groups, active)에 두지 않는 이유:
// 서버 컴포넌트가 "use client" 파일의 문자열 상수를 가져오면 값이 아니라 클라이언트 참조가 와서
// className 이 통째로 빠진다(2026-10-12 푸터에서 실제로 났던 사고, site-footer 주석).
import { DEVICE_LABEL } from "@/lib/platform";

/**
 * 필터를 고르는 일은 "다른 곳으로 가는" 일이 아니라 "보던 자리에서 거르는" 일이다.
 * 기본값(scroll)대로 두면 누를 때마다 맨 위로 튄다 — 왼쪽 기둥은 붙어 있어 필터는 계속 보이는데
 * 보고 있던 줄만 사라진다.
 */
export const KEEP_SCROLL = { scroll: false } as const;

/**
 * 무리 이름표. 13.5px 먹색 굵은 글자다(2026-10-12, 사용자: "필터 가시성 높게").
 * 예전 꼬리표(12px 회색, 자간 벌림)는 흰 판 위에서 칩보다 흐려 무리가 어디서 갈리는지 안 읽혔다.
 */
export const FILTER_LABEL = "text-[13.5px] font-bold tracking-[-0.02em] text-ink";

/**
 * 목록 막대의 플랫폼 넷(기획서 v2.0 S-02: PC, PlayStation, XBOX SERIES X|S, NINTENDO SWITCH).
 * Xbox 는 세대 이름 없이 "Xbox" 로만 쓴다(2026-10-28 사용자) — 값 xbox 가 이미 세대를 묶고, 다른 칸(PlayStation)도 세대를 안 쓴다.
 * 값은 기존 주소 값 그대로다 — PC 는 갈래(pc), 나머지는 같은 기기의 세대 묶음(lib/platform 의 PLATFORM_BRANDS)이다.
 * 갈래 "콘솔" 은 넷에 없다. 주소로 들어오면 막대가 그 값을 한 칸 더 세워 보여 준다(bar 주석).
 * 이름은 카드와 같은 DEVICE_LABEL 에서 읽는다(2026-10-30) — 따로 적어 두었더니 필터와 카드의 이름이 갈렸다.
 */
export const LIST_PLATFORM_CHOICES = [
  { label: DEVICE_LABEL.pc, values: ["pc"] },
  { label: DEVICE_LABEL.playstation, values: ["ps5", "ps4"] },
  { label: DEVICE_LABEL.xbox, values: ["xbox"] },
  { label: DEVICE_LABEL.switch, values: ["switch", "switch2"] },
] as const;

/** 정렬 선택지(기획서 v2.0 S-02, S-04 의 "정렬 옵션"). 앞이 기본값이다 — defaultSortFor 와 같은 순서여야 한다 */
export const SORTS_ALL = ["popular", "discount", "release"] as const;
export const SORTS_SALE = ["discount", "popular", "release"] as const;

/**
 * 목록 안 검색이 멈춘 뒤 주소로 가기까지(ms). 입력마다 가면 글자마다 목록 조회가 하나씩 붙는다.
 * 350 은 한 낱말을 치는 사이의 손 멈춤보다 길고, "다 쳤는데 안 바뀐다" 로 읽히기 전의 값이다
 */
export const LIST_SEARCH_DEBOUNCE_MS = 350;

/*
 * 목록 위 필터 막대의 모양 — 전체 게임(./bar)과 출시 예정(components/upcoming-filter-bar)이 같이 쓴다(2026-11-20).
 * 두 막대가 따로 적고 있어 한쪽만 고치면 두 화면 필터가 갈렸다.
 *
 * 좁은 화면(sm 미만)은 판 없이 한 줄 가로로 미끄러지는 알약 줄이다(사용자 "필터가 UI/UX 관점에서 불편", 390px 실측).
 * 44px 칸 셋과 초기화가 흰 판 안에서 두 줄로 서서 첫 화면의 3분의 1을 먹었다. 목록 안 검색칸은 그 폭에서 걷었다(머리띠 검색과 중복).
 * 줄은 본문 좌우 여백(px-5)까지 넘겨 화면 끝에서 잘려 보이게 한다 — 끝이 잘려 있어야 "옆으로 더 있다" 가 읽힌다.
 * 위아래 py-2 -my-2 는 칸 밖으로 8px 넘기는 손가락 덧면(.tap-inset)이 스크롤 상자에 잘리지 않게 둔 자리다.
 * sm 부터는 예전 흰 판 그대로다.
 */
export const FILTER_PANEL_CLASS =
  "-mx-5 -my-2 flex items-center gap-2 overflow-x-auto px-5 py-2 [scrollbar-width:none] sm:mx-0 sm:my-0 sm:flex-wrap sm:overflow-visible sm:rounded-[var(--radius-panel)] sm:bg-surface sm:p-2 sm:shadow-hair lg:flex-nowrap lg:gap-2.5 lg:p-2.5";

/** 막대 안 드롭다운 칸. 좁은 화면은 글자만큼(shrink-0), sm 부터 나눠 갖는다. lg 폭은 칸마다 달라 부르는 쪽이 붙인다 */
export const FILTER_SELECT_CLASS = "shrink-0 sm:min-w-0 sm:flex-[1_1_140px] lg:flex-none";

/**
 * 필터 초기화. 좁은 화면에서는 걸린 조건이 있을 때만 선다(FILTER_RESET_IDLE) — 걸린 게 없는데 서 있으면 칸 하나만 먹는다.
 * 넓은 화면은 늘 선다(바꾸지 않는다). IDLE 은 단추를 감싸는 span 에 준다 — 단추에 hidden 을 같이 주면 inline-flex 와 CSS 순서 싸움이 된다(cn 은 겹친 값을 안 지운다)
 */
export const FILTER_RESET_CLASS =
  "tap-inset inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full px-3 text-[13.5px] font-medium text-mut hover:bg-surface-2 hover:text-ink sm:h-11 sm:rounded-xl";
export const FILTER_RESET_IDLE = "hidden sm:contents";

/**
 * 둘째 줄(요즘 많이 찾는 장르, 켜고 끄는 조건). 좁은 화면은 한 줄 가로 스크롤이다 — 꺾이면 이름표와 칩 넷이 두 줄을 먹었다.
 * 칩은 compact(덧면 44px)라 py-2 -my-2 로 덧면 자리를 둔다(위 FILTER_PANEL_CLASS 와 같은 이유)
 */
export const FILTER_CHIP_ROW_CLASS =
  "-mx-5 -my-2 flex items-center gap-2 overflow-x-auto px-5 py-2 [scrollbar-width:none] sm:mx-0 sm:my-0 sm:flex-wrap sm:gap-y-2 sm:overflow-visible sm:p-0 [&>*]:shrink-0";
