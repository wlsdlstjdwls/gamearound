// 인디 홍보 축의 사용자 문구 한 곳 — AGENTS §2. 문체는 "-해요"(AGENTS §6).
import type { IndieStage } from "@/server/db/schema";
import { storeLinkPlatform, type IndieGenre, type IndieLinkKind, type IndiePlatform } from "./constants";
import type { IndieSearchScope } from "./query";

/**
 * 개발 단계를 고를 때 한 줄 설명(2026-10-28, 사용자: "데모 공개랑 앞서 해보기 차이는?"). 코드가 두 단계를 다르게 다루는 곳은 없다 —
 * 거르기와 배지 글자만 다르다. 그래서 고르는 사람이 헷갈리지 않게 업계에서 쓰는 뜻을 적는다: 데모는 일부를 무료로 맛보는 판,
 * 앞서 해보기는 완성 전 본편을 먼저 사서 하는 판(스팀 Early Access).
 */
export const INDIE_STAGE_HINT: Record<IndieStage, string> = {
  in_development: "아직 해 볼 수 있는 판이 없어요",
  demo: "일부를 무료로 먼저 해 볼 수 있어요",
  early_access: "완성 전 본편을 먼저 살 수 있어요",
  released: "정식으로 나왔어요",
};

export const INDIE_STAGE_LABEL: Record<IndieStage, string> = {
  in_development: "개발 중",
  demo: "데모 공개",
  early_access: "앞서 해보기",
  released: "출시",
};

/** 목록 검색 범위(목업 bsbar). 작성자 자리를 개발사로 부르는 이유는 lib/indie/query 의 INDIE_SEARCH_SCOPES 주석 */
export const INDIE_SEARCH_SCOPE_LABEL: Record<IndieSearchScope, string> = { all: "전체", title: "제목", body: "내용", developer: "개발사" };

export const INDIE_PLATFORM_LABEL: Record<IndiePlatform, string> = {
  pc: "PC",
  playstation: "PlayStation",
  xbox: "Xbox",
  switch: "Switch",
  mobile: "모바일",
  web: "웹",
};

export const INDIE_GENRE_LABEL: Record<IndieGenre, string> = {
  action: "액션",
  rpg: "RPG",
  adventure: "어드벤처",
  puzzle: "퍼즐",
  simulation: "시뮬레이션",
  platformer: "플랫포머",
  card: "카드",
  racing: "레이싱",
  other: "기타",
};

/** 저장된 장르 키를 이름으로. 목록에서 빠진 옛 키는 버린다 */
export function genreLabels(genres: readonly string[]): string[] {
  return genres.flatMap((g) => (g in INDIE_GENRE_LABEL ? [INDIE_GENRE_LABEL[g as IndieGenre]] : []));
}

export const INDIE_LINK_LABEL: Record<IndieLinkKind, string> = {
  store: "스토어",
  demo: "데모 받기",
  site: "공식 사이트",
  community: "커뮤니티",
  funding: "펀딩",
};

/** 링크 종류의 이름. 플랫폼별 스토어 링크("store:pc")는 "PC 스토어" 로 읽는다(lib/indie/constants 의 storeLinkKind) */
export function linkLabel(kind: string): string {
  const platform = storeLinkPlatform(kind);
  if (platform) return `${INDIE_PLATFORM_LABEL[platform]} 스토어`;
  return INDIE_LINK_LABEL[kind as IndieLinkKind] ?? kind;
}

