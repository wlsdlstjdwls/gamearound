// 관리자 작업 판 문구. 화면 문구는 한곳에 모은다(AGENTS §2).
export const TASK_MESSAGES = {
  // 관리자 메뉴(ADMIN_NAV.tasks)와 같은 말을 쓴다. "작업 판" 이던 이름을 버린 이유는 거기 주석에 있다
  title: "할 일",
  add: "할 일 추가",
  titleLabel: "할 일",
  titlePlaceholder: "무엇을 할지 한 줄로",
  bodyLabel: "메모",
  bodyPlaceholder: "배경, 다음 수, 막힌 지점",
  /** "급함" 이던 이름(2026-10-01 사용자가 "우선순위" 로). enum 이름(priority)과도 맞는다 */
  priorityLabel: "우선순위",
  /** 갈래(2026-10-01). 셀렉트 라벨이자 필터 줄의 묶음 이름이다 */
  categoryLabel: "분류",
  statusLabel: "상태",
  sourceLabel: "소스 (선택)",
  /** 담당자(2026-09-30). 비워 둘 수 있어서 "없음" 이 첫 칸이다 */
  assigneeLabel: "담당자",
  assigneeNone: "없음",
  /** "모두" 담당(2026-10-12). 판을 쓰는 사람 전부가 쥔 일 */
  assigneeAll: "모두",
  /** 카드의 작성자 칸(2026-10-12, 사용자가 시안으로 준 말). 팝업 바닥은 그대로 "올린 사람" 이다 */
  cardAuthor: "작성자",
  submit: "추가",
  empty: "이 칸은 비어 있어요.",
  /** 화면 제목 옆 건수. 판 위에 제목을 또 세우는 대신 이 자리 하나로 말한다 */
  count: (n: number) => `${n}건`,
  /** 끌고 있는 동안 빈 칸이 스스로 말하는 자리 */
  dropHere: "여기에 놓아요",
  /** 칸 머리의 목록 시트 단추(2026-10-02, 사용자가 정한 말) */
  columnCollect: "모아보기",
  columnSheetTitle: (label: string, n: number) => `${label} ${n}건`,
  /** 좁은 화면에서 칸을 옆으로 넘기는 줄의 이름 — 낭독기가 읽는다 */
  columnTabs: "상태 선택",
  /** 치우기는 걷기다(2026-10-02) — 지우지 않으므로 묻지 않는다. 걷은 일은 지난 일에서 다시 본다 */
  clearDone: "완료 건 보관",
  archived: (n: number) => `${n}건을 보관했어요. 보관함에서 다시 볼 수 있어요.`,
  archiveLink: "보관함",
  archiveTitle: "보관함",
  archiveNote: (n: number, limit: number) => (n >= limit ? `최근 ${limit}건` : `${n}건`),
  archiveEmpty: "보관된 업무가 없어요. 보드에서 완료 건 보관을 누르면 여기로 와요.",
  archiveBack: "업무요청 보드로",
  archivedAt: "보관일시",
  doneAt: "완료일시",
  restore: "보드로 복원",
  restored: "보드의 완료 상태로 복원했어요",
  removeConfirm: "이 업무를 삭제할까요?",
  created: "추가했어요",
  moved: "이동했어요",
  removed: "삭제했어요",
  invalid: "잘못된 요청이에요",

  // 카드 고치기 — 할 일의 제목과 메모는 "무엇을 하는 일인가" 라서 고쳐 쓰는 값이다
  save: "저장",
  cancel: "취소",
  /** 사용자가 정한 말(2026-10-01: "그냥 저장 완료로") — -해요체 규칙의 예외다 */
  saved: "저장 완료",

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
  noteRemove: "삭제",
  noteRemoveConfirm: "이 기록을 삭제할까요?",
  noteRemoved: "기록을 삭제했어요",
  /** 칸 이동 자취 앞에 붙는 말. 앞뒤 칸은 파이프로 잇는다(AGENTS §4: 화살표 금지) */
  /** 칸 이동 자취의 머리 표식(사람 글과 가르는 자리). "칸 이동" 이던 것을 사용자가 "상태 변경" 으로 정했다(2026-10-01) */
  noteMoved: "상태 변경",
  /*
   * 칸 이동 문장: "할 일 → 처리 중으로 변경되었습니다". 사용자가 이 꼴을 직접 정했다(2026-10-01, 같은 날 "-> 대신 화살표") —
   * "에서 ... 으로 옮겼어요" 를 칩과 섞으니 복사하면 줄마다 끊겨 헷갈렸다.
   * AGENTS §4(화면 문구에 화살표 금지)와 -해요체의 예외다. 사용자 지시라 이 자리만 남긴다.
   */
  noteMovedArrow: "→",
  noteMovedTail: "변경되었습니다",

  /*
   * 팝업(2026-09-21) — 적기, 고치기, 기록이 전부 카드 안 작은 칸에서 일어나 쓰기 힘들다는 말을 들었다.
   * 판은 보는 자리, 팝업은 쓰는 자리로 갈랐다. 카드에는 읽을 것만 남는다.
   */
  addTitle: "할 일 추가",
  detailTitle: "할 일",
  basics: "내용",
  place: "상태",
  /** 팝업 안에서 위험한 일은 맨 아래 따로 선다 — 저장 버튼 옆에 두면 손이 미끄러진다 */
  dangerZone: "업무 삭제",
  /** 마지막으로 고친 때 */
  updatedAt: "최종 수정일시",
  /** 올린 사람(2026-10-01). 계정이 지워졌으면 이름 대신 이 말이 선다 */
  author: "작성자",
  authorUnknown: "알 수 없음",
  noteCount: (n: number) => `기록 ${n}`,
  /** 카드 위 짧은 말(2026-10-01). 팝업의 담당자 칸 "없음" 과 가른다 — 카드에서는 무엇이 없는지까지 말해야 한다 */
  cardNoAssignee: "담당 없음",
  cardLatestNote: "최근 기록",
  /** 내가 연 뒤 남이 단 기록 수(2026-10-02) */
  cardUnread: (n: number) => `새 기록 ${n}`,
  /** 처리 중인데 오래 안 고친 카드(lib/admin/tasks 의 staleDays) */
  cardStale: (days: number) => `${days}일째 정체`,

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
  gamePickLabel: "관련 게임 (선택)",
  gamePickPlaceholder: "제목 일부",
  gamePickHint: "못 찾아도 할 일은 만들 수 있어요.",
  gamePickOpen: "게임 열기",
  gamePickSearch: "검색",
  gamePickSearching: "검색 중",
  gamePickEmpty: "검색된 게임이 없어요. 제목을 줄이거나 영문으로 검색해 주세요.",
  gamePickClear: "해제",
  gamePickPicked: "관련 게임",
} as const;

