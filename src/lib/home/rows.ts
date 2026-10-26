// 홈 줄마다 칸 수와 문턱(2026-10-02 홈 재구성). 줄의 모양은 components/home/* 가, 질의는 services/games/home-rows 가 맡는다.

/**
 * 옆으로 넘기는 줄의 칸 수. 넓은 화면에서 네 장이 보이고 세 번 넘기면 끝난다.
 * 더 길게 두면 끝까지 넘기는 사람이 없다 — 끝에는 "전체 보기" 가 있다
 */
export const HOME_RAIL_LIMIT = 12;

/** 인기 순위 줄. 다섯씩 두 기둥으로 선다(넓은 화면) */
export const HOME_RANK_LIMIT = 10;

/**
 * "만 원 이하" 줄의 값 상한(원). 국내 게임 할인 글에서 가장 흔히 쓰는 문턱이다.
 * 실측(2026-10-02): 한국 할인 행 중 이 값 이하가 절반 가까이라 진열 조건을 걸어도 줄이 빈 적이 없다
 */
export const HOME_BUDGET_PRICE = 10000;

/** 홈 첫 두 줄(오늘의 할인, 출시 예정)의 카드 수 — 기획서 v2.0 S-01 과 목업이 넷이다. 넓은 화면 한 줄 */
export const HOME_TOP_LIMIT = 4;

/**
 * "오늘의 할인" 넷을 고르는 인기순 웅덩이 크기(lib/home/deals). 넷의 세 배 — 이보다 좁으면 할인율로 다시 세우는 뜻이 없고,
 * 넓히면 인기순으로 걸러 둔 묵은 게임이 할인율로 다시 올라온다(services/games/home 의 discountRowsQ 주석)
 */
export const HOME_DEAL_POOL = 12;

/** 장르 바로가기 칩 수. 두 줄 안에 서는 수다 — 나머지는 목록의 장르 드롭다운이 받는다 */
export const HOME_GENRE_LIMIT = 10;
