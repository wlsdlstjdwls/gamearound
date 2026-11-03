// 뉴스 화면 문구 단일 원천. 화면은 이 객체만 읽는다(규약 §2).
export const NEWS_MESSAGES = {
  title: "게임 뉴스",
  /** 화면에서는 뗐다(2026-09-22, 사용자 지정) — 검색결과, SNS 카드의 설명으로만 남는다 */
  lead: "매체가 낸 기사 제목과 링크만 모아요. 본문은 저장하지 않으니 읽을 때는 원문으로 넘어가요.",
  empty: "아직 모은 기사가 없어요.",
} as const;

/** 제목 옆 건수. 몇 건이 쌓였는지가 훑는 사람의 다음 질문이다 */
export function newsCountText(count: number): string {
  return `${count.toLocaleString("ko-KR")}건`;
}

/** 주간 맞춤 소식(설정 스위치, 맞춤 소식 화면). 발송 문구는 알림 템플릿(mail.news_digest, web.news_digest)이다 */
export const NEWS_DIGEST_MESSAGES = {
  title: "주간 맞춤 소식",
  on: "매주 찜한 게임과 고른 플랫폼, 장르 소식을 알림함과 메일로 묶어 보내 드려요",
  off: "받지 않아요. 켜면 이번 주 소식부터 보내 드려요",
  failed: "바꾸지 못했어요. 잠시 뒤 다시 해 주세요",
  /** 스위치 밑 링크. 켜지 않아도 화면은 볼 수 있다 */
  seeMine: "이번 주 맞춤 소식 보기",
  pageTitle: "내 맞춤 소식",
  pageNote: "지난 7일 동안 찜한 게임과 고른 플랫폼, 장르에 맞는 기사예요",
  /** 고를 근거(찜, 취향)가 없을 때 */
  noTasteTitle: "아직 고를 근거가 없어요",
  noTasteBody: "게임을 찜하거나 좋아하는 플랫폼, 장르를 고르면 맞는 소식을 모아 드려요.",
  noTasteAction: "취향 고르러 가기",
  /** 근거는 있는데 맞는 기사가 없을 때 */
  emptyTitle: "이번 주에는 맞는 소식이 없어요",
  emptyBody: "새 기사가 들어오면 여기에 모여요.",
  allNews: "전체 뉴스 보기",
} as const;
