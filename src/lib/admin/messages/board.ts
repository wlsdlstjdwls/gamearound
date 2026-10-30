// 관리자 첫 화면 업무 현황판 문구(components/admin/work-board).
// 칸 이름은 메뉴 낱말(ADMIN_NAV)을 그대로 쓰지 않는다 — 메뉴는 화면 이름이고 이 칸은 "그 화면에 쌓인 일" 이다.
// 기준(hint)은 숫자가 무엇을 세는지 한 줄로 말한다. 백오피스 첫 화면이 칸마다 "최근 7일 내 요청 건" 꼴로 적어 두는 것과 같은 까닭이다 —
// 기준을 모르면 0 을 믿지 못하고 결국 화면을 열어 다시 센다.
export const ADMIN_BOARD_MESSAGES = {
  title: "대시보드",
  asOf: (time: string) => `${time} 기준`,
  allClear: "처리할 업무가 없어요.",
  failed: "현황을 불러오지 못했어요. 왼쪽 메뉴에서 화면별로 확인해 주세요.",
  unit: "건",
  /** 묶음 머리의 번호 낭독. 화면에는 숫자만 선다 */
  groupCount: (n: number) => `처리 대기 ${n}건`,

  refundRequests: "환불 요청",
  refundRequestsHint: "환불 요청 후 아직 환불하지 않은 결제",
  boostMissing: "광고 미적용 결제",
  boostMissingHint: "결제는 완료됐지만 광고가 적용되지 않은 건. 수동 등록이 필요해요",
  membershipsPastDue: "결제 실패 구독",
  membershipsPastDueHint: "정기결제 실패로 재청구 대기 중인 메이커 멤버십",
  promosEndingSoon: "종료 임박 광고",
  promosEndingSoonHint: (days: number) => `노출 중이며 ${days}일 안에 종료되는 광고`,
  monthPaid: "이번 달 결제",
  monthPaidHint: "이번 달(한국 시간) 승인 결제 합계. 환불 건 포함",

  tasksTodo: "할 일",
  tasksTodoHint: "업무요청 보드의 할 일 상태 건. 작업대기, 완료는 제외해요",
  tasksDoing: "처리 중",
  tasksDoingHint: "업무요청 보드의 처리 중 상태 건",

  sourcesAttention: "조치 필요 스토어",
  sourcesAttentionHint: "최근 수집이 실패, 일부 실패했거나 종료되지 않고 멈춘 스토어",
  failedRunsToday: "금일 수집 실패",
  failedRunsTodayHint: "금일(한국 시간) 실패로 종료된 수집 실행 수",

  matches: "매칭 승인 대기",
  matchesHint: "스토어 상품과 게임의 유사도가 애매해 승인이 필요한 건",
  dataIssues: "데이터 오류",
  dataIssuesHint: "데이터 점검에서 확인을 요청한 미처리 건",
  companies: "회사정보 확정 대기",
  companiesHint: (limit: number) => `개발사, 배급사 표기 중 회사정보와 연결되지 않은 건. 최대 ${limit}건까지 집계해요`,
  preorder: "예약특전 검토 대기",
  preorderHint: "게임 미연결 또는 특전 미추출 예약특전글",

  indieReview: "등록 승인 대기",
  indieReviewHint: "등록 승인을 기다리는 인디 홍보글",
  indieReported: "신고 접수 인디글",
  indieReportedHint: "공개 중 신고가 누적된 인디 홍보글",
  indieLinks: "게임 연결 확인",
  indieLinksHint: "인디글에 연결한 게임의 확인이 필요한 건",
  postsToday: "금일 신규 게시글",
  postsTodayHint: "금일(한국 시간) 게시판, 라운지 신규 게시글. 처리 대상이 아닌 참고 지표예요",
  commentsToday: "금일 신규 댓글",
  commentsTodayHint: "금일(한국 시간) 신규 댓글. 처리 대상이 아닌 참고 지표예요",

  shops: "입점 승인 대기",
  shopsHint: "심사 대기 중인 매장 입점 신청",
  products: "상품 매핑 대기",
  productsHint: "매칭 후보만 있고 매핑되지 않은 매장 상품",
} as const;
