// 인디 홍보 축의 수치와 고정 목록 한 곳 — AGENTS §2. 화면, 검증, 서비스가 같은 값을 본다.

/** 개발 단계 순서. 거르기 칩과 폼 라디오가 이 순서로 선다 — 아직 먼 것부터 나온 것 순 */
export const INDIE_STAGES = ["in_development", "demo", "early_access", "released"] as const;

/**
 * 플랫폼 키. games 의 platformEnum 을 안 쓰는 이유: 저쪽은 우리가 수집하는 스토어 축이라
 * 모바일, 웹이 없다. 인디 게임은 그 둘에서 나오는 일이 흔하다.
 */
export const INDIE_PLATFORMS = ["pc", "playstation", "xbox", "switch", "mobile", "web"] as const;
export type IndiePlatform = (typeof INDIE_PLATFORMS)[number];

/** 바깥 링크 종류. 스토어 하나로 묶은 이유: 스팀, itch.io, 구글 플레이를 칸마다 나누면 빈칸만 는다 */
export const INDIE_LINK_KINDS = ["store", "demo", "site", "community", "funding"] as const;
export type IndieLinkKind = (typeof INDIE_LINK_KINDS)[number];

/** 글자 수 상한. 카드 한 줄 소개는 좁은 화면에서 두 줄 안에 끝나야 한다 */
export const INDIE_TITLE_MAX = 60;
export const INDIE_TAGLINE_MAX = 80;
/** 본문. 스팀 상점 "이 게임에 대하여" 짧은 판이 1,500자 안팎이다 — 그 두 배면 하고 싶은 말은 다 들어간다 */
export const INDIE_BODY_MIN = 20;
export const INDIE_BODY_MAX = 3000;
export const INDIE_DEVELOPER_MAX = 40;
export const INDIE_RELEASE_NOTE_MAX = 30;
export const INDIE_LINK_MAX = 5;
export const INDIE_URL_MAX = 300;
export const INDIE_REPORT_REASON_MAX = 300;
export const INDIE_HIDE_REASON_MAX = 300;

/**
 * 한 사람이 동시에 살려 둘 수 있는 글 수. 승인 없이 바로 서는 대신 거는 첫 번째 상한이다.
 * 혼자 만드는 사람은 한두 개, 작은 팀도 대여섯이면 충분하다 — 그 이상은 광고 계정의 모양이다.
 */
export const INDIE_POSTS_PER_USER_MAX = 5;

/**
 * 새 글을 하루에 쓸 수 있는 수(레이트리밋). 상한(위)은 지우고 다시 쓰면 우회되니 시간으로 한 번 더 막는다.
 */
export const INDIE_CREATE_RATE = { limit: 3, windowSec: 86_400 } as const;

/**
 * 이만큼의 서로 다른 사람이 신고하면 관리자를 기다리지 않고 내려간다.
 * 하나면 경쟁작 한 사람이 남의 글을 내릴 수 있고, 다섯이면 가입자가 적은 지금은 영영 안 닿는다.
 */
export const INDIE_REPORT_HIDE_THRESHOLD = 3;

/**
 * 글 하나에 붙는 그림 수. 첫 장이 커버이고 나머지가 스크린샷이다.
 * 스팀 상점은 스크린샷 다섯 장 이상을 권한다 — 커버 하나 더해 여섯.
 */
export const INDIE_IMAGE_MAX = 6;

/** 공개 목록 한 쪽 */
export const INDIE_PAGE_SIZE = 24;

/** 홈 줄에 세우는 수. 이보다 적으면 줄을 안 세운다(INDIE_HOME_MIN) */
export const INDIE_HOME_LIMIT = 12;
/**
 * 홈 줄을 세우는 최소 수. 카드 한두 장짜리 줄은 넓은 화면에서 빈 줄처럼 보인다 —
 * 줄 하나가 홈 첫 화면 높이를 먹는데 거기 두 장이면 "아무도 안 쓰는 곳" 으로 읽힌다.
 */
export const INDIE_HOME_MIN = 4;

/** 슬러그 꼬리 길이. 같은 제목 두 글이 부딪히지 않게 붙이는 무작위 글자 수 */
export const INDIE_SLUG_SUFFIX_LENGTH = 6;
