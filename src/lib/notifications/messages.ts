// 알림함 문구(헤더 종 팝오버, 기획서 v2.0 M-03). 만들 때 다 적어 두는 한 줄이라 원본 제목을 품는다.
export const NOTIFICATION_MESSAGES = {
  title: "알림",
  empty: "아직 받은 알림이 없어요",
  signInLead: "로그인하면 가격 하락, 내 글의 새 댓글을 여기서 모아 봐요.",
  signIn: "로그인",
  loading: "불러오는 중이에요",
  alertSettings: "가격 알림 관리",
  /** 팝오버 맨 아래의 알림함 전체 보기(/notifications) */
  seeAll: "전체 보기",
  /** 알림함 전체 화면 */
  pageTitle: "알림함",
  pageNote: (total: number, unread: number) => (unread > 0 ? `${total.toLocaleString("ko-KR")}건, 새 알림 ${unread.toLocaleString("ko-KR")}건` : `${total.toLocaleString("ko-KR")}건`),
  pageEmptyBody: "찜한 게임이 할인하거나 내 글에 댓글이 달리면 여기에 모여요.",
  pageEmptyAction: "게임 둘러보기",
  unread: "새 알림",
  comment: (postTitle: string) => `'${postTitle}' 글에 새 댓글이 달렸어요`,
  reply: (postTitle: string) => `'${postTitle}' 글의 내 댓글에 답글이 달렸어요`,
  priceDrop: (gameTitle: string, priceText: string) => `${gameTitle} 가격이 ${priceText}(으)로 내려갔어요`,
  /** 알림을 건 순간 이미 조건에 맞았다(services/alert-inbox) — 내려간 게 아니라 "벌써 맞다" 를 말한다 */
  priceMet: (gameTitle: string, priceText: string) => `${gameTitle} 지금 ${priceText}, 알림 조건에 맞아요`,
  approved: (gameTitle: string) => `'${gameTitle}' 등록이 승인됐어요`,
  rejected: (gameTitle: string) => `'${gameTitle}' 등록이 반려됐어요. 사유를 확인해 주세요`,
  /** 찜한 게임에 할인이 붙었다(sync/dispatch-wish-alerts). 조건을 건 적이 없는 사람에게 가는 글이라 "찜한" 으로 이유를 먼저 말한다 */
  wishSale: (gameTitle: string, priceText: string, pct: number) => `찜한 '${gameTitle}' ${pct}% 할인, 지금 ${priceText}이에요`,
  /** 찜한 게임이 역대 최저가가 됐다. 기록이 60일 넘게 쌓인 상품에만 이 말을 쓴다(lib/games/historic-low, 2026-11-11 사용자 확정) */
  wishRecordLow: (gameTitle: string, priceText: string) => `찜한 '${gameTitle}' 역대 최저가예요, 지금 ${priceText}`,
  /** 출시 알림(찜한 출시 예정 게임이 나왔다, sync/release-alerts) */
  released: (gameTitle: string) => `찜한 '${gameTitle}' 출시 소식이 왔어요`,
  /** 주간 맞춤 소식(sync/news-digest). 템플릿 web.news_digest 가 없을 때의 기본 글 */
  newsDigest: (count: number) => `이번 주 맞춤 소식 ${count}건이 모였어요`,
  /** 주간 맞춤 소식 기본 메일의 제목(앞에 서비스 이름이 붙는다). 템플릿 mail.news_digest 가 없을 때만 쓴다 */
  newsDigestSubject: (count: number) => `이번 주 맞춤 소식 ${count}건`,
  /** 밤사이 미룬 알림 아침 한 통(sync/morning-alerts). 템플릿 push.morning_alerts, mail.morning_alerts 가 없을 때의 기본 글 */
  morningAlertsTitle: (count: number) => `밤사이 알림 ${count}건`,
  morningAlertsMailSubject: (count: number) => `밤사이 가격 알림 ${count}건`,
  /** 아침 메일 목록이 상한을 넘었을 때 마지막 줄 */
  morningAlertsMore: (rest: number) => `외 ${rest}건은 알림함에서 확인해 주세요`,
} as const;
