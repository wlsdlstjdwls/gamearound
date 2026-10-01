// 관리자 작업 판 문구. 화면 문구는 한곳에 모은다(AGENTS §2).
export const TASK_MESSAGES = {
  // 관리자 메뉴(ADMIN_NAV.tasks)와 같은 말을 쓴다. "작업 판" 이던 이름을 버린 이유는 거기 주석에 있다
  title: "할 일",
  add: "할 일 추가",
  titleLabel: "할 일",
  titlePlaceholder: "무엇을 할지 한 줄로",
  bodyLabel: "메모",
  bodyPlaceholder: "배경, 다음 수, 막힌 지점",
  priorityLabel: "급함",
  /** 갈래(2026-10-01). 셀렉트 라벨이자 필터 줄의 묶음 이름이다 */
  categoryLabel: "분류",
  statusLabel: "놓을 칸",
  sourceLabel: "소스 (선택)",
  /** 담당자(2026-09-30). 비워 둘 수 있어서 "없음" 이 첫 칸이다 */
  assigneeLabel: "담당자",
  assigneeNone: "없음",
  submit: "추가",
  empty: "이 칸은 비어 있어요.",
  /** 화면 제목 옆 건수. 판 위에 제목을 또 세우는 대신 이 자리 하나로 말한다 */
  count: (n: number) => `${n}건`,
  /** 끌고 있는 동안 빈 칸이 스스로 말하는 자리 */
  dropHere: "여기에 놓아요",
  clearDone: "끝난 일 치우기",
  clearDoneConfirm: "끝난 일을 모두 지울까요? 되돌릴 수 없어요.",
  up: "위로",
  down: "아래로",
  removeConfirm: "이 할 일을 지울까요?",
  created: "추가했어요",
  moved: "옮겼어요",
  removed: "지웠어요",
  invalid: "잘못된 요청이에요",

  // 카드 고치기 — 할 일의 제목과 메모는 "무엇을 하는 일인가" 라서 고쳐 쓰는 값이다
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

  /*
   * 팝업(2026-09-21) — 적기, 고치기, 기록이 전부 카드 안 작은 칸에서 일어나 쓰기 힘들다는 말을 들었다.
   * 판은 보는 자리, 팝업은 쓰는 자리로 갈랐다. 카드에는 읽을 것만 남는다.
   */
  addTitle: "할 일 추가",
  detailTitle: "할 일",
  basics: "내용",
  place: "놓인 칸",
  /** 팝업 안에서 위험한 일은 맨 아래 따로 선다 — 저장 버튼 옆에 두면 손이 미끄러진다 */
  dangerZone: "이 할 일 지우기",
  /** 마지막으로 고친 때 */
  updatedAt: "마지막으로 고친 때",
  /** 올린 사람(2026-10-01). 계정이 지워졌으면 이름 대신 이 말이 선다 */
  author: "올린 사람",
  authorUnknown: "알 수 없음",
  noteCount: (n: number) => `기록 ${n}`,
  /** 카드 위 짧은 말(2026-10-01). 팝업의 담당자 칸 "없음" 과 가른다 — 카드에서는 무엇이 없는지까지 말해야 한다 */
  cardNoAssignee: "담당 없음",
  cardLatestNote: "최근 기록",

  /*
   * 칸 안 한 줄 추가(2026-09-22) — 생각난 일을 적는 데 네 동작(버튼, 팝업, 칸 고르기, 저장)이 들던 것을
   * 세 동작(누르기, 치기, 엔터)으로 줄인다. 칸은 누른 자리가 정한다.
   */
  quickAdd: "한 줄 추가",
  quickAddPlaceholder: "무엇을 할지 한 줄로",
  quickAddHint: "엔터로 추가하고 계속 적어요. 줄바꿈은 시프트+엔터, 그만두려면 Esc.",

  /*
   * 붙인 대상 고르기(2026-09-22) — 앞서는 uuid 를 다른 화면에서 복사해 와야 했다.
   * 그 길은 "게임에 매인 할 일" 이라는 이 판의 이유를 쓰지 않게 만든다(붙이는 값이 비싸면 아무도 안 붙인다).
   */
  gamePickLabel: "붙일 게임 (선택)",
  gamePickPlaceholder: "제목 일부",
  gamePickHint: "못 찾아도 할 일은 만들 수 있어요.",
  gamePickOpen: "게임 열기",
  gamePickSearch: "찾기",
  gamePickSearching: "찾는 중",
  gamePickEmpty: "찾은 게임이 없어요. 제목을 줄이거나 영문으로 쳐 봐요.",
  gamePickClear: "떼기",
  gamePickPicked: "붙인 게임",
} as const;

/** 칸 이름. enum 값과 화면 낱말을 잇는 유일한 자리 */
export const TASK_STATUS_LABEL = {
  backlog: "작업대기",
  todo: "할 일",
  doing: "처리 중",
  done: "완료",
} as const;

export const TASK_PRIORITY_LABEL = {
  high: "높음",
  normal: "보통",
  low: "낮음",
} as const;

/** 갈래 이름. 순서는 TASK_CATEGORIES 가 정한다 */
export const TASK_CATEGORY_LABEL = {
  task: "할 일",
  bug: "버그",
  idea: "아이디어",
  data: "데이터 정리",
  etc: "기타",
} as const;

/*
 * 판 위 거르기 줄(2026-10-01, 사용자 요청: "내가 올린 것, 다른 사람이 올린 것 구분", "내 담당만 보기, 카테고리 필터").
 * 같은 날 칩 열둘에서 여섯으로 줄였다(lib/admin/task-filter 주석).
 */
export const TASK_FILTER_MESSAGES = {
  label: "할 일 거르기",
  view: "보기",
  views: { all: "전체", assigned: "내 담당", mine: "내가 올린", others: "남이 올린" },
  category: "분류",
  categoryAll: "모든 분류",
  urgent: "급함만",
  reset: "거르기 풀기",
  /** 칸 머리 건수. 걸러졌을 때만 전체 수를 같이 보인다 — 숨은 카드가 있다는 걸 놓치지 않게 */
  columnCount: (shown: number, total: number) => `${shown} / ${total}`,
  columnCountLabel: (shown: number, total: number) => `전체 ${total}건 중 ${shown}건 보임`,
} as const;
