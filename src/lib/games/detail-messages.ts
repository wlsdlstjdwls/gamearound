// 게임 상세 화면(기획서 v2.0 S-05) 개편 문구. 목업의 마디 이름을 그대로 쓴다 — 기획서, 목업, 화면이 같은 말을 해야
// 기획 쪽과 이야기할 때 "그 칸" 이 하나로 가리켜진다. 오래된 상세 문구는 lib/games/messages 의 GAME_MESSAGES 에 그대로 있다.

export const DETAIL_MESSAGES = {
  /** 평점 칸 이름표. 목업은 영문 "CRITIC SCORES" 인데 유저 점수까지 같은 줄에 서서 "평점" 으로 묶었다 */
  scoresLabel: "평점",
  /** 출시 전 게임의 평점 자리(기획서 v2.0 S-05: 평점은 출시작만) */
  scoresAfterRelease: "출시 후 평점이 표시돼요",
  scoresPending: "평점을 아직 모으는 중이에요.",
  scoreLabel: { metacritic: "Metacritic", opencritic: "OpenCritic", user: "유저 점수" },
  /** 히어로 버튼(목업 "가격 알림"). 팝업 안 저장 버튼까지 같은 팝업이라 긴 말(가격 알림 받기)은 할인 예측 판이 아니라 여기서 줄인다 */
  heroAlert: "가격 알림",
  playtimeTitle: "플레이타임",
  /** 목업 표기. 옛 카드(playtime-card)는 "메인 + 서브" 였다 */
  playtimeItems: { mainStoryHours: "메인 스토리", mainExtraHours: "메인 + 추가 콘텐츠", completionistHours: "완전 정복" },
  playtimeUnit: "시간",
  playtimeEmpty: "플레이타임 정보를 아직 모으는 중이에요.",
  priceHeading: "플랫폼별 가격 비교",
  upcomingHeading: "출시 정보",
  releaseRow: "출시일",
  metacriticRow: "메타크리틱",
  hardwareRow: "지원 기종",
  versionRow: "버전",
  userScoreRow: "유저 점수",
  listPriceRow: "정가",
  currentPriceRow: "현재 가격",
  upcomingTag: "출시 예정",
  releaseAlert: "출시 알림 받기",
  releaseUnknown: "미정",
  chartHeading: "가격 변동 추이",
  chartMore: "자세히 보기",
  chartEmpty: "가격이 바뀌면 기록이 쌓이고, 그때부터 그래프가 그려져요.",
  forecastTitle: "할인 예측",
  /** 고른 플랫폼 카드의 이름(game-detail/platform-pick). 예측이 그 플랫폼 값만 본다는 말 */
  forecastBasisPlatform: (name: string) => `${name} 기준`,
  /** 진행 중 할인을 먼저 말한다(2026-10-26). 행사명은 스토어가 줄 때만, 남은 날은 끝나는 날을 알 때만 */
  forecastRunning: (name: string | null, pct: number) => `지금 ${name ?? "할인"} 중이에요(-${pct}%).`,
  forecastRunningLeft: (n: number) => ({ before: " 끝나기까지 ", days: `${n}일`, after: " 남았어요." }),
  forecastDays: (name: string | null, n: number) => ({ before: name ? `다음 할인(${name})까지 약 ` : "다음 할인까지 약 ", days: `${n}일`, after: " 남았어요." }),
  forecastNoDate: "다음 할인 시기를 짐작할 기록이 아직 없어요.",
  forecastCycle: (days: number) => `이 게임의 지난 할인 간격(약 ${days}일)으로 추정했어요.`,
  forecastBasisRate: (pct: number) => `이 스토어에서 받은 가장 큰 할인율(-${pct}%)을 정가에 맞춰 셈했어요.`,
  forecastExpected: "예상 가격",
  forecastRangeNote: (pct: number) => `(±${pct}% 범위)`,
  forecastNoRecord: "할인 기록이 쌓이면 예상 가격을 알려 드려요.",
  forecastConfirmed: "공지된 일정이에요.",
  forecastEstimated: "예년 일정으로 추정했어요.",
  forecastAlert: "알림 설정하기",
  /** 스크롤 머리바의 단추(game-headbar) */
  headbarAlert: "할인 알림 받기",
  forecastDisclaimer: "할인 예측은 지난 가격 기록과 스토어 세일 일정을 바탕으로 한 참고용 정보예요. 실제 할인 시기와 가격은 다를 수 있어요.",
  newsHeading: "최신 관련 뉴스",
  newsMore: "더보기",
  newsLess: "접기",
  newsEmpty: "관련 뉴스가 아직 없어요.",
  /** 패치 기록도 사양도 없을 때 한 줄로 접은 마디(game-detail/updates) */
  updatesEmpty: "업데이트 노트와 성능 정보가 아직 없어요.",
  updatesEmptyUpcoming: "출시 뒤 업데이트 노트와 성능 정보가 채워져요.",
  tabPatches: "업데이트 노트",
  tabPerf: "성능 정보",
  tabsLabel: "업데이트와 성능",
  perfNone: "사양 정보가 아직 없어요. PC 스토어가 알려 준 사양만 보여 드려요.",
  perfUpcoming: "출시 전이라 성능 정보가 아직 없어요.",
  moreHeading: "더 알아보기",
  sourcesHeading: "정보 출처",
} as const;
