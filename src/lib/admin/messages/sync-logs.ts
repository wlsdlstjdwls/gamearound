// 수집이력조회(/admin/sync-logs) 문구. screens.ts 에 있던 묶음을 화면 하나로 뺐다(관리자 문구는 lib/admin/messages/<화면>).
// 결과 이름표(정상, 일부 실패, 실패)와 신규 찾기 요약은 수집현황과 같은 말이라 sync.ts 의 SYNC_STATUS_LABEL, SYNC_MESSAGES.discoverySummary 를 같이 쓴다.

export const LOG_MESSAGES = {
  search: "조회조건",
  searchSource: "스토어",
  searchStatus: "결과",
  all: "전체",
  listLabel: "수집 실행 목록",
  empty: "조건에 맞는 실행 기록이 없어요.",
  detailTitle: "실행 상세",
  detailTitleOf: (source: string, id: number) => `${source} 실행 ${id}`,
  /** 서버는 최근 몇 건만 싣는다(listSyncLogs). 더 옛 기록은 스토어, 결과로 좁혀 본다 */
  limitNote: (n: number) => `최근 ${n.toLocaleString("ko-KR")}건까지 보여요`,

  /* 그리드 칸 */
  colId: "실행번호",
  colSource: "스토어",
  colStatus: "결과",
  colStarted: "시작일시",
  colDuration: "소요시간",
  colProcessed: "처리건수",
  colFailed: "실패건수",
  colDiscovery: "신규 발견",

  /* 상세 */
  sectionRun: "실행",
  sectionDiscovery: "신규 발견",
  sectionError: "오류 샘플",
  fieldId: "실행번호",
  fieldCodeName: "스토어코드/명",
  fieldStatus: "결과",
  fieldStarted: "시작일시",
  fieldFinished: "종료일시",
  fieldDuration: "소요시간",
  fieldProcessed: "처리건수",
  fieldFailed: "실패건수",
  fieldStop: "종료 사유",
  fieldScan: "확인 범위",
  notFinished: "종료 기록 없음",

  /** 발견이 멈춘 까닭. "예산 소진" 이 이어지면 포화 신호다(아는 것만 나오는 구간이 예산보다 길다) */
  stopWant: "목표 달성",
  stopBudget: "예산 소진",
  stopCatalogEnd: "카탈로그 끝까지 확인",
} as const;
