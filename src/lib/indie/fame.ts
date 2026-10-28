// 명예의 전당, 슈퍼루키 상수와 순수 도우미(기획서 v2.0 5.1 S-08, S-09, 7장). 점수 식은 2026-10-26 사용자가 확정한 제안이다.
//   슈퍼루키: (찜 x 3 + 댓글 x 2 + 조회 / 50) x (1 - 경과일 / 30), 승인 뒤 30일 미만, 상위 12
//   명예의 전당: 그 달의 찜 증가 x 3 + 그 달 댓글 x 2 + 그 달 조회 / 20, 그 달 찜 5개 이상만, TOP 10. 월말에 확정하고 이번 달은 실시간 잠정 순위
// 댓글 항목은 2026-10-27 인디 글 댓글이 생기며 되살렸다. 댓글은 "글쓴이가 아닌 서로 다른 사람 수" 로 센다 — 줄 수로 세면
// 개발자가 답글을 달수록, 한 사람이 댓글을 여러 번 달수록 점수가 오른다. 찜(한 사람 한 번, 3점)보다 가볍게 둔 이유: 댓글은 찜보다 쉽게 쌓인다.

export const ROOKIE_WINDOW_DAYS = 30;
export const ROOKIE_LIMIT = 12;
export const ROOKIE_LIKE_WEIGHT = 3;
export const ROOKIE_VIEWS_PER_POINT = 50;
export const ROOKIE_COMMENT_WEIGHT = 2;

export const HOF_TOP = 10;
export const HOF_LIKE_WEIGHT = 3;
export const HOF_VIEWS_PER_POINT = 20;
export const HOF_COMMENT_WEIGHT = 2;
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

/**
 * 지난달 대비 점수 변화(%). 지난달 점수가 없으면(0 이나 기록 없음) null — "새로 진입" 이다.
 * 반올림한 정수다. 점수는 찜과 조회를 섞은 수라 소수점까지 적어도 더 알려 주는 게 없다.
 */
export function scoreChangePct(now: number, prev: number | null | undefined): number | null {
  if (!prev || prev <= 0) return null;
  return Math.round(((now - prev) / prev) * 100);
}

/**
 * 순위 밖 개발자에게 힘을 주는 "내 게임 자리"(2026-10-28, 사용자: "3위 안에 못 들어도 힘나도록 유도"). 이번 달 잠정 순위만 본다.
 * 내 공개 게임 중 가장 높은 하나를 고른다. rank 가 있으면 TOP 10 안, gapUp 은 한 계단 위까지 모자란 점수.
 * rank 가 없으면 needLikes(순위 문턱 찜 수까지 남은 찜)와 gapUp(10위 점수를 넘는 데 모자란 점수, 10위가 비어 있으면 null)
 */
export type MyFameStanding = { title: string; slug: string; rank: number | null; score: number; monthLikes: number; gapUp: number | null; needLikes: number };

/** 순위표(점수 내림차순)와 내 게임들의 점수로 "내 자리" 를 고른다. 내 게임이 없으면 null */
export function pickMyStanding(
  ranking: ReadonlyArray<{ id: string; score: number }>,
  mine: ReadonlyArray<{ id: string; title: string; slug: string; score: number; likes: number }>,
): MyFameStanding | null {
  if (mine.length === 0) return null;
  const ranked = mine.flatMap((m) => {
    const i = ranking.findIndex((r) => r.id === m.id);
    return i >= 0 ? [{ m, i }] : [];
  });
  if (ranked.length > 0) {
    const { m, i } = ranked.reduce((a, b) => (b.i < a.i ? b : a));
    const score = ranking[i].score;
    return { title: m.title, slug: m.slug, rank: i + 1, score, monthLikes: m.likes, gapUp: i > 0 ? Math.max(ranking[i - 1].score - score + 1, 1) : null, needLikes: 0 };
  }
  const best = mine.reduce((a, b) => (b.score > a.score || (b.score === a.score && b.likes > a.likes) ? b : a));
  const last = ranking.length >= HOF_TOP ? ranking[HOF_TOP - 1] : null;
  return {
    title: best.title,
    slug: best.slug,
    rank: null,
    score: best.score,
    monthLikes: best.likes,
    gapUp: last ? Math.max(last.score - best.score + 1, 1) : null,
    needLikes: Math.max(HOF_MIN_LIKES - best.likes, 0),
  };
}

export function ymLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `${y}년 ${Number(m)}월`;
}

