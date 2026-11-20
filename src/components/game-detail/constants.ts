// 상세 조각들이 나눠 쓰는 이름. "use client" 파일에 두지 않는다 — 서버 컴포넌트(page.tsx)가 문자열 상수를
// 클라이언트 파일에서 가져오면 값이 아니라 클라이언트 참조가 온다(AGENTS.md 6장, 2026-10-12 푸터 사고).

/** 플랫폼별 가격 비교 마디의 id. 모바일 구매 띠(buy-bar)가 이 마디가 보이는지 지켜보고, 값 없는 띠의 단추가 여기로 내려간다 */
export const PRICES_SECTION_ID = "prices";

/**
 * 휴대폰(히어로가 한 기둥인 md 아래)에서 채운 파랑 단추를 옅은 단추(soft 변형과 같은 값, ui/button) 모양으로 덮는 클래스(2026-11-20 사용자 점검 "파랑이 많다").
 * 그 폭에서는 제목 밑 최저가 줄(game-detail/quick-buy)의 구매 단추 하나만 채운 파랑이다. 넓은 화면은 변형 그대로 둔다.
 * cn 이 겹친 유틸을 걸러 주지 않지만 max-md: 규칙이 뒤에 나와 그 폭에서 이긴다
 */
export const QUIET_FILL_BELOW_MD = "max-md:border max-md:border-line-strong max-md:bg-surface max-md:text-ink max-md:shadow-hair";
