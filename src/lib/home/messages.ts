// 홈 문구(2026-10-02 홈 재구성). "-해요"체, 가운뎃점과 화살표 글자를 쓰지 않는다.
//
// 머리 약속 한 줄은 후보 셋에서 골랐다:
//   1) "PS, Xbox, 스위치, 스팀 값을 한 번에 비교해요" — 무엇을 하는지는 말하지만 왜 와야 하는지는 안 말한다
//   2) "어디서 사야 제일 싼지 한눈에 봐요" — 좋지만 "한눈에" 가 화면 설명에 그친다
//   3) "같은 게임, 제일 싼 곳을 찾아 드려요" — 찾아오는 이유(값)와 우리가 하는 일(찾기)이 한 줄에 다 있다. 이것을 쓴다
export const HOME_MESSAGES = {
  heroEyebrow: "한국 스토어 게임 값 비교",
  heroLead: "같은 게임,",
  heroAccent: "제일 싼 곳",
  heroTail: "을 찾아 드려요",
  heroSub: "Steam, Epic Games, PlayStation, Xbox, Nintendo 값을 모아 견줘요.",
  statTracked: "게임",
  statOnSale: "지금 할인 중",
  statStores: "스토어",
  syncedAt: (when: string) => `${when} 기준`,

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
} as const;