/** 칸 이름. enum 값과 화면 낱말을 잇는 유일한 자리 */
export const TASK_STATUS_LABEL = {
  backlog: "작업대기",
  todo: "할 일",
  doing: "처리 중",
  done: "완료",
} as const;

/** 칸 이름 뒤 "(으)로". 받침에 따라 갈린다(ㄹ 받침은 "로") — 칸이 넷뿐이라 규칙을 쓰지 않고 적어 둔다 */
export const TASK_STATUS_TO_PARTICLE = {
  backlog: "로",
  todo: "로",
  doing: "으로",
  done: "로",
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
  label: "업무 필터",
  view: "보기",
  views: { all: "전체 보기", assigned: "내 담당", mine: "내 등록" },
  category: "분류",
  categoryAll: "모든 분류",
  /** 드롭다운 항목. 건수는 남은 일 기준이다 */
  categoryOption: (label: string, n: number) => `${label} ${n}`,
  /** 담당자 드롭다운(2026-10-12). "모두 지정" 은 담당을 "모두" 로 둔 일만, 사람 이름은 그 사람 담당과 "모두" 담당을 함께 센다 */
  assignee: "담당자",
  assigneeAny: "모든 담당자",
  assigneeAllOnly: "모두 지정",
  assigneeNone: "담당 없음",
  urgent: "우선순위 높음",
  /** 좁은 화면의 같은 칩 — 보기, 분류 드롭다운과 한 줄에 서야 해서 줄인다(앞의 "우선순위" 는 화면 낭독이 읽는다) */
  urgentShort: "높음만",
  reset: "필터 초기화",
  /** 칸 머리 건수. 걸러졌을 때만 전체 수를 같이 보인다 — 숨은 카드가 있다는 걸 놓치지 않게 */
  columnCount: (shown: number, total: number) => `${shown} / ${total}`,
  columnCountLabel: (shown: number, total: number) => `전체 ${total}건 중 ${shown}건 보임`,
} as const;

