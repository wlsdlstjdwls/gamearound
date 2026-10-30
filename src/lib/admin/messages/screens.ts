// 관리자 화면 문구. 메뉴 낱말, 화면 제목, 표 머리, 빈 상태를 여기서만 정한다.
//
// 관리자 화면은 그동안 "-습니다"체와 영문 원값(ok, steam)을 그대로 썼다. 공개 화면 규약(-해요체)과
// 어긋나기도 했지만, 진짜 문제는 **화면 이름이 하는 일을 말해 주지 않았다**는 것이다.
// "대시보드", "판", "회사" 로는 눌러 보기 전에는 그 자리에서 무엇을 하는지 알 수 없었다.
// 그래서 이름을 전부 "명사 + 하는 일"로 바꾸고, 각 화면 첫 줄에 그 자리의 일을 한 문장으로 적는다.

/**
 * 관리자 메뉴 낱말. 메뉴와 각 화면 제목이 **같은 말**이어야 한다 —
 * 메뉴에서 "매칭 대기" 를 누르고 들어간 화면 제목이 "매칭 검수 큐" 면 같은 곳인지 의심하게 된다.
 */
export const ADMIN_NAV = {
  /** 기둥 머리. 이 영역이 손님 화면이 아니라는 것을 한 번만 말한다 */
  consoleTitle: "관리자",
  backToSite: "서비스 화면으로",
  // ---- 메뉴 이름(2026-10-29 밤, 사용자 "명칭 통일, 일상적으로 쓰는 업무 용어로" + 신세계TV 백오피스 참고, 사용자가 표를 보고 골랐다) ----
  // 묶음은 "~관리", 화면은 "대상 + 끝말" 이다. 끝말 규칙(백오피스 화면 이름 665개 집계와 같다):
  //   고치는 화면 ~관리 | 새로 만드는 화면 ~등록 | 보기만 하는 화면 ~조회, ~현황 | 승인, 반려가 일인 화면 ~승인관리.
  // 화면 제목도 이 값을 그대로 쓴다(admin 화면의 PageHead, metadata) — 메뉴와 제목이 다른 말을 하면 같은 화면을 두 이름으로 부르게 된다.
  // 앞 이름은 괄호 안: 수익(구독상품, 프로모션, 광고 관리, 구독 관리, 결제 관리), 운영(할 일, 화면 연출), 수집(수집 현황, 실행 로그),
  // 검수(매칭 대기, 데이터 점검, 회사 이름, 예약 특전), 커뮤니티(인디 홍보, 게시글), 매장(입점 신청, 상품 매핑).
  /** 파는 것을 만드는 묶음. 수익 묶음을 "무엇을 파나" 와 "팔린 뒤" 로 갈랐다(백오피스의 상품관리, 주문관리) */
  groupProducts: "상품관리",
  groupOrders: "주문관리",
  groupOps: "운영관리",
  groupSync: "수집관리",
  groupReview: "데이터관리",
  /** 사람이 올린 것(인디 등록, 게시글)을 보는 묶음. 기획서 v2.0 이 운영진 일로 꼽은 셋(승인, 노출 관리, 숨김)이 여기 모인다 */
  groupCommunity: "게시판관리",
  /** 오프라인 매장 축(입점 신청, 매장 상품을 게임에 잇기) */
  groupShops: "매장관리",
  /** 첫 화면. 묶음마다 쌓인 일 건수판(components/admin/work-board) */
  board: "대시보드",
  overview: "수집현황",
  logs: "수집이력조회",
  matches: "스토어매칭승인관리",
  /** 데이터 점검기(sync/quality)가 사람에게 묻는 것 */
  dataIssues: "데이터오류관리",
  companies: "회사정보관리",
  products: "매장상품매핑관리",
  shops: "입점승인관리",
  /** 인디 홍보 글의 등록 승인, 신고, 게임 연결 확인 */
  indie: "인디게임승인관리",
  /** 한국닌텐도 특전 글. 못 이은 글을 잇고, 틀린 글을 숨긴다 */
  preorder: "예약특전관리",
  /** 게시판, 라운지 글과 댓글. 숨기고 되살리는 자리 */
  posts: "게시글관리",
  /** 파는 광고 상품, 메이커 멤버십, 요금 카드 문구 */
  pricing: "상품등록",
  /** 첫 달 할인, 첫 결제 할인 같은 기간 할인 */
  discounts: "프로모션등록",
  /** 인디 목록 맨 위, 홍보 고정 자리에 지금 걸린 것 */
  promotions: "광고노출관리",
  /** 메이커 멤버십 구독자 */
  memberships: "멤버십회원관리",
  /** 승인, 환불 요청, 환불 */
  payments: "결제/환불관리",
  /** 공개 화면의 연출(명예의 전당 1위 인트로 등)을 켜고 끄는 자리. 백오피스에서 화면에 무엇을 어떻게 보일지 정하는 일을 "전시" 라 부른다 */
  effects: "전시관리",
  /** 관리자끼리 주고받는 할 일 판 */
  tasks: "업무요청관리",
  /** 통계 묶음(2026-10-30, 사용자 "매출이라던가, 유입이라던가"). 보기만 하는 화면이라 끝말이 ~현황이다 */
  groupStats: "통계관리",
  /** 결제, 환불, 순매출을 날짜별, 상품별로 */
  statsSales: "매출현황",
  /** 방문, 유입경로, 가입, 찜을 날짜별로 */
  statsUsage: "이용현황",
  /** 코드가 읽는 운영 값과 알림을 고치는 묶음(2026-10-30). 백오피스의 시스템관리 */
  groupSystem: "시스템관리",
  /** 코드가 읽는 공통코드(그룹 + 코드 2단). 지우지 않고 미사용으로 끈다 */
  codes: "공통코드관리",
  /** 텔레그램 알림 문구. 업무요청 같은 사건 알림도 여기 템플릿을 거친다 */
  notifyTemplates: "알림템플릿관리",
  /** 직접 보내기와 보낸 이력 */
  notifySends: "알림발송관리",
  /** 기획 운영팀에 주는 서비스 변경 안내서(회원 화면 변경, 관리자 매뉴얼). 보기만 하는 화면이라 끝말이 ~조회다 */
  guide: "서비스안내서조회",
  /** 배지가 뜻하는 바. 숫자만 있으면 남은 일인지 처리한 일인지 모른다 */
  badgeSuffix: "건 남음",
  /** 할 일 칸의 둘째 배지(하는 중 칸 건수). 첫 배지(할 일 칸)와 뜻이 달라 낭독 꼬리도 다르다 */
  badgeDoingSuffix: "건 하는 중",
  /** 좁은 화면 바닥 띠의 마지막 칸. 띠에 못 세운 칸과 서비스 화면으로 가는 길이 여기 들어간다 */
  more: "더보기",
  menuTitle: "관리자 메뉴",
  /** 넓은 화면 기둥 접기 단추(components/admin/admin-rail) */
  railCollapse: "메뉴 접기",
  railExpand: "메뉴 펼치기",
  /** 묶음 제목 단추의 낭독 이름(admin-rail). 화면에는 제목과 꺾쇠만 선다 */
  groupFold: (title: string) => `${title} 묶음 접기`,
  groupUnfold: (title: string) => `${title} 묶음 펼치기`,
} as const;

