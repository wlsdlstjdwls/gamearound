// 검색 결과 화면 문구(app/(public)/search). 예전엔 화면 파일 안에 적혀 있었다 — 추가 요청 단추가 붙으며 한곳에 모았다. "-해요" 체.
export const SEARCH_MESSAGES = {
  title: "검색",
  resultTitle: (q: string) => `"${q}" 검색 결과`,
  count: (n: number) => `${n}건`,
  sortLabel: "정렬",
  emptyQueryTitle: "검색어를 입력하세요",
  emptyQueryBody: "위 검색창에 게임 제목(한글 또는 영문)을 입력하면 결과가 바로 따라와요.",
  emptyQueryAction: "전체 게임 목록 보기",
  /** 결과 0건. 다시 찾는 길(목록)과 알리는 길(추가 요청)을 같이 준다 */
  missTitle: "찾는 게임이 아직 없어요",
  missBody: "제목 일부나 영문 제목으로 다시 찾아보세요. 그래도 없으면 알려 주세요, 먼저 채워 둘게요.",
  /** 결과는 있는데 맨 아래에 서는 판 */
  reportTitle: "찾는 게임이 없나요?",
  reportBody: "제목 일부나 영문 제목으로 다시 찾아보거나, 추가를 요청해 주세요.",
  listAction: "전체 목록에서 찾기",
  request: "이 게임 추가 요청",
  requested: "요청했어요. 먼저 채워 둘게요",
  requestFailed: "요청을 받지 못했어요. 잠시 뒤 다시 해 주세요",
  requestLimited: "요청이 너무 많아요. 잠시 뒤 다시 해 주세요",
  requestInvalid: "두 글자 이상, 60자 이하 검색어만 요청할 수 있어요",
  /** 관리자 데이터오류관리 화면에 서는 사유 한 줄 */
  requestIssueReason: (q: string, requests: number, misses: number) => `"${q}" 추가 요청 ${requests}회, 결과 0건 검색 ${misses}회`,
} as const;
