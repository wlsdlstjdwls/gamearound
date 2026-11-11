// 게임 상세 화면(기획서 v2.0 S-05) 개편 문구. 목업의 마디 이름을 그대로 쓴다 — 기획서, 목업, 화면이 같은 말을 해야
// 기획 쪽과 이야기할 때 "그 칸" 이 하나로 가리켜진다. 오래된 상세 문구는 lib/games/messages 의 GAME_MESSAGES 에 그대로 있다.

export const DETAIL_MESSAGES = {
  /** 평점 칸 이름표. 목업은 영문 "CRITIC SCORES" 인데 유저 점수까지 같은 줄에 서서 "평점" 으로 묶었다 */
  scoresLabel: "평점",
  /** 출시일 띠의 남은 날(game-detail/hero 의 ReleaseBanner) */
  releaseDday: (days: number) => `D-${days}`,
  /** 출시 전 게임의 평점 자리(기획서 v2.0 S-05: 평점은 출시작만) */
  scoresAfterRelease: "출시 후 평점이 표시돼요",
  scoresPending: "평점을 아직 모으는 중이에요.",
  scoreLabel: { metacritic: "Metacritic", opencritic: "OpenCritic", user: "유저 점수" },
  /** 히어로 버튼(목업 "가격 알림"). 팝업 안 저장 버튼까지 같은 팝업이라 긴 말(가격 알림 받기)은 할인 예측 판이 아니라 여기서 줄인다 */
  heroAlert: "가격 알림",
  playtimeTitle: "플레이타임",
  /** "메인 + 추가" 에서 "메인 + 서브" 로(2026-11-11 사용자 지정). 옛 카드(playtime-card)와 같은 말이 됐다 */
  playtimeItems: { mainStoryHours: "메인 스토리", mainExtraHours: "메인 + 서브", completionistHours: "완전 정복" },
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
  chartShort: (since: string) => `가격 기록은 ${since}부터 모으고 있어요. 날이 지날수록 그래프가 채워져요.`,
  forecastTitle: "할인 예측",
  /** 고른 플랫폼 카드의 이름(game-detail/platform-pick). 예측이 그 플랫폼 값만 본다는 말 */
  forecastBasisPlatform: (name: string) => `${name} 기준`,
  // "기록이 쌓이면" 꼴은 쓰지 않는다(2026-11-11 사용자 "할인 기록을 쌓는단 말이 맘에 안 듦") — 지금 없는 것만 짧게 말한다
  forecastNoDate: "다음 할인 시기는 아직 알 수 없어요.",
  forecastExpected: "예상 가격",
  forecastNoRecord: "지난 할인이 없어 예상 가격은 아직 없어요.",
  forecastAlert: "알림 설정하기",
  /** 예측 판의 "언제" 칸(2026-11-11 사용자 "그림이나 UI 로 가시성 높게"). 큰 D-숫자 위의 머리말 */
  forecastWhenHead: (name: string | null) => (name ? `${name}까지` : "다음 할인까지"),
  forecastDday: (n: number) => `D-${n}`,
  /** 낭독기는 "D-37" 을 "디 빼기 삼십칠" 로 읽는다 — 말로 바꿔 준다 */
  forecastDdaySr: (n: number) => `${n}일 남았어요`,
  /** 근거 딱지. 예전 문장 꼴("공지된 일정이에요.")을 딱지 크기로 줄였다 */
  forecastBasisTag: { confirmed: "공지된 일정", estimated: "예년 일정 추정" } as const,
  forecastCycleTag: (days: number) => `지난 주기 약 ${days}일`,
  /** 진행 중 할인 띠 */
  forecastRunningNow: (name: string | null) => `지금 ${name ?? "할인"} 중`,
  forecastRunningLeftShort: (n: number) => `${n}일 뒤 끝나요`,
  /** 값 견주기 막대 두 줄(2026-11-11 사용자 "막대가 뭘 나타내는지 모르겠다" — 표식 하나 대신 지금 대 그때를 나란히) */
  forecastNowLabel: "지금 가격",
  /** 진행 중 할인이 있으면 견줄 값은 지금 값이 아니라 그 할인이 끝난 뒤의 값이다 */
  forecastAfterRunLabel: "할인 끝나면",
  forecastSaleLabel: (name: string | null) => (name ? `${name} 예상` : "다음 할인 예상"),
  forecastSave: (amount: string) => ({ before: "기다리면 약 ", amount, after: " 아껴요" }),
  forecastBasisLow: (date: string) => `${date}에 본 기록 최저가로 셈했어요.`,
  forecastBasisRate: (pct: number) => `이 스토어의 가장 큰 할인율(-${pct}%)로 셈했어요.`,
  /** 히어로의 게시판 링크(game-detail/posts-link) */
  postsLink: (n: number) => `이 게임 리뷰와 공략 ${n.toLocaleString("ko-KR")}개 보기`,
  postsFirst: "이 게임 첫 리뷰 쓰기",
  /** 좁은 화면 바닥 구매 띠(game-detail/buy-bar) */
  buyBarBest: (name: string) => `최저가 | ${name}`,
  buyBarCta: "구매하기",
  buyBarFree: "무료로 받기",
  /** 스토어 주소가 없는 띠 — 가격 비교 마디로 내려간다 */
  buyBarCompare: "가격 비교",
  /** 스크롤 머리바의 단추(game-headbar) */
  headbarAlert: "할인 알림 받기",
  /**
   * 할인 예측 아래 알림. 문장마다 한 줄이다(2026-11-11 사용자: 습니다체, 마침표, 문장 줄바꿈). 다른 문구의 "-해요" 체와 다른 이유:
   * 이 자리는 안내가 아니라 고지라 사용자가 격식체를 골랐다
   */
  forecastDisclaimer: ["지난 가격과 세일 일정으로 예측한 참고 정보입니다.", "실제 할인 시기와 가격은 다를 수 있습니다."],
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