// 수집 소스 이름표는 공개 상세(정보 출처 칩)도 같이 써서 lib/source-label 로 옮겼다. 관리자 쪽 import 경로는 그대로 둔다
export { SOURCE_LABEL, sourceLabel } from "@/lib/source-label";

export const MATCH_MESSAGES = {
  title: "매칭 대기",
  lead:
    "왼쪽은 우리가 아는 게임, 오른쪽은 스토어가 준 상품이에요. 이름이 충분히 닮으면 수집이 이미 이었고, 애매한 것만 여기 서요. \"승인\" 하면 그 게임 가격에 이 스토어가 붙고, \"반려\" 하면 이 후보는 다시 올라오지 않아요.",
  note: (shown: number, total: number) =>
    total > shown ? `${total}건 중 ${shown}건 표시` : `${shown}건`,
  similarity: (lo: number, hi: number) => `유사도 ${lo}~${hi}`,
  empty: "승인 대기 매칭이 없어요. 수집이 실행되면 새 후보가 여기 쌓여요.",
  colOurTitle: "등록 게임명",
  colStoreTitle: "스토어 상품명",
  colSource: "스토어",
  colExternal: "스토어 상품ID",
  colConfidence: "유사도",
  colAction: "판정",
  noStoreTitle: "정보 없음",
  open: "스토어에서 열기",
  search: "조회조건",
  searchSource: "스토어",
  searchTitle: "게임명",
  searchAll: "전체",
  listLabel: "매칭 대기 목록",
  detailTitle: "매칭 상세",
  sectionGame: "등록 게임",
  sectionStore: "스토어 매칭 후보",
  fieldGame: "게임명",
  fieldGameEn: "영문 제목",
  fieldUrl: "스토어 URL",
  approve: "승인",
  reject: "반려",
} as const;

export const PRODUCT_MATCH_MESSAGES = {
  title: "상품 매핑",
  note: (shown: number, total: number) =>
    total > shown ? `${total}건 중 ${shown}건 표시` : `${shown}건`,
  similarity: (lo: number, hi: number) => `유사도 ${lo}~${hi}`,
  empty: "매핑 대기 상품이 없어요.",
  colProduct: "매장 등록상품",
  colCandidate: "매칭 후보 게임",
  colConfidence: "유사도",
  colShop: "등록 매장",
  colCheckedAt: "최종 확인일시",
  noBarcode: "바코드 없음",
  viaSync: "연동 등록",
  search: "조회조건",
  searchShop: "등록 매장",
  searchName: "상품명",
  searchAll: "전체",
  listLabel: "상품 매핑 대기 목록",
  detailTitle: "매핑 상세",
  sectionProduct: "매장 등록상품",
  sectionGame: "매칭 후보 게임",
  fieldName: "상품명",
  fieldHardware: "기종",
  fieldBarcode: "바코드",
  fieldGame: "게임명",
  fieldGameEn: "영문 제목",
  openPublic: "공개 화면에서 보기",
  approve: "승인",
  reject: "반려",
} as const;

