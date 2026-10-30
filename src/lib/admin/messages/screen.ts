// 관리자 화면 공통 틀(components/admin/screen) 문구 — 툴바 단추, 하단 상태줄.
// 단추 낱말과 순서는 신세계TV 백오피스와 같다(조회, 입력, 삭제, 저장, 엑셀). 상태줄 문구는 이 서비스 말투(-해요)로 옮겼다.
export const SCREEN_MESSAGES = {
  /** 열린 프로그램 탭 줄(admin/program-tabs) */
  tabsLabel: "열린 화면",
  closeTab: (label: string) => `${label} 닫기`,
  /** 탭 우클릭 메뉴(program-shell/tab-menu). 기준은 우클릭한 탭이다 */
  tabMenu: "탭 메뉴",
  tabMenuClose: "닫기",
  tabMenuCloseOthers: "다른 화면 모두 닫기",
  tabMenuCloseRight: "오른쪽 화면 모두 닫기",
  tabMenuCloseLeft: "왼쪽 화면 모두 닫기",
  tabMenuCloseAll: "모두 닫기",
  listFold: "목록 접기",
  listUnfold: "목록 펼치기",
  /** 휴대폰 상세 시트의 제목 자리(화면이 제목 글을 넘기지 않을 때) */
  detail: "상세",
  detailFold: "상세 접기",
  detailUnfold: "상세 펼치기",
  /** 목록, 상세 사이 구분선(screen/split-handle). 끌거나 좌우 방향키로 목록 폭을 바꾼다 */
  listResize: "목록 폭 조절",
  tabDirty: "(미저장 변경 있음)",
  dirtyTitle: "저장하지 않은 변경사항이 있어요",
  /** 행 이동 확인(screen/row-leave). 고른 줄에 저장 안 한 값이 있을 때 다른 줄로 가기 전에 묻는다 — 백오피스 "변경된 내역이 있습니다. 저장하시겠습니까?" */
  rowLeaveConfirm: "선택한 행에 저장하지 않은 변경사항이 있어요. 저장하고 이동할까요?",
  rowLeaveSave: "저장",
  rowLeaveDiscard: "저장 안 함",
  closeDirtyConfirm: (label: string) => `${label}에 저장하지 않은 변경사항이 있어요. 저장하지 않고 닫을까요?`,
  closeOthersDirtyConfirm: "저장하지 않은 변경사항이 있는 화면이 있어요. 저장하지 않고 닫을까요?",
  closeDirty: "저장 안 하고 닫기",
  reloadDirtyConfirm: "저장하지 않은 변경사항이 있어요. 저장하지 않고 새로고침할까요?",
  reloadDirty: "저장 안 하고 새로고침",
  toolbar: "화면 툴바",
  retrieve: "조회",
  insert: "입력",
  delete: "삭제",
  save: "저장",
  excel: "엑셀",
  /** 단추 말풍선. 단축키는 백오피스와 같다(F8 조회, F9 저장, Shift+F8 입력, Shift+F9 삭제) */
  retrieveKey: "조회 (F8)",
  insertKey: "입력 (Shift+F8)",
  deleteKey: "삭제 (Shift+F9)",
  saveKey: "저장 (F9, Ctrl+S)",
  excelKey: "목록 엑셀 다운로드",
  /** 이 화면에서 쓰지 않는 단추의 말풍선. 단추는 지우지 않고 흐리게 둔다 — 자리가 늘 같아야 손이 기억한다 */
  unused: (name: string) => `${name}: 이 화면에서는 사용하지 않아요`,
  pathLabel: "메뉴 위치",
  /** 목록 표 첫 칸(순번), 필수 칸 낭독 꼬리 */
  no: "No",
  required: "(필수)",
  statusLabel: "처리 결과",
  retrieved: (n: number) => `${n.toLocaleString("ko-KR")}건 조회됐어요`,
  refreshing: "다시 조회하는 중이에요",
  refreshed: "다시 조회했어요",
  excelDone: (n: number) => `${n.toLocaleString("ko-KR")}건을 엑셀로 다운로드했어요`,
  excelEmpty: "다운로드할 목록이 없어요",
  excelMeta: (at: string, n: number, who: string | null) => `${at} ${who ? `${who} 다운로드` : "다운로드"} | ${n.toLocaleString("ko-KR")}건`,
  /** 고친 값을 둔 채 조회를 누르면 묻는다(백오피스 "변경된 내역이 있습니다. 저장하시겠습니까?" 와 같은 자리) */
  confirmDiscard: "저장하지 않은 변경사항이 있어요. 저장하지 않고 다시 조회할까요?",
} as const;

/** 공통 그리드(components/admin/screen/data-grid) 문구 */
export const GRID_MESSAGES = {
  no: "No",
  checkAll: "전체 선택",
  checkRow: (n: number) => `${n}행 선택`,
  searchIn: (label: string) => `${label} 내 검색`,
  searchPlaceholder: "목록 내 검색",
  total: (n: number) => `총 ${n.toLocaleString("ko-KR")}건`,
  matched: (n: number) => `검색 ${n.toLocaleString("ko-KR")}건`,
  checked: (n: number) => `선택 ${n.toLocaleString("ko-KR")}건`,
  sum: "합계",
  pager: "페이지 이동",
  first: "첫 페이지",
  prev: "이전 페이지",
  next: "다음 페이지",
  last: "마지막 페이지",
  pageOf: (page: number, pages: number) => `${page} / ${pages}`,
  pageSize: "페이지당 표시 건수",
  perPage: (n: number) => `${n}건씩`,
  perPageAll: "전체",
  copied: (n: number) => `${n}건을 복사했어요. 엑셀에 붙여 넣을 수 있어요`,
  stateLabels: { new: "신규", changed: "수정", deleted: "삭제", error: "오류" },
} as const;

/** 승인 화면 일괄 처리 띠(components/admin/screen/approval) 문구 — 백오피스 상품그룹핑승인관리의 "상태 + 반려사유 + 적용" 자리 */
export const APPROVAL_MESSAGES = {
  bandLabel: "일괄 처리",
  target: (n: number, checked: boolean) => (checked ? `선택 ${n.toLocaleString("ko-KR")}건` : n > 0 ? "선택 1건" : "처리할 행을 선택해 주세요"),
  decision: "처리구분",
  reason: "처리사유",
  reasonPlaceholder: "반려, 숨김, 정지는 사유를 입력해야 해요",
  reasonRequired: (label: string) => `${label}은 사유를 입력해야 해요`,
  apply: "적용",
  confirm: (label: string, n: number) => `${n.toLocaleString("ko-KR")}건을 ${label}할까요?`,
  noTarget: "처리할 행을 먼저 선택해 주세요",
  notApplicable: (label: string) => `선택한 행 중 ${label}할 수 있는 행이 없어요`,
  working: (label: string, n: number) => `${n.toLocaleString("ko-KR")}건 ${label} 처리 중이에요`,
  done: (label: string, ok: number, skipped: number) =>
    `${ok.toLocaleString("ko-KR")}건 ${label}했어요${skipped > 0 ? ` | 대상이 아닌 ${skipped.toLocaleString("ko-KR")}건은 제외했어요` : ""}`,
  failed: (n: number, first: string) => `${n.toLocaleString("ko-KR")}건은 처리하지 못했어요: ${first}`,
  doneTag: "처리됨",
  pickHint: "목록에서 행을 선택하면 상세가 보여요",
} as const;
