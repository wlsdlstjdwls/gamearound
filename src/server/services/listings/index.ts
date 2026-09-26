// 상품, 재고 서비스 — 관심사로 쪼개 두고 호출부 import 경로는 `@/server/services/listings` 하나로 유지한다(AGENTS §4).
//
// 이 계층이 답하는 것 셋: "이 매장이 무엇을 파나", "이 게임을 파는 곳이 어디인가", "재고가 몇 개 남았나".
// 라우트는 SQL 을 직접 쓰지 않는다(AGENTS §1).
//
//   read    판매 목록, 파는 곳, 기종 사전 조회
//   write   올리기, 재고 고치기, 내리기(손입력과 CSV 가 같이 지난다)
//   import  CSV 한 파일을 줄마다 반영
//   lookup  바코드로 이미 있는 상품 찾기
//   photos  판매 줄 사진(Blob 파일과 표 행을 같이 다룬다)
export * from "./read";
export * from "./write";
export * from "./import";
export * from "./lookup";
export * from "./photos";
