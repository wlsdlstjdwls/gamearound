// 뉴스 화면 문구 단일 원천. 화면은 이 객체만 읽는다(규약 §2).
export const NEWS_MESSAGES = {
  title: "게임 뉴스",
  lead: "매체가 낸 기사 제목과 링크만 모아요. 본문은 저장하지 않으니 읽을 때는 원문으로 넘어가요.",
  empty: "아직 모은 기사가 없어요.",
  browseGames: "전체 게임 보기",
} as const;

/** 제목 옆 건수. 몇 건이 쌓였는지가 훑는 사람의 다음 질문이다 */
export function newsCountText(count: number): string {
  return `${count.toLocaleString("ko-KR")}건`;
}
