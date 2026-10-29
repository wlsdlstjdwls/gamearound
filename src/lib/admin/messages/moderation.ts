// 운영 화면 문구 — 게시글 관리(/admin/posts), 관리자 첫 화면의 "지금 손볼 일", 인디 판정의 즉시 표시.
// screens.ts 가 300줄에 가까워 관심사(사람이 쓴 글을 다루는 자리)로 따로 뒀다(AGENTS §4).

export const POST_ADMIN_MESSAGES = {
  /** ADMIN_NAV.posts 와 같은 말이어야 한다(admin-screen-naming 규칙 1) */
  title: "게시글",
  lead: "게임 게시판과 개발자 라운지에 올라온 글과 댓글이에요. 숨기면 목록, 인기글, 홈 소식에서 바로 빠지고, 글쓴이만 제 글을 계속 봐요. 지우지 않으니 되살릴 수 있어요.",
  tabPosts: "전체 글",
  tabHidden: "숨긴 글",
  tabComments: "댓글",
  tabHiddenComments: "숨긴 댓글",
  searchLabel: "제목, 작성자, 이메일로 찾기",
  searchCommentLabel: "댓글 내용, 작성자, 이메일로 찾기",
  searchPlaceholder: "찾을 말",
  search: "찾기",
  limitNote: (n: number) => `최신 ${n}건까지 보여요. 오래된 글은 찾기로 봐요.`,
  empty: "보여 줄 글이 없어요.",
  emptyComments: "보여 줄 댓글이 없어요.",
  colPost: "글",
  colCategory: "갈래",
  colAuthor: "작성자",
  colWhen: "올린 때",
  colReaction: "반응",
  colAction: "처리",
  colComment: "댓글",
  colOnPost: "달린 글",
  reaction: (views: number, likes: number, comments: number) => `조회 ${views} | 좋아요 ${likes} | 댓글 ${comments}`,
  postHidden: "숨긴 글",
  hide: "숨기기",
  restore: "되살리기",
  hidden: "숨겼어요",
  restored: "되살렸어요",
  hideConfirm: "이 글을 숨길까요? 목록과 홈에서 바로 빠져요.",
  failed: "처리하지 못했어요. 다시 눌러 주세요.",
} as const;

/** 인디 판정 버튼을 누른 순간 줄에 먼저 서는 말. 서버 응답을 기다리지 않는다(AGENTS §6) */
export const INDIE_DECISION_DONE = {
  approve: "승인했어요",
  reject: "반려했어요",
  hide: "숨겼어요",
  restore: "되살렸어요",
  verify_link: "연결을 확인했어요",
  reject_link: "연결을 끊었어요",
} as const;
