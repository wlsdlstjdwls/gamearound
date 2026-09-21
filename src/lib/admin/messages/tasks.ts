// 관리자 작업 판 문구. 화면 문구는 한곳에 모은다(AGENTS §2).
export const TASK_MESSAGES = {
  // 관리자 메뉴(ADMIN_NAV.tasks)와 같은 말을 쓴다
  title: "작업 판",
  lead: "검수 큐는 수집이 쌓아 주지만, 직접 적어야 하는 일은 여기에 둬요. 칸을 옮겨 진행을 표시해요.",
  add: "할 일 추가",
  titleLabel: "할 일",
  titlePlaceholder: "무엇을 할지 한 줄로",
  bodyLabel: "메모",
  bodyPlaceholder: "배경, 다음 수, 막힌 지점",
  priorityLabel: "급함",
  statusLabel: "놓을 칸",
  gameLabel: "게임 ID (선택)",
  sourceLabel: "소스 (선택)",
  submit: "추가",
  empty: "이 칸은 비어 있어요.",
  clearDone: "끝난 일 치우기",
  clearDoneConfirm: "끝난 일을 모두 지울까요? 되돌릴 수 없어요.",
  moveTo: "옮기기",
  up: "위로",
  down: "아래로",
  remove: "지우기",
  removeConfirm: "이 할 일을 지울까요?",
  created: "추가했어요",
  moved: "옮겼어요",
  removed: "지웠어요",
  invalid: "잘못된 요청이에요",

  // 카드 고치기 — 할 일의 제목과 메모는 "무엇을 하는 일인가" 라서 고쳐 쓰는 값이다
  edit: "고치기",
  save: "저장",
  cancel: "취소",
  saved: "고쳤어요",

  /*
   * 기록 — 진행과 완료가 쌓이는 자리. 메모(body)와 낱말을 가른 이유는 하는 일이 다르기 때문이다.
   * 메모는 덮어쓰고, 기록은 쌓인다.
   */
  notes: "기록",
  noteAdd: "남기기",
  noteLabel: "기록 남기기",
  notePlaceholder: "진행, 막힌 지점, 끝내며 남길 말",
  noteEmpty: "아직 기록이 없어요.",
  noteAdded: "기록했어요",
  noteRemove: "지우기",
  noteRemoveConfirm: "이 기록을 지울까요?",
  noteRemoved: "기록을 지웠어요",
  /** 칸 이동 자취 앞에 붙는 말. 앞뒤 칸은 파이프로 잇는다(AGENTS §4: 화살표 금지) */
  noteMoved: "옮김",
  /** 카드를 펼치고 접는 버튼 */
  expand: "펼치기",
  collapse: "접기",
} as const;

/** 칸 이름. enum 값과 화면 낱말을 잇는 유일한 자리 */
export const TASK_STATUS_LABEL = {
  backlog: "언젠가",
  todo: "할 일",
  doing: "하는 중",
  done: "끝",
} as const;

export const TASK_PRIORITY_LABEL = {
  high: "높음",
  normal: "보통",
  low: "낮음",
} as const;