/** 할 일 첨부(2026-10-02). 카드 본문과 기록에 파일을 붙인다 */
export const TASK_ATTACHMENT_MESSAGES = {
  part: "첨부",
  add: "파일 업로드",
  attach: "파일 첨부",
  uploading: (done: number, total: number) => `업로드 중 ${done + 1}/${total}`,
  hint: (maxMb: number) => `이미지, PDF, 글 파일(txt, log, csv, json), zip | 한 파일 ${maxMb}MB까지`,
  empty: "첨부된 파일이 없어요.",
  remove: "삭제",
  removeConfirm: "이 파일을 삭제할까요? 저장소에서도 삭제돼요.",
  unpick: "제외",
  count: (n: number) => `첨부 ${n}`,
  openImage: (name: string) => `${name} 원본 보기`,
  newWindow: "(새 창에서 열림)",
  badType: (name: string) => `${name}: 받지 않는 형식이에요.`,
  tooBig: (name: string, maxMb: number) => `${name}: ${maxMb}MB를 넘어요.`,
  full: (max: number) => `파일은 할 일 하나에 ${max}개까지예요.`,
  failed: "파일을 올리지 못했어요. 잠시 뒤 다시 해 주세요.",
  forbidden: "이 할 일에 파일을 올릴 수 없어요.",
  /** 할 일, 기록은 만들어졌는데 파일만 실패했을 때. 글까지 다시 적지 않게 무엇이 남았는지 말한다 */
  partial: (what: string) => `${what} 저장했지만 파일을 올리지 못했어요. 열어서 다시 올려 주세요.`,
} as const;

/*
 * 텔레그램 알림 문구(2026-10-12). 채널은 알리기만 하고, 의논은 판의 기록 칸에서 한다 — 그래서 끝에 늘 카드 열기 링크를 단다.
 * 첫 줄은 그림 글자와 사건 이름이다: 알림 목록 미리보기에 첫 줄만 보여서, 무슨 일인지가 거기서 갈려야 한다.
 * 같은 날 사용자가 "줄바꿈이 안 돼서 보기 힘들다" 고 해 꼬리표 한 줄에 몰아 쓰던 것을 머리, 제목, 항목, 링크 마디로 갈랐다.
 */
export const TASK_NOTIFY_MESSAGES = {
  created: "🆕 새 할 일",
  assigned: "👤 담당자 지정",
  moved: "🔄 상태 변경",
  note: "💬 새 기록",
  category: "분류",
  priority: "우선순위",
  assignee: "담당자",
  status: "상태",
  /** 상태 변경 칸의 값. 화살표 글자 대신 조사로 잇는다(AGENTS §4) */
  movedValue: (from: string, to: string, particle: string) => `${from}에서 ${to}${particle}`,
  /** 사건을 낸 사람. 새 카드는 올린 사람, 나머지는 바꾼 사람이다 */
  createdBy: "작성자",
  changedBy: "바꾼 사람",
  noteBy: "적은 사람",
  /** 글 없이 파일만 남긴 기록 */
  noteFilesOnly: "파일을 남겼어요",
  /** 이름을 모를 때(탈퇴한 계정 등) */
  unknownPerson: "알 수 없음",
  openCard: "카드 열기",
} as const;
