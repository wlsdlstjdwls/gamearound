// 관리자 화면 문구. 메뉴 낱말, 화면 제목, 표 머리, 빈 상태를 여기서만 정한다.
//
// 관리자 화면은 그동안 "-습니다"체와 영문 원값(ok, steam)을 그대로 썼다. 공개 화면 규약(-해요체)과
// 어긋나기도 했지만, 진짜 문제는 **화면 이름이 하는 일을 말해 주지 않았다**는 것이다.
// "대시보드", "판", "회사" 로는 눌러 보기 전에는 그 자리에서 무엇을 하는지 알 수 없었다.
// 그래서 이름을 전부 "명사 + 하는 일"로 바꾸고, 각 화면 첫 줄에 그 자리의 일을 한 문장으로 적는다.

/**
 * 관리자 메뉴 낱말. 메뉴와 각 화면 제목이 **같은 말**이어야 한다 —
 * 메뉴에서 "매칭 대기" 를 누르고 들어간 화면 제목이 "매칭 검수 큐" 면 같은 곳인지 의심하게 된다.
 */
export const ADMIN_NAV = {
  /** 기둥 머리. 이 영역이 손님 화면이 아니라는 것을 한 번만 말한다 */
  consoleTitle: "관리자",
  backToSite: "서비스 화면으로",
  groupSync: "수집",
  groupReview: "검수",
  /** 매장, 할 일. 하나짜리 묶음 둘을 합쳤다 — 기둥에서는 묶음마다 제목 한 줄이 그대로 높이가 된다 */
  groupEtc: "그 밖",
  overview: "수집 현황",
  logs: "실행 로그",
  matches: "매칭 대기",
  companies: "회사 이름",
  products: "상품 매핑",
  shops: "입점 신청",
  /** 앞 이름은 "작업 판" 이었다 — "판" 이 무엇인지 눌러 보기 전에는 알 수 없다는 말을 들었다 */
  tasks: "할 일",
  /** 배지가 뜻하는 바. 숫자만 있으면 남은 일인지 처리한 일인지 모른다 */
  badgeSuffix: "건 남음",
  /** 할 일 칸의 둘째 배지(하는 중 칸 건수). 첫 배지(할 일 칸)와 뜻이 달라 낭독 꼬리도 다르다 */
  badgeDoingSuffix: "건 하는 중",
  /** 좁은 화면 바닥 띠의 마지막 칸. 띠에 못 세운 칸과 서비스 화면으로 가는 길이 여기 들어간다 */
  more: "더보기",
  menuTitle: "관리자 메뉴",
} as const;

/**
 * 아직 열지 않은 관리자 화면. 메뉴에서 누르면 화면으로 가지 않고 사유를 말한다.
 *
 * 화면과 자료는 그대로 있다(주소로는 열린다) — 막는 건 메뉴 한 줄뿐이다.
 * 되살릴 때는 admin-nav 의 GROUPS 에서 soon 표시만 떼면 된다.
 */
export const ADMIN_SOON = {
  products: {
    lead: "상품 매핑은 아직 열지 않았어요",
    body: "매장이 올린 물건을 우리 카탈로그와 맞대는 자리예요. 매장 입점을 아직 열지 않아서 판정할 물건이 쌓이지 않았어요. 입점이 열리면 이 메뉴도 같이 열려요.",
  },
  shops: {
    lead: "입점 심사는 아직 열지 않았어요",
    body: "매장 페이지와 판매 목록은 다 만들어 뒀고, 사업자 확인 절차를 준비하고 있어요. 신청이 들어오기 시작하면 여기서 심사해요.",
  },
} as const;

/**
 * 수집 소스 이름표. DB enum 값(steam, nintendo_jp)을 그대로 띄우면 밑줄과 소문자가 섞여
 * 스토어 이름으로 안 읽힌다. 공개 화면의 PLATFORM_LABEL 과 따로 두는 이유는 축이 다르기 때문이다 —
 * 저기는 "어느 기기로 파는가"(ps5, ps4 가 따로), 여기는 "어디서 긁어 오는가"(psstore 하나)다.
 */
export const SOURCE_LABEL: Record<string, string> = {
  steam: "Steam",
  psstore: "PlayStation 스토어",
  xbox: "Xbox 스토어",
  nintendo: "닌텐도 한국",
  nintendo_jp: "닌텐도 일본",
  epic: "Epic Games",
  gamepass: "Game Pass",
  hltb: "HowLongToBeat",
  opencritic: "OpenCritic",
  metacritic: "Metacritic",
  wikidata: "위키데이터 (회사)",
  wikidata_game: "위키데이터 (게임)",
  rss: "공지 RSS",
  manual: "손으로 넣음",
};

