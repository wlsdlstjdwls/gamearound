// 인디 상세의 "내 게임" 띠 문구(components/indie/owner-bar). 화면 하나에만 쓰여 indie/messages(이미 300줄 넘음)에 더하지 않고 따로 둔다.
export const INDIE_OWNER_MESSAGES = {
  label: "내 게임",
  rank: (n: number) => `이번 달 ${n}위`,
  views: "조회",
  likes: "찜",
  comments: "댓글",
  edit: "수정하기",
  stats: "통계 보기",
  playtest: "플레이테스트",
} as const;
