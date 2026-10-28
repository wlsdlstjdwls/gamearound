// 1~3위 칸의 색(2026-10-28). 급상승 순위 칸(community/rank-badge)과 인디 상세 머리 판의 명예의 전당 딱지가 같은 셋을 쓴다 —
// 같은 "1위" 가 화면마다 다른 색이면 순위로 읽히지 않는다. 1위는 파랑에서 보라로 번지는 그라데이션, 2위 파랑, 3위 청록.
// 금메달 노랑은 쓰지 않는다(10-27 "누런색 금지"). 클라이언트 파일이 아니다 — 서버 컴포넌트가 문자열을 그대로 읽는다(AGENTS 6장).
export const RANK_TONE = ["bg-gradient-to-br from-acc to-plum shadow-[0_6px_14px_-4px_var(--acc-glow)]", "bg-acc", "bg-info"] as const;

/** 순위 색이 붙는 자리 수 */
export const RANK_TONE_TOP = RANK_TONE.length;
