// 메이커 멤버십 혜택 문구(2026-10-27) — 내 게임 통계 자세히(날짜별 그래프, 유입 경로)와 메이커 꼬리표.
import type { TrafficSource } from "./traffic";

export const INDIE_STATS_DETAIL_MESSAGES = {
  open: "자세히",
  title: (game: string) => `${game} 통계 자세히`,
  lead: "지난 30일 동안 날마다 얼마나 보고, 해 보러 가고, 찜하고, 말을 남겼는지, 어디서 들어왔는지예요.",
  views: "날짜별 조회",
  plays: "날짜별 플레이하기 클릭",
  likes: "날짜별 새 찜",
  comments: "날짜별 댓글",
  total: "30일 합",
  sources: "어디서 들어왔나요",
  sourcesEmpty: "아직 들어온 기록이 없어요",
  sourcesSince: "유입 경로는 2026년 10월 27일부터 세요",
  share: (pct: string) => `${pct}%`,
  back: "내 게임 통계로",
  lockedTitle: "메이커 멤버십에서 볼 수 있어요",
  lockedLead: "날짜별 그래프와 유입 경로는 메이커 멤버십 혜택이에요. 숫자는 지금도 모으고 있어서 가입하면 바로 볼 수 있어요.",
  lockedCta: "멤버십 보기",
} as const;

export const TRAFFIC_SOURCE_LABEL: Record<TrafficSource, string> = {
  home: "홈",
  indie_list: "인디 게임 목록",
  hall_of_fame: "명예의 전당",
  rookies: "슈퍼루키",
  board: "게시판, 라운지",
  game: "게임 상세",
  internal: "사이트 안 다른 화면",
  search_engine: "검색엔진",
  youtube: "유튜브",
  sns: "SNS, 커뮤니티",
  external: "다른 사이트",
  direct: "주소로 바로",
};

/** 메이커 꼬리표. "인증" 이라 쓰지 않는다 — 돈을 낸 표시지 우리가 개발자를 확인했다는 뜻이 아니다 */
export const MAKER_BADGE_MESSAGES = {
  label: "메이커",
  hint: "메이커 멤버십으로 활동하는 개발자예요",
} as const;
