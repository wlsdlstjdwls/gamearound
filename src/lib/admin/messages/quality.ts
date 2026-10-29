// 데이터 점검(sync/quality) 문구. 관리자 화면과 텔레그램 알림이 같이 쓴다.
// 규칙 이름은 고치는 대상으로 짓는다(admin-screen-naming 규칙 2) — "부모 사슬" 이 아니라 무엇이 어디 잘못 붙었나.

export const QUALITY_MESSAGES = {
  /** 메뉴 낱말(ADMIN_NAV.dataIssues)과 같은 말 */
  title: "데이터오류관리",
  lead: "수집이 쌓은 카탈로그에서 기계가 찾은 문제예요. 확실한 것은 이미 고쳤고, 여기 남은 것은 한 번 봐 주셔야 해요.",
  empty: "볼 것이 없어요. 점검은 매일 새벽 3시에 돌아요.",
  apply: "맞아요, 고쳐요",
  dismiss: "아니에요",
  noFixHint: "스토어에서 직접 확인해야 하는 문제라 고칠 안이 없어요. 확인한 뒤 넘겨 주세요.",
  confirmSeen: "확인했어요",
  stale: "그 사이 값이 바뀌었어요. 다음 점검에서 다시 볼게요.",
  failed: "고치지 못했어요. 잠시 뒤 다시 눌러 주세요.",
  recentAuto: "최근 자동으로 고친 것",
  recentAutoEmpty: "아직 자동으로 고친 것이 없어요.",
  verdictCandidate: "확인 필요",
  verdictNotify: "스토어 확인",
  openGame: "게임 보기",
  noticeTitle: "데이터 점검 결과",
  noticeAuto: "자동으로 고침",
  noticeNew: "새로 확인할 것",
  noticeOpen: "남은 확인",
  noticeFailed: "고치다 실패",
  noticeOpenLink: "데이터오류관리 열기",
} as const;

/** 규칙 이름. 키는 sync/quality/rules 의 QualityRule */
export const QUALITY_RULE_LABEL: Record<string, string> = {
  parent_more_specific: "추가 콘텐츠가 다른 작품 밑에 있어요",
  release_date_gap: "출시일이 비었어요",
  parent_chain: "추가 콘텐츠가 두 단 밑에 붙었어요",
  self_parent: "자기 자신 밑에 붙었어요",
  shared_store_id: "한 상품을 여러 게임이 나눠 가졌어요",
};
