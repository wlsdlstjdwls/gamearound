// 게임 상세 화면(기획서 v2.0 S-05) 개편 문구. 목업의 마디 이름을 그대로 쓴다 — 기획서, 목업, 화면이 같은 말을 해야
// 기획 쪽과 이야기할 때 "그 칸" 이 하나로 가리켜진다. 오래된 상세 문구는 lib/games/messages 의 GAME_MESSAGES 에 그대로 있다.

export const DETAIL_MESSAGES = {
  /** 평점 칸 이름표. 목업은 영문 "CRITIC SCORES" 인데 유저 점수까지 같은 줄에 서서 "평점" 으로 묶었다 */
  /** 점수 줄 이름표(피드백 v11 목업 "CRITIC SCORES") */
  scoresLabel: "평론가 점수",
  /** 제목 위 플랫폼 배지 묶음의 낭독기 이름 */
  platformsLabel: "지원 플랫폼",
  /** 출시일 띠의 남은 날(game-detail/hero 의 ReleaseBanner) */
  releaseDday: (days: number) => `D-${days}`,
  /** 히어로 오른쪽 정보 판(hero 의 InfoCard) 출시일 줄 머리 */
  releaseRowLabel: "출시",
  /** 정보 판 출시일 줄의 남은 날 칸 — 남은 날이 0 인 날 */
  releaseToday: "오늘",
  /** 출시 전 게임의 평점 자리(기획서 v2.0 S-05: 평점은 출시작만) */
  scoresAfterRelease: "출시 후 평점이 표시돼요",
  scoresPending: "평점을 아직 모으는 중이에요.",
  scoreLabel: { metacritic: "METACRITIC", opencritic: "OPENCRITIC", ign: "IGN" },
  /** 셋 중 이 매체만 점수가 없을 때(game-detail/scores) */
  scoreNone: "점수 없음",
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
  /** 플랫폼 카드의 구독 줄(게임패스, PS Plus 등). 사용자는 "지원하는 게임패스" 라 불렀다(2026-11-16) — 스토어마다 구독 이름이 달라 묶음 이름으로 쓴다 */
  subscriptionRow: "구독 포함",
  subscriptionNone: "없음",
  /** 고른 플랫폼 카드에 패치 기록이 없을 때(game-detail/patch-notes-panel). 기록이 있는 스토어를 알려 준다 */
  patchesNoneForPick: (stores: string) => `이 플랫폼은 업데이트 기록을 공개하지 않아요. ${stores} 카드를 고르면 기록을 볼 수 있어요.`,
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
  /** 두 줄이다(2026-11-11 사용자 확정 문구, 줄바꿈까지). 화면은 줄마다 block 으로 세운다 */
  forecastNoRecord: ["아직 예상 가격이 없어요.", "조금만 기다려 주세요."] as const,
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
  /** 피드백 v11 #8 로 "가격 알림 관리" 로 바꿨다가 2026-11-16 사용자 지시로 "가격 알림" 으로 되돌렸다. 긴 말은 히어로 단추 칸에서 종 아이콘을 눌러 작게 만들었다 */
  headbarAlert: "가격 알림",
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
  /** 업데이트 노트 접기(2026-11-11 사용자 "접었다 펼칠 수 있게"). 접힌 동안 단추가 몇 건이 더 있는지 말한다 */
  patchesMore: (n: number) => `${n.toLocaleString("ko-KR")}건 모두 보기`,
  patchesLess: "접기",
  patchesPlatformLabel: "업데이트 노트 플랫폼",
  tabPerf: "성능 정보",
  tabsLabel: "업데이트와 성능",
  perfNone: "사양 정보가 아직 없어요. PC 스토어가 알려 준 사양만 보여 드려요.",
  perfUpcoming: "출시 전이라 성능 정보가 아직 없어요.",
  /** 성능 정보 탭 아래 플랫폼별 한 줄(game-detail/perf-row) */
  perfRowTitle: "플랫폼별 성능",
  perfRowNone: "공개된 성능 정보가 없어요",
  perfRowNote: "Xbox 는 스토어, PC 는 PCGamingWiki 가 공개한 지원 표시예요. PlayStation, Nintendo 는 스토어가 성능 정보를 공개하지 않아요.",
  moreHeading: "더 알아보기",
  sourcesHeading: "정보 출처",
} as const;
