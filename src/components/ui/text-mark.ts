// 카드 값 위의 면 없는 파란 글자 표지 — 역대 최저가(game-card), 오늘 출시(ui/release-today-mark)가 같이 쓴다.
// 클라이언트가 아닌 모듈에 두는 이유: 서버 컴포넌트(game-card)가 "use client" 파일의 문자열 상수를 가져오면 클래스가 통째로 빠진다(AGENTS 6장)
/** 2026-11-16 사용자 "역대 최저가는 면 없이 글자만". 사전예약만 먹색 알약이다(ui/preorder-mark) */
export const CARD_TEXT_MARK = "shrink-0 text-[12px] font-semibold text-acc";
