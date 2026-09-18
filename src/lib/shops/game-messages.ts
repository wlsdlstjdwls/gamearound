// 매장이 게임을 고르고 만드는 자리의 문구 — 매장 설계서 §5.1, §7.
//
// listing-messages 와 가른 이유: 저쪽은 "물건을 얼마에 몇 개 파나" 의 말이고 이쪽은
// "이게 무슨 게임인가" 의 말이다. 한 파일에 담으면 물건 폼 문구를 고치러 온 사람이
// 게임 등록 문구까지 훑게 된다.
export const SHOP_GAME_MESSAGES = {
  searchLabel: "어떤 게임인가요",
  searchHint: "제목을 적으면 카탈로그에서 찾아 줘요",
  searchButton: "찾기",
  searching: "찾는 중",
  searchEmpty: "찾는 이름이 없어요. 아래에서 직접 등록할 수 있어요",
  searchTooShort: "두 글자 이상 적어 주세요",
  resultsTitle: "찾은 게임",
  /** 후보를 다 봤는데도 없을 때 고르는 칸. 이걸 골라야 등록 칸이 열린다 */
  noneOfThese: "여기 없어요, 직접 등록할게요",
  selected: "고른 게임",
  clear: "다시 고르기",
  createTitle: "게임 직접 등록",
  createHint: "카탈로그에 없는 옛 게임이나 한정판이면 여기서 만들어요",
  titleLabel: "게임 제목",
  publisherLabel: "유통사",
  publisherHint: "적어 두면 같은 제목을 나중에 가를 수 있어요",
  /**
   * §7 의 "제출 직전에 한 번 더 검색을 강제한다" 를 사람이 읽는 말로 옮긴 것.
   * 중복의 대부분은 검색을 안 해서 생긴다 — 제목을 고친 뒤에는 그 제목으로 다시 찾아야 한다.
   */
  searchAgainRequired: "제목이 바뀌었어요. 같은 게임이 이미 있는지 한 번 더 찾아 주세요",
  /** 매장 발 게임임을 매장 화면에서 알린다. 손님 목록에 안 나온다는 사실을 숨기지 않는다 */
  shopOnlyNote: "우리 매장에서만 보이는 게임이에요. 스토어와 이어지면 전체 목록에도 나와요",
  createFailed: "게임을 만들지 못했어요. 잠시 뒤 다시 해 주세요",
  badRequest: "입력을 확인해 주세요",
} as const;
