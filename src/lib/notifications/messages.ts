// 알림함 문구(헤더 종 팝오버, 기획서 v2.0 M-03). 만들 때 다 적어 두는 한 줄이라 원본 제목을 품는다.
export const NOTIFICATION_MESSAGES = {
  title: "알림",
  empty: "아직 받은 알림이 없어요",
  signInLead: "로그인하면 가격 하락, 내 글의 새 댓글을 여기서 모아 봐요.",
  signIn: "로그인",
  loading: "불러오는 중이에요",
  alertSettings: "가격 알림 관리",
  comment: (postTitle: string) => `'${postTitle}' 글에 새 댓글이 달렸어요`,
  reply: (postTitle: string) => `'${postTitle}' 글의 내 댓글에 답글이 달렸어요`,
  priceDrop: (gameTitle: string, priceText: string) => `${gameTitle} 가격이 ${priceText}(으)로 내려갔어요`,
  /** 알림을 건 순간 이미 조건에 맞았다(services/alert-inbox) — 내려간 게 아니라 "벌써 맞다" 를 말한다 */
  priceMet: (gameTitle: string, priceText: string) => `${gameTitle} 지금 ${priceText}, 알림 조건에 맞아요`,
  approved: (gameTitle: string) => `'${gameTitle}' 등록이 승인됐어요`,
  rejected: (gameTitle: string) => `'${gameTitle}' 등록이 반려됐어요. 사유를 확인해 주세요`,
  /** 출시 알림(찜한 출시 예정 게임이 나왔다, sync/release-alerts) */
  released: (gameTitle: string) => `찜한 '${gameTitle}' 출시 소식이 왔어요`,
} as const;
