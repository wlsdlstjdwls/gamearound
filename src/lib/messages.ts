// 화면 전체가 쓰는 안내 문구 — 오류, 빈 상태처럼 어느 화면에서나 뜰 수 있는 것들.
// 특정 화면에만 쓰이는 문구는 그 화면 옆(lib/auth, lib/games)에 둔다.
//
// 문구 원칙: 읽는 사람은 우리 서비스를 쓰러 온 사람이지 고치러 온 사람이 아니다.
// 원인(데이터베이스, 외부 API, 배포)을 화면에 적지 않는다 — 읽는 사람이 할 수 있는 일이 없고,
// 우리 인프라 구성을 그대로 알려주는 일이기도 하다. 원인은 서버 로그가 받는다.
export const ERROR_MESSAGES = {
  title: "잠시 문제가 생겼어요",
  body: "잠깐 사이의 문제일 수 있어요. 다시 시도해 보고, 계속 그러면 조금 뒤에 다시 들러 주세요.",
  retry: "다시 시도",
  home: "홈으로",
  /**
   * 오류 번호는 남긴다. 문의가 왔을 때 서버 로그의 그 순간을 찾는 유일한 실마리다 —
   * 다만 "digest" 같은 내부 용어가 아니라 사람이 옮겨 적을 수 있는 말로 붙인다.
   */
  codeLabel: "오류 번호",
  codeHelp: "문의할 때 이 번호를 함께 알려주시면 빨리 찾을 수 있어요.",
} as const;

export const NOT_FOUND_MESSAGES = {
  code: "404",
  title: "페이지를 찾을 수 없어요",
  body: "주소가 잘못됐거나 목록에 없는 게임이에요. 제목으로 다시 검색해 보세요.",
  search: "게임 검색하기",
  games: "게임 목록",
  home: "홈으로",
} as const;

/** 인터넷 끊김 띠(components/offline-notice). 받아 둔 화면은 계속 볼 수 있다는 것을 같이 말한다 — 안 말하면 창을 닫는다 */
export const OFFLINE_MESSAGES = {
  offline: "인터넷 연결이 끊겼어요",
  offlineHint: "보던 화면은 그대로 볼 수 있어요. 다시 연결되면 이어서 돼요",
  back: "다시 연결됐어요",
} as const;

/** 스켈레톤(loading.tsx)이 낭독기에 알리는 말. 화면마다 따로 두지 않는다 — 기다리는 일은 어디서나 같다 */
export const LOADING_MESSAGES = {
  label: "불러오는 중이에요",
} as const;

/**
 * DB 가 아예 안 열릴 때(lib/db-errors 의 isDbUnavailable) 쓰는 말. 원인(한도, 장애)은 적지 않는다 —
 * 회원이 할 수 있는 일은 기다리는 것뿐이라 "잠시 뒤" 를 말한다.
 */
export const MAINTENANCE_MESSAGES = {
  write: "지금은 점검 중이라 저장할 수 없어요. 잠시 뒤에 다시 시도해 주세요.",
  auth: "지금은 점검 중이라 로그인과 가입을 잠시 쓸 수 없어요. 잠시 뒤에 다시 시도해 주세요.",
  readTitle: "지금 게임 정보를 불러오지 못하고 있어요",
  readBody: "잠깐 사이의 문제일 수 있어요. 조금 뒤에 다시 들러 주세요.",
  retry: "다시 시도",
  /** DB 없이 서는 화면(세일 일정은 달력 상수만 읽는다)으로 보내 기다리는 동안 갈 곳을 준다 */
  toSales: "세일 일정 보기",
  home: "홈으로",
} as const;

/** 액션이 원인을 말할 수 없을 때의 기본 실패 문구 */
export const ACTION_MESSAGES = {
  failed: "처리하지 못했어요. 잠시 뒤에 다시 시도해 주세요.",
} as const;

/**
 * 새 버전 안내(components/app-shell/update-notice). 배포 뒤 열려 있던 탭에만 뜬다.
 * "업데이트" 같은 앱 낱말 대신 사용자가 할 일(새로고침)을 말한다 — 웹은 설치할 것이 없다
 */
export const UPDATE_MESSAGES = {
  title: "새 버전이 나왔어요",
  body: "새로고침하면 최신 화면으로 바뀌어요",
  reload: "새로고침",
  later: "나중에",
} as const;

/**
 * 홈 화면에 추가 띠(components/app-shell/install-banner). 설치할 이유를 한 줄로 말한다 —
 * iOS 는 홈 화면에서 연 창에서만 웹푸시를 받는다(lib/push/messages iosHint), 그게 곧 이 띠의 쓸모다
 */
export const INSTALL_MESSAGES = {
  region: "손전등 앱 안내",
  title: "홈 화면에 손전등 추가",
  // 360폭에서 띠 글자 칸이 열네 글자 남짓이다 — 길면 말끝이 잘린다
  body: "할인 알림을 앱처럼 받아요",
  add: "추가",
  close: "안내 닫기",
  /** iOS 사파리는 설치 창을 띄울 길이 없다 — 손으로 하는 두 걸음을 띠 안에 펼친다 */
  iosSteps: ["아래 공유 단추를 눌러요", "\"홈 화면에 추가\" 를 골라요"],
} as const;
