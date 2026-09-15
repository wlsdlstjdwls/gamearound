// 스팀 정기 세일 일정 — "지금 살까, 기다릴까" 에 답하는 축.
//
// 왜 상수표인가: 밸브는 세일 날짜를 미리 공지하지 않는다. 공식 피드도 없다.
// 대신 정기 세일은 해마다 같은 자리(몇 월 몇 번째 무슨 요일)에서 열려 왔다.
// 그래서 최근 회차를 근거로 반복 규칙을 세우고, 다음 회차를 계산한다.
// 수집이 아니라 계산이므로 네트워크도 DB 도 쓰지 않는다.
//
// **이 값은 전부 "예상" 이다.** 화면도 예상이라고 말해야 한다(messages).
// 아래 ANCHOR 주석의 날짜는 과거 회차 기록이고, 확정 공지가 뜨면 그 회차 기준으로 규칙을 고친다.

const DAY_MS = 86_400_000;

/** 0=일요일. Date 의 getUTCDay 와 같은 체계 */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** nth 는 1부터. -1 이면 그 달의 마지막 해당 요일 */
export type StartRule = { month: number; weekday: Weekday; nth: number };

export type SteamSale = {
  key: string;
  /** adapters/steam/parse-discount 의 라벨과 같은 문자열을 쓴다 — 같은 행사가 화면마다 다른 이름이면 안 된다 */
  name: string;
  /** 시기와 성격. 사용자가 "기다릴 값어치가 있나" 를 판단하는 근거 */
  description: string;
  start: StartRule;
  durationDays: number;
  /**
   * 세일은 태평양 시간 오전 10시에 열린다. 그 시각을 UTC 로 옮긴 값.
   * 서머타임 적용 달(3월~10월)은 17시, 아닌 달(11월~2월)은 18시다.
   * 한국은 UTC+9 라 실제로는 그 다음 날 새벽에 열린다 — 화면의 날짜가 하루 밀려 보이는 이유다.
   */
  startHourUtc: number;
  /** 더 이상 열리지 않는 세일은 지우지 않고 사유를 남긴다(adapters 의 getDisabledReason 과 같은 규칙) */
  inactiveReason?: string;
};

export const STEAM_SALES: SteamSale[] = [
  {
    key: "spring",
    name: "봄 세일",
    description: "3월 중순에 일주일 정도 해요. 다른 정기 세일보다 규모가 작아요.",
    // ANCHOR 2024-03-14(목), 2025-03-13(목). 둘 다 3월 둘째 목요일이다.
    start: { month: 3, weekday: 4, nth: 2 },
    durationDays: 7,
    startHourUtc: 17,
  },
  {
    key: "summer",
    name: "여름 세일",
    description: "6월 말에 2주간 해요. 겨울 세일과 함께 가장 규모가 큰 세일이에요.",
    // ANCHOR 2023-06-29, 2024-06-27, 2025-06-26. 셋 다 6월 마지막 목요일이고 14일간이었다.
    start: { month: 6, weekday: 4, nth: -1 },
    durationDays: 14,
    startHourUtc: 17,
  },
  {
    key: "halloween",
    name: "할로윈 세일",
    description: "10월 말에 일주일 정도 해요. 공포 게임과 할로윈 테마 게임을 중심으로 골라요.",
    // ANCHOR 2024-10-28(월), 2025-10-27(월). 최근 두 회차가 10월 마지막 월요일이다.
    // 2023-10-26 은 목요일이라 요일이 바뀐 적이 있다. 그래서 예상 폭을 넓게 말한다.
    start: { month: 10, weekday: 1, nth: -1 },
    durationDays: 7,
    startHourUtc: 17,
  },
  {
    key: "autumn",
    name: "가을 세일",
    description: "11월 말에 일주일 정도 해요. 블랙 프라이데이에 맞춰 열려요.",
    // ANCHOR 2023-11-21(화), 2024-11-27(수), 2025-11-25(화).
    // 요일이 흔들려서 "11월 넷째 화요일" 로 근사한다 — 하루 이틀 어긋날 수 있다.
    start: { month: 11, weekday: 2, nth: 4 },
    durationDays: 7,
    startHourUtc: 18,
  },
  {
    key: "winter",
    name: "겨울 세일",
    description: "12월 셋째 주부터 2주간 해요. 연말 연휴를 끼고 있어 한 해 중 가장 규모가 커요.",
    // ANCHOR 2023-12-21, 2024-12-19, 2025-12-18. 셋 다 12월 셋째 목요일이고 14일간이었다.
    start: { month: 12, weekday: 4, nth: 3 },
    durationDays: 14,
    startHourUtc: 18,
  },
  {
    key: "lunar",
    name: "설 세일",
    // 지우지 않고 남기는 이유: 2023년까지 열렸고 그 뒤 소식이 없다. 되살아나면 사유만 지우면 된다.
    description: "설 연휴에 맞춰 열던 세일이에요.",
    start: { month: 2, weekday: 4, nth: 1 },
    durationDays: 7,
    startHourUtc: 18,
    inactiveReason: "2024년부터 열리지 않고 있어요. 다시 열리면 일정을 올릴게요.",
  },
];

