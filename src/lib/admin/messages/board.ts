// 관리자 첫 화면 업무 현황판 문구(components/admin/work-board).
// 칸 이름은 메뉴 낱말(ADMIN_NAV)을 그대로 쓰지 않는다 — 메뉴는 화면 이름이고 이 칸은 "그 화면에 쌓인 일" 이다.
// 기준(hint)은 숫자가 무엇을 세는지 한 줄로 말한다. 백오피스 첫 화면이 칸마다 "최근 7일 내 요청 건" 꼴로 적어 두는 것과 같은 까닭이다 —
// 기준을 모르면 0 을 믿지 못하고 결국 화면을 열어 다시 센다.
export const ADMIN_BOARD_MESSAGES = {
  title: "업무 현황",
  lead: "묶음마다 쌓인 일을 세어요. 숫자를 누르면 그 일을 하는 화면으로 가요.",
  asOf: (time: string) => `${time} 기준`,
  allClear: "쌓인 일이 없어요.",
  failed: "현황을 못 불러왔어요. 왼쪽 메뉴에서 화면마다 볼 수 있어요.",
  unit: "건",
  /** 묶음 머리의 번호 낭독. 화면에는 숫자만 선다 */
  groupCount: (n: number) => `쌓인 일 ${n}건`,

  refundRequests: "환불 요청",
  refundRequestsHint: "이용자가 환불을 요청했고 아직 돌려주지 않은 결제",
  boostMissing: "노출 안 걸린 결제",
  boostMissingHint: "돈은 들어왔는데 광고 자리가 걸리지 않은 결제. 손으로 걸어야 해요",
  membershipsPastDue: "결제 실패 구독",
  membershipsPastDueHint: "정기 청구가 실패해 다시 청구를 기다리는 메이커 멤버십",
  promosEndingSoon: "곧 끝나는 광고",
  promosEndingSoonHint: (days: number) => `지금 걸려 있고 ${days}일 안에 끝나는 광고`,
  monthPaid: "이번 달 결제",
  monthPaidHint: "이번 달(한국 날짜)에 승인된 결제 합계. 환불된 결제도 들어가요",

  tasksTodo: "할 일",
  tasksTodoHint: "할 일 판의 할 일 칸. 언젠가 칸과 끝난 칸은 세지 않아요",
  tasksDoing: "하는 중",
  tasksDoingHint: "할 일 판의 하는 중 칸",

  sourcesAttention: "손볼 스토어",
  sourcesAttentionHint: "마지막 수집이 실패했거나 일부 실패했거나, 끝나지 않고 멈춘 스토어",
  failedRunsToday: "오늘 실패한 실행",
  failedRunsTodayHint: "오늘(한국 날짜) 실패로 끝난 수집 실행 수",

  matches: "매칭 대기",
  matchesHint: "스토어 상품과 게임이 애매하게 닮아 사람이 판정해야 하는 것",
  dataIssues: "데이터 점검",
  dataIssuesHint: "데이터 점검기가 사람에게 물은 것 중 아직 답하지 않은 것",
  companies: "회사 이름 확인",
  companiesHint: (limit: number) => `개발사, 배급사 표기 중 아직 회사로 잇지 못한 조합. ${limit}개까지만 세요`,
  preorder: "예약 특전 검토",
  preorderHint: "게임을 못 이었거나 특전을 못 뽑은 예약 특전 글",

  indieReview: "등록 승인 대기",
  indieReviewHint: "올라와서 승인을 기다리는 인디 홍보 글",
  indieReported: "신고 들어온 인디 글",
  indieReportedHint: "공개 중인데 신고가 쌓인 인디 홍보 글",
  indieLinks: "게임 연결 확인",
  indieLinksHint: "인디 글이 고른 게임 연결을 사람이 확인해야 하는 것",
  postsToday: "오늘 새 글",
  postsTodayHint: "오늘(한국 날짜) 게시판, 라운지에 올라온 글. 쌓인 일이 아니라 훑어볼 양이에요",
  commentsToday: "오늘 새 댓글",
  commentsTodayHint: "오늘(한국 날짜) 달린 댓글. 쌓인 일이 아니라 훑어볼 양이에요",

  shops: "입점 신청",
  shopsHint: "심사를 기다리는 매장 신청",
  products: "상품 매핑",
  productsHint: "매장 상품에 게임 후보만 달리고 아직 잇지 않은 것",
} as const;
