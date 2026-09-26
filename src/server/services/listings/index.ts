// 상품, 재고 서비스 — 관심사로 쪼개 두고 호출부 import 경로는 `@/server/services/listings` 하나로 유지한다(AGENTS §4).
//
// 이 계층이 답하는 것 셋: "이 매장이 무엇을 파나", "이 게임을 파는 곳이 어디인가", "재고가 몇 개 남았나".
// 라우트는 SQL 을 직접 쓰지 않는다(AGENTS §1).
//
//   read    판매 목록, 파는 곳, 기종 사전 조회
//   write   올리기, 재고 고치기, 내리기
export * from "./read";
export * from "./write";