export function sourceLabel(source: string): string {
  return SOURCE_LABEL[source] ?? source;
}

/** 실행 결과. "partial" 이 성공인지 실패인지 영문으로는 판단이 안 선다 */
export const SYNC_STATUS_LABEL = {
  ok: "정상",
  partial: "일부 실패",
  failed: "실패",
} as const;

export const SYNC_MESSAGES = {
  title: "수집 현황",
  lead: "스토어마다 마지막 수집이 무엇을 만졌는지 봐요. 여기서는 읽기만 해요. 다시 돌리는 건 GitHub Actions 에서 해요.",
  rerun: "Actions 에서 다시 돌리기",
  rerunHint: "NEXT_PUBLIC_GITHUB_REPO 를 넣으면 다시 돌리기 링크가 떠요.",
  disabled: "쉬는 중",
  noRun: "돈 적 없음",
  neverRan: "아직 한 번도 안 돌았어요.",
  finishedAt: "끝난 때",
  running: "도는 중",
  /** 끝났다는 기록 없이 오래 남은 실행. "도는 중" 과 가른다 — 며칠째 안 끝난 실행은 정상이 아니다 */
  stalled: "끊김",
  processedFailed: "처리한 건 | 실패한 건",
  failedToday: "오늘 실패",
  discovery: "신규 찾기",
  discoverySummary: (pages: number, scanned: number, fresh: number) => `${pages}쪽에서 ${scanned}건 훑어 신규 ${fresh}건`,
  /** 이 소스가 방금 만진 게임. 숫자가 아니라 이름이라야 "엉뚱한 걸 긁고 있나" 가 갈린다 */
  recentTitles: "방금 만진 게임",
  errorSample: "에러 맛보기",
  sourceLogs: "이 스토어 로그 보기",
  allLogs: "실행 로그 전체 보기",

  /* 맨 위 요약 줄 — 소스별 배지가 전부 초록이어도 이 줄이 0이면 값이 안 들어오고 있다는 뜻이다 */
  last24h: "최근 24시간",
  totalNewGames: "새 게임",
  totalSnapshots: "가격 기록",
  totalRuns: "수집 실행",
  totalFailed: "오늘 실패",
} as const;

export const LOG_MESSAGES = {
  title: "실행 로그",
  lead: "수집이 언제 돌아 몇 건을 처리했는지 최근 기록이에요. 소스를 눌러 그 스토어만 볼 수 있어요.",
  recent: (n: number) => `최근 ${n}건`,
  all: "전체",
  empty: "아직 기록이 없어요.",
  colId: "번호",
  colSource: "소스",
  colStatus: "결과",
  colStarted: "시작한 때",
  colDuration: "걸린 시간",
  colProcessed: "처리",
  colFailed: "실패",
  colDiscovery: "신규 찾기",
  colError: "에러 맛보기",
  /** 발견이 멈춘 까닭. "예산 소진" 이 이어지면 포화 신호다(아는 것만 나오는 구간이 예산보다 길다) */
  stopWant: "목표 채움",
  stopBudget: "예산 다 씀",
  stopCatalogEnd: "카탈로그 끝",
  discoverySummary: (pages: number, scanned: number, fresh: number) =>
    `${pages}쪽에서 ${scanned}건 훑어 신규 ${fresh}건`,
} as const;

export const MATCH_MESSAGES = {
  title: "매칭 대기",
  lead:
    "왼쪽은 우리가 아는 게임, 오른쪽은 스토어가 준 상품이에요. 이름이 충분히 닮으면 수집이 이미 이었고, 애매한 것만 여기 서요. \"맞아요\" 를 누르면 그 게임 가격에 이 스토어가 붙고, \"아니에요\" 를 누르면 이 후보는 다시 올라오지 않아요.",
  note: (shown: number, total: number) =>
    total > shown ? `${total}건 중 ${shown}건 보는 중` : `${shown}건`,
  similarity: (lo: number, hi: number) => `닮은 정도 ${lo}~${hi}`,
  empty: "판정할 매칭이 없어요. 수집이 돌면 새 후보가 여기 쌓여요.",
  colOurTitle: "우리가 아는 제목",
  colStoreTitle: "스토어가 준 제목",
  colSource: "스토어",
  colExternal: "스토어 안 번호",
  colConfidence: "닮은 정도",
  colAction: "같은 것인가요",
  noStoreTitle: "안 남음",
  open: "스토어에서 열기",
} as const;

