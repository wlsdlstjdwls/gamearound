// 파서 모음 — 호출부(어댑터, 테스트)는 이 파일 하나만 보면 된다.
// 실제 구현은 응답 종류별로 나뉘어 있다(appdetails / 할인 라벨 / GetItems / 카탈로그 발견).
export * from "./parse-app-details";
export * from "./parse-discount";
export * from "./parse-store-items";
export * from "./parse-discovery";
export * from "./parse-news";
export * from "./parse-requirements";
export * from "./parse-languages";
