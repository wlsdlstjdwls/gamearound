// 라우트 캐시 수명 — 설계서 §4.5.
// 크롤 주기(가격 8시간, 뉴스 6시간)보다 짧게 잡을 이유가 없다. 갱신은 크롤러가 revalidateTag 로 밀어 준다.
// 주의: Next 의 `export const revalidate` 는 정적으로 읽히는 값이어야 해서, 여기 값은 리터럴 상수로만 둔다.

/** 목록, 검색, 홈처럼 태그 무효화로 갱신되는 화면의 기본 재검증 주기(초) */
export const LIST_REVALIDATE_SECONDS = 3600;

/** OG 이미지용 한글 폰트 서브셋 캐시 수명(초). 글리프 구성이 같은 요청끼리 재사용된다 */
export const OG_FONT_REVALIDATE_SECONDS = 2592000;
