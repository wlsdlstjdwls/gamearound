// 찜 문구(components/wishlist-button, 내 찜 목록). 기획서 v2.0 은 "위시리스트" 가 아니라 "찜" 이라 부른다.
export const WISHLIST_MESSAGES = {
  off: "찜하기",
  on: "찜했어요",
  added: "찜 목록에 담았어요",
  removed: "찜을 풀었어요",
  removeLabel: "찜 목록에서 빼기",
  /** 출시 예정 줄의 출시 알림 단추(components/wish-heart 의 release). 누르면 찜하고, 출시되면 알림함으로 알려 준다 */
  releaseOff: "출시 알림",
  releaseOn: "알림 받는 중",
  releaseAdded: "출시되면 알림함으로 알려 드려요. 찜 목록에도 담았어요",
  releaseRemoved: "출시 알림을 껐어요",
} as const;
