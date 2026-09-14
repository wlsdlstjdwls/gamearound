// 라우트 캐시 수명 — 설계서 §4.5.
// 크롤 주기(가격 8시간, 뉴스 6시간)보다 짧게 잡을 이유가 없다. 갱신은 크롤러가 revalidateTag 로 밀어 준다.
// 주의: Next 의 `export const revalidate` 는 정적으로 읽히는 값이어야 해서, 여기 값은 리터럴 상수로만 둔다.

/** 목록, 검색, 홈처럼 태그 무효화로 갱신되는 화면의 기본 재검증 주기(초) */
export const LIST_REVALIDATE_SECONDS = 3600;

/** OG 이미지용 한글 폰트 서브셋 캐시 수명(초). 글리프 구성이 같은 요청끼리 재사용된다 */
export const OG_FONT_REVALIDATE_SECONDS = 2592000;

/**
 * 한 번의 /api/revalidate 요청에 담는 태그 수 상한.
 * 크롤 한 번이 만드는 태그가 수천 개까지 간다(2026-09-14: steam 시드 실행에서 1,341개) —
 * 한 번에 다 보내면 라우트 검증에 걸려 400 이 나고 그 실행의 캐시 무효화가 통째로 날아간다.
 * 서버(라우트)와 클라이언트(sync/revalidate)가 같은 값을 봐야 해서 여기 둔다.
 */
export const REVALIDATE_TAGS_PER_REQUEST = 500;