/** 공개 화면(목록, 상세, 홈 줄, 게임 상세 마디) */
export const INDIE_MESSAGES = {
  /** 2026-10-07 "인디" 에서 늘렸다 — 낱말 하나로는 장르 필터처럼 읽혀 화면 이름(title)과 같은 말로 맞췄다 */
  navLabel: "인디 게임",
  title: "인디 게임",
  /** /indie 화면 머리(기획서 S-18). 메뉴의 "내가 만든 게임" 과 같은 말이다 */
  listTitle: "내가 만든 게임",
  lead: "인디 개발자가 직접 등록한 개성 있는 게임을 둘러보세요.",
  hofBannerTitle: "명예의 전당에 올라보세요",
  hofBannerLead: "찜, 조회, 댓글이 많이 모인 게임을 매달 뽑아 소개해요. 순위 밖이어도 내 게임 자리를 바로 볼 수 있어요.",
  hofBannerCta: "명예의 전당 보기",
  register: "내 게임 등록",
  searchLabel: "내가 만든 게임 검색",
  searchScopeLabel: "검색 범위",
  searchPlaceholder: "게임 이름, 소개 검색",
  search: "검색",
  searchReset: "검색 초기화",
  /** scope: 전체가 아닐 때만 범위 이름을 앞에 붙인다(게시판 검색 줄과 같은 모양) */
  searchResult: (q: string, n: number, scope?: string) => `${scope ? `${scope}: ` : ""}"${q}" 검색 결과 ${n.toLocaleString("ko-KR")}개`,
  emptySearch: "검색 결과가 없어요",
  emptySearchLead: "다른 검색어로 다시 찾아보세요.",
  likesLabel: "찜",
  genres: "장르",
  buyTitle: "플랫폼별 구매하러 가기",
  buyCta: "구매하러 가기",
  storeOf: (platform: string) => `${platform} 스토어`,
  countSuffix: "개",
  cta: "내 게임 소개하기",
  mine: "내가 쓴 글",
  allStages: "전체",
  stageFilterLabel: "개발 단계로 거르기",
  empty: "아직 올라온 게임이 없어요",
  emptyStage: "이 단계의 게임이 아직 없어요",
  emptyDescription: "직접 만든 게임이 있다면 첫 번째로 소개해 보세요.",
  homeTitle: "인디 게임",
  seeAll: "전체 보기",
  back: "내가 만든 게임 목록으로",
  by: "만든 사람",
  platforms: "플랫폼",
  release: "출시",
  links: "바로 가기",
  newWindow: "(새 창에서 열림)",
  trailer: "영상",
  screenshots: "스크린샷",
  about: "소개",
  catalogLink: "가격 비교 보기",
  /** 게임 상세에 붙는 마디 */
  gameSectionTitle: "개발자가 직접 소개해요",
  gameSectionMore: "소개 글 전체 보기",
  /** 게임 상세의 인디 추천 한 칸(광고 자리 겸) */
  suggestTitle: "이런 인디 게임은 어때요",
  coverAlt: (title: string) => `${title} 대표 그림`,
  shotAlt: (title: string, n: number) => `${title} 스크린샷 ${n}`,
  rail: { prev: "이전 게임", next: "다음 게임" },
  edit: "고치기",
  hiddenNotice: "이 글은 지금 숨겨져 있어서 나만 볼 수 있어요.",
  noCoverShort: "대표 그림을 올려야 목록에 보여요",
  hiddenShort: "숨겨져 있어 나만 볼 수 있어요",
  noCoverNotice: "대표 그림이 없어서 목록과 홈에는 아직 안 보여요. 고치기 화면에서 그림을 올려 주세요.",
  notFound: "글을 찾을 수 없어요",
  /** 목록 머리 판 */
  heroLabel: "인디 쇼케이스",
  heroTitle: "개발자가 직접 소개하는 게임",
  heroLead: "스토어에서 지나치기 쉬운 작은 게임을, 만든 사람이 직접 들고 왔어요. 만들고 있는 게임도 먼저 만나 보세요.",
  heroPoints: ["올리면 바로 공개돼요", "소개는 무료예요", "스토어에 있는 게임이면 가격 비교 화면에도 붙어요"],
  featuredLabel: "새로 올라왔어요",
  ctaTileTitle: "내 게임도 소개해 보세요",
  ctaTileBody: "만들고 있는 게임도 괜찮아요. 대표 그림 한 장이면 목록에 올라가요.",
  /** 상세의 관련 소식(기획서 S-19) — 그 게임을 올린 개발자의 라운지 글(services/indie/lounge 머리 주석) */
  relatedTitle: "관련 소식",
  relatedLead: "개발자가 라운지에 올린 개발일지와 질문이에요.",
  relatedEmpty: "아직 개발자가 올린 소식이 없어요",
  relatedEmptyOwner: "개발일지로 만드는 과정을 나눠 보세요.",
  relatedWrite: "개발일지 쓰기",
  /** 상세 오른쪽 카드 */
  infoTitle: "게임 정보",
  stage: "개발 단계",
  posted: "올린 날",
} as const;

