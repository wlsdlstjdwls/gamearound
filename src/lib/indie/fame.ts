// 명예의 전당, 슈퍼루키 상수와 순수 도우미(기획서 v2.0 5.1 S-08, S-09, 7장). 점수 식은 2026-10-26 사용자가 확정한 제안이다.
//   슈퍼루키: (찜 x 3 + 조회 / 50) x (1 - 경과일 / 30), 승인 뒤 30일 미만, 상위 12
//   명예의 전당: 그 달의 찜 증가 x 3 + 그 달 조회 / 20, 그 달 찜 5개 이상만, TOP 10. 월말에 확정하고 이번 달은 실시간 잠정 순위
// 제안에 있던 댓글 항목은 아직 뺐다 — 인디 글에는 댓글이 없다(게시판 홍보 글과 이어지면 더한다).

export const ROOKIE_WINDOW_DAYS = 30;
export const ROOKIE_LIMIT = 12;
export const ROOKIE_LIKE_WEIGHT = 3;
export const ROOKIE_VIEWS_PER_POINT = 50;

export const HOF_TOP = 10;
export const HOF_LIKE_WEIGHT = 3;
export const HOF_VIEWS_PER_POINT = 20;
/** 그 달 찜이 이만큼은 있어야 순위에 선다 — 혼자 새로고침해 조회만 올린 글이 1위에 서지 않게 */
export const HOF_MIN_LIKES = 5;

/** 한국 달 열쇠 "2026-10". 달 경계는 한국 자정이다 */
export function kstYm(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit" }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  return `${y}-${m}`;
}

export function isYm(v: string | undefined | null): v is string {
  return Boolean(v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v));
}

/** 앞 달 열쇠 — 월초 확정(cron)이 지난달을 닫을 때 쓴다 */
export function prevYm(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

export function ymLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `${y}년 ${Number(m)}월`;
}

export const FAME_MESSAGES = {
  hofTitle: "명예의 전당",
  hofLead: "개발자가 손전등에 등록한 인디 게임 중 반응이 좋은 작품을 매달 소개해요.",
  tabMonth: "이번 달 주목작",
  tabHistory: "역대 선정작",
  monthPick: "월 선택",
  provisional: "잠정",
  empty: "아직 이 달에 순위에 든 게임이 없어요",
  emptyLead: "찜이 5개 이상 모인 게임부터 순위에 올라요.",
  historyEmpty: "아직 확정된 달이 없어요",
  historyLead: "달이 끝나면 그 달 1위가 여기에 쌓여요.",
  top10: (label: string) => `${label} TOP 10`,
  score: (n: number) => `${n.toLocaleString("ko-KR")}점`,
  rookieTitle: "슈퍼루키",
  rookieLead: "등록된 지 한 달이 안 된 인디 신작 중 반응이 좋은 게임이에요.",
  rookieEmpty: "아직 슈퍼루키가 없어요",
  rookieEmptyLead: "내 게임을 등록하고 승인을 받으면 한 달 동안 후보가 돼요.",
  rookieCta: "내 게임 등록",
  rookieFootnote: "등록된 지 한 달이 안 된 게임 중 찜과 조회 반응을 바탕으로 골라요. 한 달이 지나면 자동으로 빠져요.",
  daysAgo: (n: number) => (n <= 0 ? "오늘 등록" : `${n}일 전 등록`),
  likes: (n: number) => `찜 ${n.toLocaleString("ko-KR")}`,
  views: (n: number) => `조회 ${n.toLocaleString("ko-KR")}`,
  byDev: (name: string) => `개발자 ${name}`,
  rank: (n: number) => `${n}위`,
  thisMonth: (label: string) => `${label}(이번 달)`,
  firstThisMonth: "이번 달 1위",
  firstOf: (label: string) => `${label} 1위`,
  pickedBy: "플레이어 반응으로 선정",
  provisionalNote: "실시간 잠정 순위",
  seeGame: "게임 살펴보기",
  seePage: "게임 페이지 보기",
  restHead: "4~10위",
  monthFirst: "월간 1위",
  seeRanking: "순위표 보기",
  monthFootnote: "월간 순위는 그 달에 들어온 찜과 조회를 기준으로 뽑아요. 달이 끝나면 순위가 확정돼요.",
  historyFootnote: "달을 누르면 그 달의 TOP 10 순위표를 볼 수 있어요.",
  wish: "찜하기",
  wished: "찜했어요",
  wishAdded: "찜 목록에 담았어요",
  wishRemoved: "찜을 풀었어요",
} as const;