export const FAME_MESSAGES = {
  hofTitle: "명예의 전당",
  /** 머리 판의 작은 이름표(2026-10-27) */
  hofEyebrow: "매달 뽑는 인디 게임",
  hofLead: "개발자가 손전등에 등록한 인디 게임 중 반응이 좋은 작품을 매달 소개해요.",
  tabMonth: "이번 달 주목작",
  tabHistory: "역대 선정작",
  monthPick: "월 선택",
  provisional: "잠정",
  empty: "아직 이 달에 순위에 든 게임이 없어요",
  emptyLead: "찜이 5개 이상 모인 게임부터 순위에 올라요.",
  historyEmpty: "아직 확정된 달이 없어요",
  historyLead: "달이 끝나면 그 달 1위가 여기에 쌓여요.",
  /** 역대 선정작에서 달을 눌렀을 때의 머리(목업 hofPage "X월 주목작 순위 TOP 10") */
  top10: (label: string) => `${label} 주목작 순위 TOP 10`,
  backToHistory: "역대 선정작으로",
  top10Footnote: "그 달의 찜, 조회, 유효 댓글을 기준으로 한 순위예요.",
  score: (n: number) => `${n.toLocaleString("ko-KR")}점`,
  rookieTitle: "슈퍼루키",
  rookieLead: "등록된 지 한 달이 안 된 인디 신작 중 반응이 좋은 게임이에요.",
  rookieEmpty: "아직 슈퍼루키가 없어요",
  rookieEmptyLead: "내 게임을 등록하고 승인을 받으면 한 달 동안 후보가 돼요.",
  rookieCta: "내 게임 등록",
  rookieFootnote: "등록된 지 한 달이 안 된 게임 중 찜과 조회 반응을 바탕으로 골라요.",
  daysAgo: (n: number) => (n <= 0 ? "오늘 등록" : `${n}일 전 등록`),
  likes: (n: number) => `찜 ${n.toLocaleString("ko-KR")}`,
  views: (n: number) => `조회 ${n.toLocaleString("ko-KR")}`,
  byDev: (name: string) => `개발자 ${name}`,
  rank: (n: number) => `${n}위`,
  /** 지난달 대비 점수 변화(목업 hrow 의 순위 아래 한 줄). 화살표 글자 대신 부호로 방향을 말한다(AGENTS 4장) */
  change: (pct: number) => (pct > 0 ? `+${pct}%` : `${pct}%`),
  changeFromLast: (pct: number) => `지난달 대비 ${pct > 0 ? `+${pct}` : pct}%`,
  newEntry: "새로 진입",
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
  /** 2026-10-28 사용자 지정 문구를 "-해요" 체로. "유효 댓글" 은 글쓴이가 아닌 서로 다른 사람의 공개 댓글이다(머리 주석) */
  monthFootnote: "월간 순위는 그 달의 찜, 조회, 유효 댓글을 기준으로 정해요. 달이 끝나면 순위가 확정돼요.",
  hofHeadLead: "매달 플레이어 반응이 가장 뜨거웠던 인디 게임을 소개해요.",
  monthPrev: "이전 달",
  monthNext: "다음 달",
  backToNow: "이번 달로",
  nowTag: "이번 달",
  /** 4~10위 줄의 한 계단 위까지 점수 — 순위 밖 게임에 "조금만 더" 를 보여 준다 */
  gapToAbove: (rank: number, gap: number) => `${rank}위까지 ${gap.toLocaleString("ko-KR")}점`,
  topRiser: "이번 달 가장 많이 올랐어요",
  /** 내 게임 자리 카드(components/indie/my-fame-standing) */
  myHead: "내 게임은 지금",
  myRankFirst: (title: string) => `${title}, 지금 1위예요. 자리를 지켜 보세요`,
  myRanked: (title: string, rank: number) => `${title}, 지금 ${rank}위예요`,
  myGapUp: (rank: number, gap: number) => `${rank}위까지 ${gap.toLocaleString("ko-KR")}점 남았어요`,
  myUnranked: (title: string) => `${title}, 아직 순위 밖이에요`,
  myNeedLikes: (likes: number, need: number) => `이번 달 찜 ${likes.toLocaleString("ko-KR")}개. ${need.toLocaleString("ko-KR")}개를 더 받으면 순위에 올라요`,
  myGapTop: (gap: number) => `10위까지 ${gap.toLocaleString("ko-KR")}점 남았어요`,
  myOpen: "아직 10위 자리가 비어 있어요. 지금 오르기 좋아요",
  myHow: `찜 1개는 ${HOF_LIKE_WEIGHT}점, 댓글 남긴 사람 1명은 ${HOF_COMMENT_WEIGHT}점, 조회 ${HOF_VIEWS_PER_POINT}번은 1점이에요`,
  myWriteLog: "개발일지로 소식 알리기",
  historyFootnote: "달을 누르면 그 달의 TOP 10 순위표를 볼 수 있어요.",
  wish: "찜하기",
  wished: "찜했어요",
  wishAdded: "찜 목록에 담았어요",
  wishRemoved: "찜을 풀었어요",
} as const;
