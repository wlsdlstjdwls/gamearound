// 관리자 화면 공통 틀(components/admin/screen) 문구 — 툴바 단추, 하단 상태줄.
// 단추 낱말과 순서는 신세계TV 백오피스와 같다(조회, 입력, 삭제, 저장, 엑셀). 상태줄 문구는 이 서비스 말투(-해요)로 옮겼다.
export const SCREEN_MESSAGES = {
  /** 열린 프로그램 탭 줄(admin/program-tabs) */
  tabsLabel: "열린 화면",
  closeTab: (label: string) => `${label} 닫기`,
  closeOthers: "다른 화면 닫기",
  listFold: "목록 접기",
  listUnfold: "목록 펼치기",
  tabDirty: "(저장 안 한 값 있음)",
  dirtyTitle: "바뀐 내용이 있어요",
  closeDirtyConfirm: (label: string) => `${label}에 저장하지 않은 값이 있어요. 버리고 닫을까요?`,
  closeOthersDirtyConfirm: "저장하지 않은 값이 있는 화면이 있어요. 버리고 닫을까요?",
  closeDirty: "버리고 닫기",
  reloadDirtyConfirm: "저장하지 않은 값이 있어요. 버리고 새로 고칠까요?",
  reloadDirty: "버리고 새로 고침",
  toolbar: "화면 단추",
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
  excelKey: "지금 목록을 엑셀로 내려받기",
  /** 이 화면에서 쓰지 않는 단추의 말풍선. 단추는 지우지 않고 흐리게 둔다 — 자리가 늘 같아야 손이 기억한다 */
  unused: (name: string) => `${name}: 이 화면에서는 쓰지 않아요`,
  pathLabel: "메뉴 위치",
  /** 목록 표 첫 칸(순번), 필수 칸 낭독 꼬리 */
  no: "No",
  required: "(필수)",
  statusLabel: "처리 결과",
  retrieved: (n: number) => `${n.toLocaleString("ko-KR")}건 조회됐어요`,
  refreshing: "다시 조회하는 중이에요",
  refreshed: "다시 조회했어요",
  excelDone: (n: number) => `${n.toLocaleString("ko-KR")}줄을 엑셀로 내려받았어요`,
  excelEmpty: "내려받을 목록이 없어요",
  excelMeta: (at: string, n: number) => `${at} 내려받음 | ${n.toLocaleString("ko-KR")}건`,
  /** 고친 값을 둔 채 조회를 누르면 묻는다(백오피스 "변경된 내역이 있습니다. 저장하시겠습니까?" 와 같은 자리) */
  confirmDiscard: "저장하지 않은 바뀐 값이 있어요. 버리고 다시 조회할까요?",
} as const;

/** 공통 그리드(components/admin/screen/data-grid) 문구 */
export const GRID_MESSAGES = {
  no: "No",
  checkAll: "이 목록 전체 고르기",
  checkRow: (n: number) => `${n}번 줄 고르기`,
  searchIn: (label: string) => `${label} 안에서 찾기`,
  searchPlaceholder: "목록 안에서 찾기",
  total: (n: number) => `총 ${n.toLocaleString("ko-KR")}건`,
  matched: (n: number) => `찾은 ${n.toLocaleString("ko-KR")}건`,
  checked: (n: number) => `고른 ${n.toLocaleString("ko-KR")}건`,
  sum: "합계",
  pager: "쪽 넘기기",
  first: "처음 쪽",
  prev: "이전 쪽",
  next: "다음 쪽",
  last: "끝 쪽",
  pageOf: (page: number, pages: number) => `${page} / ${pages}`,
  copied: (n: number) => `${n}줄을 복사했어요. 엑셀에 붙여 넣을 수 있어요`,
  stateLabels: { new: "신규", changed: "수정", deleted: "삭제" },
} as const;

/** 승인 화면 일괄 처리 띠(components/admin/screen/approval) 문구 — 백오피스 상품그룹핑승인관리의 "상태 + 반려사유 + 적용" 자리 */
export const APPROVAL_MESSAGES = {
  bandLabel: "일괄 처리",
  target: (n: number, checked: boolean) => (checked ? `고른 ${n.toLocaleString("ko-KR")}건` : n > 0 ? "선택한 줄 1건" : "처리할 줄을 골라 주세요"),
  decision: "처리",
  reason: "사유",
  reasonPlaceholder: "반려, 숨김, 정지는 사유가 꼭 있어야 해요",
  reasonRequired: (label: string) => `${label}은 사유를 적어야 해요`,
  apply: "적용",
  confirm: (label: string, n: number) => `${n.toLocaleString("ko-KR")}건을 ${label}할까요?`,
  noTarget: "처리할 줄을 먼저 골라 주세요",
  notApplicable: (label: string) => `고른 줄 가운데 ${label}할 수 있는 줄이 없어요`,
  working: (label: string, n: number) => `${n.toLocaleString("ko-KR")}건 ${label} 처리 중이에요`,
  done: (label: string, ok: number, skipped: number) =>
    `${ok.toLocaleString("ko-KR")}건 ${label}했어요${skipped > 0 ? ` | 해당 없는 ${skipped.toLocaleString("ko-KR")}건은 건너뛰었어요` : ""}`,
  failed: (n: number, first: string) => `${n.toLocaleString("ko-KR")}건은 처리하지 못했어요: ${first}`,
  doneTag: "처리됨",
  pickHint: "목록에서 줄을 고르면 상세가 보여요",
} as const;
