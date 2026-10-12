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
