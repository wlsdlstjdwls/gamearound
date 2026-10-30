// 수집현황(/admin/sync) 문구. screens.ts 에 있던 묶음을 화면 하나로 뺐다(2026-10-29, 관리자 문구는 lib/admin/messages/<화면>).
// 실행 결과 이름표(SYNC_STATUS_LABEL)는 수집이력조회, 게임 관리 화면도 같이 쓴다 — 같은 값을 세 곳이 다른 말로 부르지 않게 여기 한 벌만 둔다.

/** 실행 결과. "partial" 이 성공인지 실패인지 영문으로는 판단이 안 선다 */
export const SYNC_STATUS_LABEL = {
  ok: "정상",
  partial: "일부 실패",
  failed: "실패",
} as const;

/** 실행 한 번의 상태 이름표. 끝나지 않은 실행은 결과 값과 따로 "도는 중", "끊김" 으로 읽는다(lib/admin/sync-health) */
export const SYNC_RUN_HEALTH_LABEL = {
  ...SYNC_STATUS_LABEL,
  running: "실행 중",
  stalled: "중단됨",
} as const;

export const SYNC_MESSAGES = {
  rerun: "Actions 에서 재실행",
  rerunHint: "NEXT_PUBLIC_GITHUB_REPO 를 넣으면 재실행 링크가 나와요.",

  /* 조회조건(2026-10-29 SBO 그리드로 옮김). 상태 "손볼 것" 은 현황판이 세는 셋(끊김, 실패, 일부 실패)을 한 번에 본다 */
  search: "조회조건",
  searchSource: "스토어",
  searchStatus: "상태",
  all: "전체",
  attention: "조치 필요",
  /** 쉬는 소스와 돈 적 없는 소스는 같은 상태(idle)다. 칸 안에서는 둘을 갈라 적는다 */
  idleFilter: "비활성, 미실행",
  listLabel: "스토어별 수집 목록",
  empty: "조건에 맞는 스토어가 없어요.",
  detailTitle: "스토어 상세",

  /* 상태 이름표 */
  disabled: "비활성",
  noRun: "미실행",
  running: SYNC_RUN_HEALTH_LABEL.running,
  /** 끝났다는 기록 없이 오래 남은 실행. "도는 중" 과 가른다 — 며칠째 안 끝난 실행은 정상이 아니다 */
  stalled: SYNC_RUN_HEALTH_LABEL.stalled,

  /* 그리드 칸 */
  colStatus: "상태",
  colSource: "스토어",
  finishedAt: "종료일시",
  colProcessed: "처리건수",
  colFailed: "실패건수",
  failedToday: "금일 실패",
  colRun: "수집 게임",
  failedTimes: (n: number) => `${n.toLocaleString("ko-KR")}회`,
  neverRan: "아직 실행 이력이 없어요.",

  /* 상세 */
  sectionStatus: "수집 상태",
  sectionError: "오류 샘플",
  sectionRun: "수집 게임",
  fieldCodeName: "스토어코드/명",
  fieldStatus: "상태",
  fieldFinished: "종료일시",
  fieldProcessed: "처리건수",
  fieldFailed: "실패건수",
  fieldFailedToday: "금일 실패",
  discovery: "신규 발견",
  fieldDisabled: "비활성 사유",
  fieldRunStarted: "시작일시",
  /** startPage 는 이어 읽는 소스만 준다 — 실행마다 앞으로 나가는지가 보여야 "같은 데만 본다" 가 갈린다 */
  discoverySummary: (pages: number, scanned: number, fresh: number, startPage?: number) =>
    `${startPage ? `${startPage}페이지부터 ` : ""}${pages}페이지, ${scanned}건 확인, 신규 ${fresh}건`,
  count: (n: number) => `${n.toLocaleString("ko-KR")}건`,

  /*
   * "가져온 게임" 시트 — 마지막 기록 실행이 만진 게임과 바뀐 값(2026-09-30, "방금 만진 게임" 세 줄을 대신한다).
   * 제목이 먼저인 이유는 그대로다: 숫자가 아니라 이름이라야 "엉뚱한 걸 긁고 있나" 가 갈린다
   */
  runItemsOpen: (n: number) => `수집 게임 ${n.toLocaleString("ko-KR")}건`,
  /** 그리드 칸 안 글자. 칸 머리가 "가져온 게임" 이라 숫자만 둔다 */
  runItemsShort: (n: number) => `${n.toLocaleString("ko-KR")}건`,
  runItemsTitle: (source: string) => `${source} 수집 게임`,
  runItemsLead: (ago: string, processed: number, shown: number) =>
    processed > shown
      ? `${ago} 시작한 실행이에요. 처리 ${processed.toLocaleString("ko-KR")}건 중 ${shown.toLocaleString("ko-KR")}건을 표시해요. 신규 등록, 변경 항목이 먼저 나와요.`
      : `${ago} 시작한 실행이에요.`,
  /** 되짚은 목록(admin-activity 의 traceRunItems)에만 붙는다 — 모르는 것을 "바뀐 값 없음" 으로 읽히지 않게 */
  runItemsTraced: "변경 이력을 기록하기 전의 실행이라 가격과 신규 등록만 보여요. 다음 수집부터 변경 항목이 모두 나와요.",
  runItemsCreated: "신규 등록",
  runItemsChanged: "변경",
  runItemsSame: "변경 없음",
  /** 되짚은 목록은 가격만 알아서 셈의 이름도 가격으로 좁힌다 */
  runItemsPriceChanged: "가격 변경",
  runItemsPriceSame: "가격 변경 없음",
  /** 가져와 견줬지만 달라진 칸이 없다 — 실패가 아니다 */
  runItemsNoChange: "변경 없음",
  /** 줄은 시트를 열 때 받는다(admin-activity 머리 주석) */
  runItemsLoading: "목록을 불러오는 중이에요.",
  runItemsLoadFailed: "목록을 불러오지 못했어요. 창을 닫았다가 다시 열어 주세요.",

  /* 머리 요약 줄 — 소스별 배지가 전부 초록이어도 이 줄이 0이면 값이 안 들어오고 있다는 뜻이다 */
  last24h: "최근 24시간",
  totalNewGames: "신규 게임",
  totalSnapshots: "가격 수집",
  totalRuns: "수집 실행",
  totalFailed: "금일 실패",
} as const;
