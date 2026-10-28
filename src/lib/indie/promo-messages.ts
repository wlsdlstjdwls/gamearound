// 인디 홍보 기본기 문구(플레이하기, 댓글, 개발자 소식 받기, 내 게임 통계). lib/indie/messages 가 300줄에 닿아 갈라 뒀다(AGENTS §4).
import { INDIE_PLATFORM_LABEL } from "./messages";
import { storeLinkPlatform } from "./constants";

export const INDIE_PROMO_MESSAGES = {
  play: "플레이하기",
  /** 큰 단추 아래 작은 줄 — 어디로 가는지 미리 말한다 */
  playVia: (kind: string) => {
    const p = storeLinkPlatform(kind);
    if (p === "web") return "웹에서 바로 해 봐요";
    if (p) return `${INDIE_PLATFORM_LABEL[p]} 스토어로 가요`;
    if (kind === "demo") return "체험판을 받아요";
    return "스토어로 가요";
  },

  follow: "개발자 소식 받기",
  following: "소식 받는 중",
  followed: "새 개발일지와 출시 소식을 알림함으로 보내 드려요",
  unfollowed: "개발자 소식 받기를 껐어요",
  followFailed: "처리하지 못했어요",

  commentNotFound: "댓글을 달 수 없는 게임이에요",

  statsTitle: "내 게임 통계",
  statsLead: "지난 30일 동안 내 게임에 모인 반응이에요. 숫자를 보고 다음 소식을 준비해 보세요.",
  statsEmpty: "아직 등록한 게임이 없어요",
  statsEmptyLead: "게임을 등록하면 조회, 플레이하기 클릭, 찜, 댓글을 여기서 모아 봐요.",
  statsViews: "조회",
  statsPlays: "플레이하기 클릭",
  statsOutbound: "다른 링크 클릭",
  statsLikes: "새 찜",
  statsComments: "댓글",
  statsFollowers: "소식 받는 사람",
  statsTotal: (n: string) => `전체 ${n}`,
  statsNotLive: "공개 전이라 아직 반응이 모이지 않아요",
  statsSince: "조회와 클릭은 2026년 10월 27일부터 세요",
  statsDetail: "게임 보기",
  /** 통계 추이 판(2026-10-28) */
  statsTrend: "지난 30일 추이",
  statsLive: "공개 중",
  statsSpark: (title: string) => `${title} 지난 30일 조회 추이`,
  statsSparkNote: "30일 조회",
} as const;

/** 알림함 한 줄. 만들 때 다 적어 둔다 — 원본 글이 지워져도 알림함은 읽혀야 한다(schema-notifications 머리 주석) */
export const INDIE_NOTIFY_MESSAGES = {
  devlog: (developer: string, title: string) => `${developer} 님의 새 개발일지: ${title}`,
  released: (title: string) => `'${title}' 이(가) 출시됐어요`,
  comment: (title: string) => `'${title}' 에 새 댓글이 달렸어요`,
} as const;
