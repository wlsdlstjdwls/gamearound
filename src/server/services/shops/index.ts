// 매장 서비스 — 관심사로 쪼개 두고 호출부 import 경로는 `@/server/services/shops` 하나로 유지한다(AGENTS §4).
//
//   core   기본 조회와 권한("이 사람이 이 매장을 만질 수 있나")
//   apply  입점 신청과 심사
//   public 손님이 보는 매장 찾기, 매장 페이지
export * from "./core";
export * from "./apply";
export * from "./public";