/** 쓰기, 고치기 폼과 검증 */
export const INDIE_FORM_MESSAGES = {
  /** 폼 단계 넷(components/indie/form-step) */
  stepBasic: "기본 정보",
  stepBasicHint: "이름과 만든 사람, 한 줄 소개, 지금 개발 단계예요",
  stepKind: "플랫폼과 장르",
  stepKindHint: "고른 플랫폼마다 스토어 링크 칸이 생겨요",
  stepIntro: "소개와 그림",
  stepIntroHint: "첫 번째 그림이 카드에 서는 대표 그림이에요",
  stepLinks: "링크",
  stepLinksHint: "데모, 공식 사이트처럼 더 볼 곳이 있으면 적어 주세요. 비워 둬도 돼요",
  newTitle: "내 게임 등록",
  newLead: "내가 만든 게임을 직접 올려 보세요.",
  approvalNotice: "등록한 게임은 운영진의 승인 후 최종 등록돼요. 승인 전에는 승인 대기로 표시되고, 승인되면 내가 만든 게임 게시판에 정식으로 올라가요.",
  mineAside: "내가 올린 게임",
  mineAsideEmpty: "올린 게임이 없어요",
  mineAsideEmptyLead: "등록하면 이곳에서 내가 올린 게임을 볼 수 있어요.",
  mineAsideFlow: "등록 요청, 운영진 승인, 최종 등록 순서로 진행돼요. 올린 게임은 언제든 삭제할 수 있어요.",
  editTitle: "소개 글 고치기",
  mineTitle: "내가 쓴 소개 글",
  mineEmpty: "아직 쓴 글이 없어요",
  titleLabel: "게임 이름",
  taglineLabel: "한 줄 소개",
  taglineHint: "목록 카드에 이름 아래로 서는 문장이에요.",
  developerLabel: "개발자 또는 팀 이름",
  stageLabel: "개발 단계",
  platformsLabel: "플랫폼",
  releaseNoteLabel: "출시 시기",
  releaseNoteHint: "예: 2027년 상반기, 출시됨. 비워 둬도 돼요.",
  bodyLabel: "소개",
  bodyHint: "어떤 게임인지, 무엇이 재미있는지, 지금 어디까지 만들었는지 적어 주세요. 줄바꿈은 그대로 보여요.",
  youtubeLabel: "유튜브 영상 주소",
  youtubeHint: "트레일러나 플레이 영상 하나를 상세 화면에 띄워요.",
  linksLabel: "그 밖의 링크",
  linksHint: "데모, 공식 사이트, 디스코드 같은 주소를 최대 다섯 개까지 적어요.",
  genresLabel: "장르",
  genresHint: "여러 개 고를 수 있어요.",
  storeLinksLabel: "플랫폼별 스토어 링크",
  storeLinksHint: "출시 플랫폼을 고르면 플랫폼마다 스토어 링크 칸이 생겨요. 아직 스토어 페이지가 없으면 비워 둬도 돼요.",
  storeLinkLabel: (platform: string) => `${platform} 스토어 링크`,
  linkKindLabel: (n: number) => `링크 ${n} 종류`,
  linkUrlLabel: (n: number) => `링크 ${n} 주소`,
  linkAdd: "링크 하나 더 적기",
  gameLabel: "우리 카탈로그에 이미 있는 게임인가요?",
  gameHint: "이으면 게임 상세 화면에 이 글이 붙어요. 관리자가 개발자 본인인지 확인한 뒤에 보여요.",
  gameSearchLabel: "게임 이름으로 찾기",
  gameSearch: "찾기",
  gameNone: "찾는 게임이 없어요",
  gamePicked: "이은 게임",
  gameClear: "잇지 않기",
  gamePending: "관리자 확인을 기다리고 있어요",
  gameVerified: "확인됨",
  submitNew: "게임 등록",
  submitEdit: "고친 내용 저장",
  saving: "저장하는 중",
  created: "등록을 신청했어요. 운영진이 확인하고 승인해요.",
  /** 새 글 폼에서 고른 그림을 저장 뒤 이어서 올리는 동안 */
  imagesSending: (done: number, total: number) => `그림 올리는 중 ${done}/${total}`,
  saved: "저장했어요.",
  delete: "글 지우기",
  deleteConfirm: "지우면 되돌릴 수 없어요. 올린 그림과 찜, 댓글도 함께 지워져요.",
  deleteTitle: (title: string) => `${title}을(를) 삭제할까요?`,
  deleteYes: "지우기",
  deleteNo: "그만두기",
  /** 등록 화면 "내가 올린 게임" 줄의 짧은 단추(목업 indreg 의 .rm) */
  deleteShort: "삭제",
  deleted: "게임을 삭제했어요.",
  imagesTitle: "그림",
  imagesLead: "첫 번째 그림이 대표 그림이에요. 가로로 긴 그림(16:9)이 카드에 가장 잘 맞아요.",
  imageAdd: "그림 올리기",
  /** 새 글 폼의 고르기 칸 — 저장할 때 같이 올라간다 */
  imagePick: "그림 고르기",
  imageUploading: (done: number, total: number) => `올리는 중 ${done}/${total}`,
  imageRemove: "그림 지우기",
  imageMakeCover: "대표로",
  imageCover: "대표",
  imageFull: (max: number) => `그림은 ${max}장까지 올릴 수 있어요.`,
  imageUnreadable: "그림을 읽지 못했어요. 다른 파일로 해 주세요.",
  imageFailed: "그림을 올리지 못했어요. 잠시 뒤 다시 해 주세요.",
  view: "공개 화면 보기",
  // 검증
  titleRequired: "게임 이름을 적어 주세요.",
  titleTooLong: (max: number) => `게임 이름은 ${max}자까지 적을 수 있어요.`,
  taglineRequired: "한 줄 소개를 적어 주세요.",
  taglineTooLong: (max: number) => `한 줄 소개는 ${max}자까지 적을 수 있어요.`,
  developerRequired: "개발자 또는 팀 이름을 적어 주세요.",
  developerTooLong: (max: number) => `이름은 ${max}자까지 적을 수 있어요.`,
  bodyTooShort: (min: number) => `소개를 ${min}자 이상 적어 주세요.`,
  bodyTooLong: (max: number) => `소개는 ${max}자까지 적을 수 있어요.`,
  releaseNoteTooLong: (max: number) => `출시 시기는 ${max}자까지 적을 수 있어요.`,
  platformsRequired: "플랫폼을 하나 이상 골라 주세요.",
  genresRequired: "장르를 하나 이상 골라 주세요.",
  youtubeInvalid: "유튜브 영상 주소를 확인해 주세요.",
  linkInvalid: "링크는 https 로 시작하는 주소만 받아요.",
  tooManyLinks: (max: number) => `링크는 ${max}개까지 적을 수 있어요.`,
  tooManyPosts: (max: number) => `소개 글은 한 사람이 ${max}개까지 올릴 수 있어요. 안 쓰는 글을 지우고 다시 해 주세요.`,
  rateLimited: "오늘은 글을 더 올릴 수 없어요. 내일 다시 해 주세요.",
  forbidden: "이 글을 고칠 권한이 없어요.",
  badRequest: "요청을 처리하지 못했어요. 다시 해 주세요.",
} as const;

