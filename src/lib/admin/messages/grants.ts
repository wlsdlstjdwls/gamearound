// 사용자별프로그램권한관리 문구(2026-11-19). 권한이 없어 막혔을 때 메뉴, 툴바, 서버 액션이 말하는 문구도 여기 둔다.
export const GRANTS_MESSAGES = {
  search: "조회조건",
  searchAccount: "관리자명",
  searchGroup: "상위메뉴",
  searchName: "프로그램명",
  all: "전체",
  accounts: "관리자 목록",
  accountsEmpty: "관리자 계정이 없어요.",
  colAccount: "관리자명",
  colEmail: "이메일",
  colReadCount: "조회 가능",
  readCount: (n: number) => `${n}개`,
  list: "프로그램 권한 목록",
  listTitle: (name: string) => `${name} 프로그램 권한`,
  pickAccount: "왼쪽에서 관리자를 고르면 프로그램 권한이 보여요.",
  empty: "조건에 맞는 프로그램이 없어요.",
  colGroup: "상위메뉴",
  colName: "프로그램명",
  colUpdatedBy: "수정자",
  colUpdatedAt: "수정일시",
  /** 툴바 단추와 같은 이름, 같은 순서(screen/head) */
  permLabels: { read: "조회", insert: "입력", save: "저장", delete: "삭제", excel: "엑셀" },
  /** 줄 전체 켜기, 끄기 칸 */
  colAll: "전체",
  checkPerm: (name: string, perm: string) => `${name} ${perm} 권한`,
  checkAll: (name: string) => `${name} 권한 전체`,
  /** 대시보드 조회처럼 늘 켜진 칸의 낭독 꼬리 */
  locked: "늘 켜져 있어요",
  selfLocked: "내 권한관리 조회, 저장은 끌 수 없어요",
  saved: (n: number) => (n > 0 ? `${n}건 저장했어요.` : "바뀐 값이 없어요."),
  reloaded: "다시 조회했어요.",
  invalid: "저장할 수 없는 값이 있어요.",
  notAdmin: "관리자 계정이 아니라 권한을 줄 수 없어요.",
  selfLockError: "내 계정의 권한관리 조회, 저장은 끌 수 없어요. 다른 관리자가 바꿔야 해요.",
  failed: "저장하지 못했어요. 잠시 뒤 다시 저장해 주세요.",
  /** 서버 액션이 권한 없이 불렸을 때(services/admin-grants 의 requireProgram) */
  denied: (perm: string) => `이 프로그램의 ${perm} 권한이 없어요. 사용자별프로그램권한관리에서 받을 수 있어요.`,
  /** 조회 권한 없는 화면에 들어왔을 때(program-policy 의 ProgramGate) */
  blockedTitle: "조회 권한이 없는 프로그램이에요",
  blockedBody: "사용자별프로그램권한관리에서 조회 권한을 받으면 열려요.",
} as const;
