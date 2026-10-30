// 0건 검색어 기록과 추가 요청의 규칙(services/search-misses). 순수 함수와 값만 둔다 — 화면(검색 결과)과 서버가 같이 읽는다.

/** 기록할 가장 짧은 말. 한 글자는 거의 다 입력 중에 멈춘 조각이라 세지 않는다 */
export const MISS_MIN_LENGTH = 2;
/** 기록할 가장 긴 말. 검색칸 상한(MAX_PARAM_LEN)보다 짧게 — 문장을 통째로 붙여 넣은 것은 게임 이름이 아니다 */
export const MISS_MAX_LENGTH = 60;
/** 데이터 점검 줄의 규칙 이름(data_issues.rule). 관리자 화면 이름표는 lib/admin/messages/quality 의 QUALITY_RULE_LABEL */
export const SEARCH_REQUEST_RULE = "search_request";
/** 추가 요청 한도 — 한 IP 가 한 시간에. 사람이 찾는 게임을 하나씩 누르는 속도는 넉넉히 받고, 스크립트가 판을 덮는 것은 막는다 */
export const MISS_REQUEST_LIMIT = { limit: 10, windowSec: 60 * 60 } as const;

/** 같은 말을 한 줄로 세는 열쇠. 대소문자, 앞뒤 공백, 여러 칸 띄어쓰기만 접는다 — 철자는 건드리지 않는다(오타도 그 자체로 구멍이다) */
export function normalizeMissQuery(q: string): string | null {
  const key = q.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
  if (key.length < MISS_MIN_LENGTH || key.length > MISS_MAX_LENGTH) return null;
  return key;
}