/** 신고 */
export const INDIE_REPORT_MESSAGES = {
  open: "신고",
  title: "이 글 신고하기",
  lead: "신고가 여러 번 쌓이면 관리자가 보기 전에 먼저 내려가요.",
  reasons: ["다른 사람의 게임이에요", "광고나 도배예요", "불쾌하거나 위험한 내용이에요", "게임과 상관없는 글이에요"],
  reasonLabel: "신고 사유",
  submit: "신고하기",
  done: "신고했어요. 확인해 볼게요.",
  already: "이미 신고한 글이에요.",
  own: "내 글은 신고할 수 없어요.",
  signIn: "로그인하고 신고할 수 있어요.",
  failed: "신고를 보내지 못했어요. 다시 해 주세요.",
  autoHidden: "신고가 쌓여 자동으로 숨겼어요.",
} as const;

/** 관리자 화면(/admin/indie) */
export const INDIE_ADMIN_MESSAGES = {
  title: "인디 홍보 글",
  lead: "등록 신청, 신고가 들어온 글, 게임 연결 확인을 기다리는 글이에요. 승인해야 공개 화면에 서고, 숨기면 모두 빠져요.",
  tabReview: "승인 대기",
  tabReported: "신고",
  tabLinks: "게임 연결",
  tabHidden: "숨김",
  tabAll: "전체",
  empty: "처리할 글이 없어요",
  reports: (n: number) => `신고 ${n}건`,
  hide: "숨기기",
  restore: "되살리기",
  verifyLink: "연결 확인",
  rejectLink: "연결 끊기",
  hideReason: "숨기는 사유",
  hideReasonPlaceholder: "올린 사람에게 보여요",
  author: "올린 사람",
  linkedGame: "이은 게임",
  done: "처리했어요.",
  approve: "승인",
  reject: "반려",
  rejectReason: "반려 사유",
  rejectReasonPlaceholder: "반려 사유는 신청한 사람에게 보여요",
} as const;

