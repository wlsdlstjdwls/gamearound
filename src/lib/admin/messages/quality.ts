// 데이터 점검(sync/quality) 문구. 관리자 화면과 텔레그램 알림이 같이 쓴다.
// 규칙 이름은 고치는 대상으로 짓는다(admin-screen-naming 규칙 2) — "부모 사슬" 이 아니라 무엇이 어디 잘못 붙었나.

export const QUALITY_MESSAGES = {
  /** 메뉴 낱말(ADMIN_NAV.dataIssues)과 같은 말 */
  title: "데이터오류관리",
  empty: "확인할 오류가 없어요. 점검은 매일 새벽 3시에 실행돼요.",
  apply: "적용",
  dismiss: "반려",
  noFixHint: "스토어에서 직접 확인해야 하는 항목이라 수정안이 없어요. 확인 후 확인 처리해 주세요.",
  confirmSeen: "확인했어요",
  stale: "그 사이 데이터가 변경됐어요. 다음 점검에서 다시 확인해요.",
  failed: "수정하지 못했어요. 잠시 후 다시 시도해 주세요.",
  recentAuto: "최근 자동 수정 내역",
  recentAutoEmpty: "자동 수정 내역이 없어요.",
  seen: "확인",
  verdictAuto: "자동 수정",
  search: "조회조건",
  searchView: "구분",
  viewOpen: "확인 대기",
  searchRule: "규칙",
  searchGame: "게임명",
  searchAll: "전체",
  listLabel: "데이터 오류 목록",
  detailTitle: "오류 상세",
  colVerdict: "판정",
  colRule: "규칙",
  colGame: "게임",
  colCreatedAt: "발견일",
  sectionIssue: "오류 내용",
  sectionGame: "게임",
  fieldReason: "판단 근거",
  noGame: "게임 없음",
  verdictCandidate: "확인 필요",
  verdictNotify: "스토어 확인",
  openGame: "게임 보기",
  noticeTitle: "데이터 점검 결과",
  noticeAuto: "자동 수정",
  noticeNew: "신규 확인 필요",
  noticeOpen: "미확인",
  noticeFailed: "수정 실패",
  noticeOpenLink: "데이터오류관리 열기",
} as const;

/** 규칙 이름. 키는 sync/quality/rules 의 QualityRule */
export const QUALITY_RULE_LABEL: Record<string, string> = {
  parent_more_specific: "추가 콘텐츠 상위 작품 불일치",
  release_date_gap: "출시일 누락",
  parent_chain: "추가 콘텐츠 2단 연결",
  self_parent: "자기 참조 연결",
  shared_store_id: "스토어 상품 중복 연결",
  /** 검색 결과의 "이 게임 추가 요청"(services/search-misses). 게임이 없어 게임 칸은 비어 선다 */
  search_request: "검색 추가 요청",
};
