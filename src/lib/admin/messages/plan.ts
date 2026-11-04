// 업무관리의 일정(WBS) 보기 문구(2026-11-04). 관리자 문구라 "-해요" 꼴 대신 짧은 업무 낱말을 쓴다(admin-pro-terminology).

/** 갈래 기본 이름표. 공통코드 PLAN_TRACK 이 덮는다 */
export const PLAN_TRACK_LABEL = { dev: "개발", plan: "기획", sales: "영업" } as const;

/** 구분 기본 이름표. 공통코드 PLAN_KIND 가 덮는다 */
export const PLAN_KIND_LABEL = { task: "작업", milestone: "이정표" } as const;

/** 계산한 상태(저장하지 않는다). 공통코드 PLAN_STATE 가 덮는다 */
export const PLAN_STATE_LABEL = { todo: "예정", doing: "진행", late: "지연", done: "완료" } as const;

export const PLAN_MESSAGES = {
  /** 칸반과 일정 보기 전환 */
  viewLabel: "보기",
  viewBoard: "칸반",
  viewPlan: "일정(WBS)",
  viewLeaveConfirm: "일정에 저장하지 않은 변경사항이 있어요. 저장하지 않고 칸반으로 갈까요?",
  viewLeave: "저장 안 하고 이동",

  gantt: "일정 차트",
  summary: "업무 별 진행률",
  sumTotal: (n: number) => `작업 ${n}`,
  sumDoing: (n: number) => `진행 ${n}`,
  sumLate: (n: number) => `지연 ${n}`,
  sumDone: (n: number) => `완료 ${n}`,
  nextMilestone: "다음 이정표",
  noMilestone: "남은 이정표가 없어요",
  dday: (n: number) => (n === 0 ? "D-day" : `D-${n}`),
  legend: "범례",
  groupBy: "묶어 보기",
  groupPerson: "담당자별",
  groupWbs: "WBS",
  personNow: "지금 하는 일",
  personNext: "다음 할 일",
  personIdle: "남은 일이 없어요",
  personMore: (n: number) => `외 ${n}건`,
  summaryOpen: "자세히",
  summaryClose: "접기",
  legendMilestone: "이정표",
  legendToday: "오늘",
  list: "WBS 목록",
  detail: "일정 상세",
  empty: "일정이 없어요. 툴바 입력으로 첫 줄을 만들어요",
  pick: "목록에서 일정을 골라요",
  newTitle: "새 일정",
  today: "오늘",
  zoom: "눈금",
  zoomDay: "일",
  zoomWeek: "주",
  zoomMonth: "월",
  collapse: (title: string) => `${title} 접기`,
  expand: (title: string) => `${title} 펼치기`,

  colNo: "번호",
  colTitle: "작업명",
  colTrack: "갈래",
  colKind: "구분",
  colStart: "시작일",
  colEnd: "종료일",
  colDays: "일수",
  colAssignee: "담당자",
  colProgress: "진행률",
  colState: "상태",
  colOutput: "산출물",

  sectionBasic: "기본 정보",
  sectionSchedule: "일정, 진행",
  sectionCards: "연결된 업무요청",
  fieldParent: "상위 일정",
  fieldTitle: "작업명",
  fieldTrack: "갈래",
  fieldKind: "구분",
  fieldPeriod: "기간",
  fieldDate: "일자",
  fieldAssignee: "담당자",
  fieldProgress: "진행률",
  fieldOutput: "산출물",
  fieldMemo: "메모",
  noParent: "없음(최상위)",
  noAssignee: "담당 없음",
  /** 진행률 칸을 비웠을 때 무엇으로 계산되는지 */
  progressAuto: "자동",
  progressFrom: { manual: "직접 입력", cards: (done: number, total: number) => `업무요청 ${done}/${total} 완료`, children: "하위 일정 평균", none: "-" },
  groupPeriod: "하위 일정의 처음과 끝",

  moveUp: "위로",
  moveDown: "아래로",
  indent: "들여쓰기",
  outdent: "내어쓰기",

  cardCreate: "업무요청 만들기",
  cardUnlink: "연결 해제",
  cardOpen: "칸반에서 열기",
  cardsEmpty: "연결된 업무요청이 없어요",
  cardsNeedSave: "저장한 일정에만 업무요청을 연결해요",
  cardCreated: "업무요청을 만들었어요",
  cardUnlinked: "연결을 해제했어요",

  saved: "저장했어요",
  failed: "저장하지 못했어요",
  reloaded: "다시 조회했어요",
  invalid: "입력값을 확인해요.",
  periodOrder: "종료일이 시작일보다 빨라요",
  parentSelf: "자기 자신을 상위로 둘 수 없어요",
  deleteTitle: "일정 삭제",
  deleteBody: (title: string, children: number) =>
    children > 0 ? `${title} 과 하위 일정 ${children}건을 목록에서 뺄까요? 저장하면 지워져요` : `${title} 을 목록에서 뺄까요? 저장하면 지워져요`,
  deleteOk: "삭제",
  deletedNote: "삭제한 줄은 저장하면 지워져요",

  /** 업무요청 팝업의 일정 칸 */
  taskPlanField: "일정",
  taskPlanNone: "연결 안 함",
} as const;
