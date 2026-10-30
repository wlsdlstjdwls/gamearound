// 찜 문구(components/wishlist-button, 내 찜 목록). 기획서 v2.0 은 "위시리스트" 가 아니라 "찜" 이라 부른다.
export const WISHLIST_MESSAGES = {
  /** 화면 제목, 사용자 메뉴, 머리띠 하트 단추가 같이 읽는다. "내 찜 목록" 에서 "내" 를 뗐다(2026-10-28 사용자 지시) */
  title: "찜 목록",
  off: "찜하기",
  on: "찜했어요",
  added: "찜 목록에 담았어요",
  removed: "찜을 풀었어요",
  removeLabel: "찜 목록에서 빼기",
  /** 카드 ✕ 를 누르면 묻는 말(2026-10-30 사용자 "삭제 누르면 확인"). 실수로 눌러도 바로 지워지지 않게 */
  removeConfirmTitle: "찜 목록에서 뺄까요?",
  removeConfirm: (title: string) => `${title} 을(를) 찜 목록에서 빼요.`,
  removeConfirmLabel: "빼기",
  /** 그 스토어에 이 게임이 없을 때 값 자리. 카드마다 같은 플랫폼 줄을 세워 높이를 맞춘다 */
  platformMissing: "-",
  /** 한 기기에 스토어가 여럿일 때 "+1" 말풍선의 첫 줄(2026-10-30 사용자 "PC 에 Epic 도 있지 않나"). 아래로 스토어별 값이 싼 순서로 선다 */
  storesHead: (device: string) => `${device}를 파는 스토어`,
  storeLowest: "최저",
  /** 출시 예정 줄의 출시 알림 단추(components/wish-heart 의 release). 누르면 찜하고, 출시되면 알림함으로 알려 준다 */
  releaseOff: "출시 알림",
  releaseOn: "알림 받는 중",
  releaseAdded: "출시되면 알림함으로 알려 드려요. 찜 목록에도 담았어요",
  releaseRemoved: "출시 알림을 껐어요",
  /** 카드 하트가 slug 로 찾던 게임이 사이에 내려간 때 */
  notFound: "게임을 찾지 못했어요",
  /** 찜 목록의 칸 이름(2026-10-29). 인디 게임 찜은 표가 따로라 칸을 나눠 보여 준다(server/services/indie/wishes) */
  gamesSection: "게임",
  indieSection: "인디 게임",
  indieEmptyTitle: "아직 찜한 인디 게임이 없어요",
  indieEmptyDescription: "인디 게임 카드나 상세에서 하트를 누르면 여기에 모여요.",
  indieEmptyAction: "인디 게임 둘러보기",
} as const;
