// 홈 문구(2026-10-02 홈 재구성). "-해요"체, 가운뎃점과 화살표 글자를 쓰지 않는다.
//
// 머리 약속 한 줄("같은 게임, 제일 싼 곳을 찾아 드려요")과 숫자 셋, 가격 알림 입구를 같은 날 걷었다(사용자: "이건 빼라").
// 홈은 다시 세일 배너, 할인 격자로 시작한다.
export const HOME_MESSAGES = {
  /** 히어로(기획서 v2.0 S-01, 목업 v66). 둘째 조각만 브랜드색이다 */
  heroLead: "이 게임, 지금 어디서",
  heroAccent: "얼마에?",
  heroBody: "플랫폼별 가격과 할인 기록, 최신 뉴스를 한 화면에서 확인해요.",
  heroSearchLabel: "게임 검색",
  heroSearchPlaceholder: "게임 이름, 장르, 개발사로 찾아보세요",
  heroSearchCta: "검색",
  /** 히어로 가장자리에 떠 있는 딱지(components/home/hero). 이 서비스가 보여 주는 것을 그림으로 말하고, 누르면 그 목록으로 간다 */
  heroChipDiscount: "-70%",
  heroChipDiscountLabel: "70% 이상 할인하는 게임 보기",
  heroChipLowest: "최저가",
  heroChipLowestLabel: "지금 가장 싼 할인 게임 보기",
  heroChipAlert: "출시 알림",
  heroChipAlertLabel: "출시 예정 게임 보고 출시 알림 받기",
  /** 기획서 v2.0 S-01 줄 이름 */
  todayDealsTitle: "오늘의 할인",
  upcomingTitle: "출시 예정",
  upcomingEmpty: "출시일이 잡힌 게임이 아직 없어요.",
  popularGamesTitle: "인기 게임",
  genresTitle: "장르 바로가기",
  more: "더보기",
  discountsTitle: "지금 할인 중",
  storeDealsTitle: "스토어만 바꿔도 더 싸요",
  storeDealsNote: "같은 기기에서 고를 수 있는 스토어끼리 견줬어요",
  popularTitle: "지금 인기 순위",
  popularNote: "스토어 판매 순위 기준",
  budgetTitle: "만 원 이하로 사는 할인",
  endingSoonTitle: "곧 할인 마감",
  endingSoonEmpty: "종료 시각이 공개된 할인이 없어요.",
  newsTitle: "뉴스",
  releasesTitle: "최근 출시",
  seeAll: "전체 보기",
  allGames: "전체 게임 목록",
  railPrev: "이전 게임 보기",
  railNext: "다음 게임 보기",
  discountsEmptyTitle: "지금 할인 중인 게임이 없어요",
  discountsEmptyBody: "할인 중인 게임이 확인되면 이 자리에 표시돼요.",
  discountsEmptyAction: "전체 게임 목록 보기",
  /** 개발 환경에서만 보인다(lib/home/db-failure) */
  devDbHint: "DB 에 연결하지 못했어요. .env.local 의 DATABASE_URL 을 확인하고 pnpm db:migrate 를 실행하세요.",
} as const;