/**
 * 그 해 그 달의 n번째 해당 요일. nth 가 -1 이면 마지막.
 * UTC 로만 계산한다 — 서버와 브라우저의 지역 시간대가 달라도 같은 날짜가 나와야 한다.
 */
export function nthWeekdayOf(year: number, month: number, weekday: Weekday, nth: number): Date {
  if (nth < 0) {
    const last = new Date(Date.UTC(year, month, 0));
    const back = (last.getUTCDay() - weekday + 7) % 7;
    return new Date(Date.UTC(year, month - 1, last.getUTCDate() - back));
  }
  const first = new Date(Date.UTC(year, month - 1, 1));
  const forward = (weekday - first.getUTCDay() + 7) % 7;
  return new Date(Date.UTC(year, month - 1, 1 + forward + (nth - 1) * 7));
}

export type Occurrence = { startsAt: Date; endsAt: Date };

/** 특정 연도의 회차. 겨울 세일처럼 해를 넘기는 세일도 종료일이 그대로 이어진다 */
export function occurrenceIn(sale: SteamSale, year: number): Occurrence {
  const day = nthWeekdayOf(year, sale.start.month, sale.start.weekday, sale.start.nth);
  const startsAt = new Date(
    Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), sale.startHourUtc),
  );
  return { startsAt, endsAt: new Date(startsAt.getTime() + sale.durationDays * DAY_MS) };
}

export type SaleStatus = "running" | "upcoming";

export type UpcomingSale = Occurrence & {
  sale: SteamSale;
  status: SaleStatus;
  /** 진행 중이면 종료까지, 아니면 시작까지 남은 밀리초 */
  remainingMs: number;
};

/**
 * 지금 기준 다음 회차 목록. 가까운 순서로 정렬한다.
 *
 * 작년 회차까지 보는 이유: 겨울 세일은 12월에 시작해 1월에 끝난다.
 * 1월에 이 함수를 부르면 "올해 12월" 만 봐서는 지금 진행 중인 세일을 놓친다.
 */
export function upcomingSales(now: Date): UpcomingSale[] {
  const year = now.getUTCFullYear();
  const list: UpcomingSale[] = [];

  for (const sale of STEAM_SALES) {
    if (sale.inactiveReason) continue;
    for (const y of [year - 1, year, year + 1]) {
      const occ = occurrenceIn(sale, y);
      if (occ.endsAt.getTime() <= now.getTime()) continue;
      const running = occ.startsAt.getTime() <= now.getTime();
      list.push({
        ...occ,
        sale,
        status: running ? "running" : "upcoming",
        remainingMs: (running ? occ.endsAt.getTime() : occ.startsAt.getTime()) - now.getTime(),
      });
      break;
    }
  }

  return list.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/** 더 이상 열리지 않는 세일. 화면 아래에 사유와 함께 남긴다 */
export function inactiveSales(): SteamSale[] {
  return STEAM_SALES.filter((s) => Boolean(s.inactiveReason));
}

export type CountdownParts = { days: number; hours: number; minutes: number; seconds: number };

/** 남은 밀리초를 일, 시, 분, 초로. 음수는 0 으로 눕힌다(지난 시각을 음수로 세면 화면이 깨진다) */
export function countdownParts(ms: number): CountdownParts {
  const t = Math.max(ms, 0);
  return {
    days: Math.floor(t / DAY_MS),
    hours: Math.floor(t / 3_600_000) % 24,
    minutes: Math.floor(t / 60_000) % 60,
    seconds: Math.floor(t / 1_000) % 60,
  };
}
