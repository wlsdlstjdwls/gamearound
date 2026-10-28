// 개발자 라운지 홈 문구(기획서 v2.0 S-16, 목업 lgHome). "-해요" 체.
export const LOUNGE_MESSAGES = {
  /** 화면 머리 제목. 메뉴 이름(개발자 라운지)보다 한 낱말 길다 — 목업이 "누구의 라운지인가" 를 머리에서 말한다 */
  title: "인디 개발자 라운지",
  lead: "만드는 과정을 나누고, 막힌 부분은 함께 풀어 봐요.",
  manage: "내 게임 관리",
  write: "글 작성",
  statusLabel: "내 개발 현황",
  // 현황 띠의 칸(components/community/news-blocks 의 StatStrip). 이름은 칸 위, 수와 단위는 칸 아래에 따로 선다
  statApproved: "등록한 게임",
  statPendingLabel: "검토 중",
  // 무엇에 달린 댓글인지 이름이 말해야 한다(2026-10-28 사용자 "내가 단 댓글? 내 게임에 대한 댓글?"). 센 것은 내 라운지 글에 남이 단 7일 치다
  statReactionsLabel: "내 글에 달린 새 댓글(7일)",
  unitGame: "개",
  unitCase: "건",
  unitComment: "개",
  statDetail: "개발 현황 보기",
  guestLabel: "로그인하면 내 개발 현황을 볼 수 있어요",
  guestLead: "등록한 게임, 검토 상태, 내 글에 달린 반응을 한눈에 봐요.",
  myGames: "내 게임 최근 소식",
  statusLink: "등록현황",
  signInTitle: "로그인이 필요해요",
  signInLead: "내 게임의 상태와 반응을 볼 수 있어요.",
  signIn: "로그인",
  noGamesTitle: "아직 올린 게임이 없어요",
  noGames: "첫 게임을 등록해 보세요.",
  register: "내 게임 등록",
  registeredAt: (d: string) => `등록 ${d}`,
  approvedLine: "등록 완료",
  pendingLine: "검토 중 | 운영진 확인 중",
  rejectedLine: "반려 | 고쳐서 다시 신청해요",
  stats: (likes: number, views: number) => `찜 ${likes.toLocaleString("ko-KR")} | 조회 ${views.toLocaleString("ko-KR")}`,
  viewPage: "페이지 보기",
  check: "확인",
  guideTitle: "라운지에서 더 많은 기회를",
  guide: ["내 게임 등록으로 신청해요.", "운영진이 확인하고 승인해요.", "승인되면 전체 인디 게임, 명예의 전당, 슈퍼루키 후보가 돼요.", "개발일지와 질문으로 다른 개발자와 이야기해요."],
  /** 홈 오른쪽 칸 아래 링크(목업 lgHome "라운지 이용 가이드"). 여는 것은 게시판 보조 메뉴의 이용 안내와 같은 시트다(목업 bgd) */
  guideOpen: "라운지 이용 가이드",
} as const;

/**
 * 게시판 이용 안내 시트(목업 bgd 모달). 목업의 넷째 줄("샘플입니다")은 목업 안내라 뺐다.
 * 라운지 보조 메뉴 아래 단추와 라운지 홈의 이용 가이드 링크가 같은 시트를 연다
 */
export const BOARD_GUIDE_MESSAGES = {
  open: "게시판 이용 안내",
  title: "게시판 이용 안내",
  rules: ["서로를 존중하는 표현을 써 주세요.", "광고, 도배성 글은 운영진이 숨길 수 있어요.", "게임 스포일러가 있으면 제목에 표시해 주세요."],
  /** 라운지에서 열었을 때 덧붙이는 등록 흐름(홈 오른쪽 칸의 이용 가이드와 같은 말) */
  loungeHead: "내 게임을 올리려면",
  confirm: "확인",
} as const;
