// LIKE, ILIKE 부분 일치 무늬. % 와 _ 와 \ 를 글자로 찾게 이스케이프한다 — 안 그러면 "100%" 가 전부를 맞힌다.
// 같은 함수가 게시판, 관리자 글, 제목 검색에 지역 함수로 셋 있었다(AGENTS 3장: 둘째부터 뽑는다). 새 자리는 이걸 쓴다.
export function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}

/** "%검색어%" — 앞뒤 공백은 다듬는다 */
export function containsPattern(q: string): string {
  return `%${escapeLike(q.trim())}%`;
}
