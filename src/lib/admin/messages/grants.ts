// 권한 화면 두 개의 문구(2026-11-19). 사용자별프로그램관리(계정마다 쓸 프로그램)와 프로그램별사용자권한관리(프로그램마다 계정별 단추 권한).
// 권한이 없어 막혔을 때 메뉴, 툴바, 서버 액션이 말하는 문구도 여기 둔다.
export const GRANTS_MESSAGES = {
  search: "조회조건",
  searchAccount: "관리자명",
  searchGroup: "상위메뉴",
  searchName: "프로그램명",
  searchUse: "사용여부",
  all: "전체",
  useOn: "사용",
  useOff: "미사용",
  accounts: "관리자 목록",
  accountsEmpty: "관리자 계정이 없어요.",
  programs: "프로그램 목록",
  programsEmpty: "조건에 맞는 프로그램이 없어요.",
  colAccount: "관리자명",
  colEmail: "이메일",
  colGroup: "상위메뉴",
  colName: "프로그램명",
  colUpdatedBy: "수정자",
  colUpdatedAt: "수정일시",
  /** 프로그램을 쓸 수 있나(메뉴에 보이고 들어갈 수 있다). 표의 조회 권한과 같은 값이다 */
  colUse: "사용",
  /** 줄 전체 켜기, 끄기 칸 */
  colAll: "전체",
  /** 툴바 단추와 같은 이름, 같은 순서(screen/head) */
  permLabels: { read: "조회", insert: "입력", save: "저장", delete: "삭제", excel: "엑셀" },
  // 사용자별프로그램관리
  userProgramsList: "사용 프로그램 목록",
  userProgramsTitle: (name: string) => `${name} 사용 프로그램`,
  pickAccount: "왼쪽에서 관리자를 고르면 쓸 수 있는 프로그램이 보여요.",
  // 프로그램별사용자권한관리
  programUsersList: "사용자 권한 목록",
  programUsersTitle: (name: string) => `${name} 사용자 권한`,
  pickProgram: "왼쪽에서 프로그램을 고르면 관리자별 권한이 보여요.",
  checkUse: (name: string) => `${name} 사용`,
  checkPerm: (name: string, perm: string) => `${name} ${perm} 권한`,
  checkAll: (name: string) => `${name} 권한 전체`,
  /** 대시보드 사용처럼 늘 켜진 칸의 낭독 꼬리 */
  locked: "늘 켜져 있어요",
  selfLocked: "내 계정의 권한 화면 사용, 저장은 끌 수 없어요",
  saved: (n: number) => (n > 0 ? `${n}건 저장했어요.` : "바뀐 값이 없어요."),
  reloaded: "다시 조회했어요.",
  invalid: "저장할 수 없는 값이 있어요.",
  notAdmin: "관리자 계정이 아니라 권한을 줄 수 없어요.",
  selfLockError: "내 계정의 권한 화면 사용, 저장은 끌 수 없어요. 다른 관리자가 바꿔야 해요.",
  failed: "저장하지 못했어요. 잠시 뒤 다시 저장해 주세요.",
  /** 서버 액션이 권한 없이 불렸을 때(services/admin-grants 의 requireProgram) */
  denied: (perm: string) => `이 프로그램의 ${perm} 권한이 없어요. 프로그램별사용자권한관리에서 받을 수 있어요.`,
  /** 사용하지 않는 화면에 들어왔을 때(program-policy 의 ProgramGate) */
  blockedTitle: "사용하지 않는 프로그램이에요",
  blockedBody: "사용자별프로그램관리에서 이 프로그램을 사용으로 바꾸면 열려요.",
} as const;
