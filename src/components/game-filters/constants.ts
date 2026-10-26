// 필터 조각들이 같이 쓰는 값. 클라이언트 조각(groups, active)에 두지 않는 이유:
// 서버 컴포넌트가 "use client" 파일의 문자열 상수를 가져오면 값이 아니라 클라이언트 참조가 와서
// className 이 통째로 빠진다(2026-10-12 푸터에서 실제로 났던 사고, site-footer 주석).

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
 * 값은 기존 주소 값 그대로다 — PC 는 갈래(pc), 나머지는 같은 기기의 세대 묶음(lib/platform 의 PLATFORM_BRANDS)이다.
 * 갈래 "콘솔" 은 넷에 없다. 주소로 들어오면 막대가 그 값을 한 칸 더 세워 보여 준다(bar 주석).
 */
export const LIST_PLATFORM_CHOICES = [
  { label: "PC", values: ["pc"] },
  { label: "PlayStation", values: ["ps5", "ps4"] },
  { label: "Xbox Series X|S", values: ["xbox"] },
  { label: "Nintendo Switch", values: ["switch", "switch2"] },
] as const;

/** 정렬 선택지(기획서 v2.0 S-02, S-04 의 "정렬 옵션"). 앞이 기본값이다 — defaultSortFor 와 같은 순서여야 한다 */
export const SORTS_ALL = ["popular", "discount", "release"] as const;
export const SORTS_SALE = ["discount", "popular", "release"] as const;

/**
 * 목록 안 검색이 멈춘 뒤 주소로 가기까지(ms). 입력마다 가면 글자마다 목록 조회가 하나씩 붙는다.
 * 350 은 한 낱말을 치는 사이의 손 멈춤보다 길고, "다 쳤는데 안 바뀐다" 로 읽히기 전의 값이다
 */
export const LIST_SEARCH_DEBOUNCE_MS = 350;