/** 등록 승인 상태(기획서 v2.0 4.4: 승인 대기 주황, 등록 완료 라임, 화면에서는 브랜드색). 반려는 빨강 */
export const INDIE_REVIEW_LABEL = { pending: "승인 대기", approved: "등록 완료", rejected: "반려" } as const;
export const INDIE_REVIEW_TONE = { pending: "warn", approved: "acc", rejected: "danger" } as const;
export const INDIE_REVIEW_MESSAGES = {
  /** 등록 완료 줄의 성적 딱지(2026-10-28) */
  fameRank: (rank: number) => `명예의 전당 ${rank}위`,
  views: "조회",
  likes: "찜",
  pendingNotice: "운영진이 확인하고 있어요. 승인되면 내가 만든 게임, 명예의 전당, 슈퍼루키에 올라가요.",
  rejectedNotice: "등록이 반려됐어요. 사유를 보고 고쳐서 다시 신청해 주세요.",
  reason: "반려 사유",
  resubmit: "고쳐서 다시 신청",
  /** 반려 사유를 바닥 시트로 여는 단추(components/indie/rejection-sheet) */
  viewReason: "사유 보기",
  reasonMissing: "운영진이 사유를 남기지 않았어요. 문의해 주시면 알려 드릴게요.",
  title: "등록현황",
  lead: "내 게임 등록으로 신청한 게임의 승인 상태를 확인해요. 운영진 승인이 끝나야 내가 만든 게임 목록에 올라가요.",
  total: "전체 신청",
  appliedAt: "신청일",
  applied: "신청",
  pendingShort: "운영진이 확인하고 있어요",
  emptyLead: "내 게임 등록으로 첫 게임을 올려 보세요.",
  /** 줄마다 세우는 진행 단계 셋(components/indie/review-steps) */
  stepApplied: "등록 신청",
  stepReview: "운영진 확인",
  stepDone: "등록 완료",
  stepRejected: "반려",
  stepsLabel: "등록 진행 단계",
  stepLiveSr: "(진행 중)",
  stepDoneSr: "(끝남)",
  noTagline: "한 줄 소개가 아직 없어요",
  viewGame: "게임 보기",
  edit: "고치기",
} as const;