export const COMPANY_MESSAGES = {
  title: "회사 이름",
  lead:
    "수집이 만난 회사 이름 중 위키데이터에서 하나로 좁히지 못한 것들이에요. 후보가 없거나 둘 이상이라 배치가 판단을 미뤘어요. 사람이 보고 다시 조회해요.",
  pendingTitle: "확정 못 한 이름",
  limitHint: (n: number) => `한 번에 ${n}건까지 봐요`,
  empty: "확정할 이름이 없어요. 수집이 돌면 새 이름이 여기 쌓여요.",
  colName: "회사 이름",
  colGameCount: "이 이름을 쓰는 게임",
  colAction: "조회",
  knownTitle: "확정한 회사",
  knownCount: (n: number) => `${n}곳`,
  knownEmpty: "아직 확정한 회사가 없어요.",
  unknownCountry: "나라 모름",
  gameCount: (n: number) => `게임 ${n}개`,
} as const;

export const PRODUCT_MATCH_MESSAGES = {
  title: "상품 매핑",
  lead: (recheckDays: number) =>
    `매장이 올린 물건을 우리 카탈로그와 맞대 본 결과예요. "맞아요" 를 누르면 그 게임 상세의 "파는 곳" 에 바로 뜨고, "아니에요" 를 누르면 그 후보는 다시 올라오지 않아요. 아니라고 한 상품은 ${recheckDays}일 뒤 다음 후보로 다시 물어봐요.`,
  queueTitle: "후보가 남은 상품",
  similarity: (lo: number, hi: number) => `닮은 정도 ${lo}~${hi}`,
  count: (n: number) => `${n}건`,
  empty: "판정할 상품이 없어요.",
  colProduct: "매장이 올린 물건",
  colCandidate: "후보 게임",
  colConfidence: "닮은 정도",
  colShop: "올린 매장",
  colCheckedAt: "마지막으로 본 때",
  colAction: "같은 것인가요",
  noBarcode: "바코드 없음",
  viaSync: "연동으로 들어옴",
} as const;

/**
 * 게임 한 건을 손으로 고치는 화면. 칸 이름이 전부 "정정" 으로 시작해 무엇을 고치는 자리인지
 * 구분이 안 됐다. 고치는 **대상**을 이름으로 삼는다.
 */
export const GAME_ADMIN_MESSAGES = {
  title: "게임 고치기",
  breadcrumb: "관리자",
  here: "게임 고치기",
  openPublic: "공개 화면에서 보기",
  lead:
    "여기서 고친 값은 수집이 덮어쓰지 않아요. 스토어가 계속 틀린 값을 보내는 자리만 골라 고쳐요.",
  basics: "제목, 설명, 이미지",
  basicsFormTitle: "게임 공통 값",
  aliases: "검색에 쓸 다른 이름",
  upgrades: "세대 업그레이드",
  platforms: "기종별 값",
  platformsEmpty: "이어진 기종이 없어요.",
  platformFormTitle: (label: string) => `${label} 값`,
  refs: "이어진 스토어",
  refsEmpty: "이어진 스토어가 없어요.",
  colSource: "스토어",
  colExternalId: "스토어 안 번호",
  colUrl: "주소",
  colMatchedBy: "누가 이었나",
  colConfidence: "닮은 정도",
  colAction: "같은 것인가요",
  history: "고친 기록",
  historyCount: (n: number) => `최근 ${n}건`,
  historyEmpty: "아직 고친 적이 없어요.",
  colWhen: "고친 때",
  colTarget: "대상",
  colField: "칸",
  colBefore: "고치기 전",
  colAfter: "고친 뒤",
  colLocked: "수집 잠금",
  locked: "잠금",
  currentPrice: "지금 값",
  listPrice: "정가",
  lastSynced: "마지막 수집",
} as const;

/** 이 이음을 누가 만들었나. 원값(auto, manual)은 누가 눌러야 할 줄인지 알려 주지 않는다 */
export const MATCHED_BY_LABEL: Record<string, string> = {
  auto: "수집이 이음",
  manual: "사람이 이음",
  pending: "판정 대기",
  none: "안 이음",
};
