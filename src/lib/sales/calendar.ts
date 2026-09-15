// 스팀 정기 세일 일정 — "지금 살까, 기다릴까" 에 답하는 축.
//
// 2026-09-15 정정: 예전 주석은 "밸브는 세일 날짜를 미리 공지하지 않는다" 고 적었는데 틀렸다.
// 밸브는 Steamworks 공지로 반기마다 세일, 페스트 일정을 미리 못박아 발표한다.
// 그래서 이 파일은 두 층으로 동작한다.
//
//   1) CONFIRMED — 밸브가 공지한 확정 회차. 있으면 무조건 이걸 쓴다.
//   2) start 규칙 — 공지가 아직 없는 해를 위한 근사. 어긋날 수 있다고 화면이 말해야 한다.
//
// 수집이 아니라 계산이므로 네트워크도 DB 도 쓰지 않는다.
// 공지가 새로 나오면 CONFIRMED 에 한 줄 추가하는 것으로 끝난다 — 규칙은 건드리지 않는다.
//
// 왜 규칙을 지우지 않는가: 공지는 반기 단위라 그 너머 해는 여전히 빈다.
// 확정이 덮어쓰므로 규칙이 낡아도 가까운 회차는 틀리지 않는다.

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
  /**
   * 밸브가 공지한 확정 회차. start 규칙보다 항상 우선한다.
   * startsAt 은 UTC ISO — 태평양 오전 10시를 옮긴 값이라 서머타임 달은 17시, 아닌 달은 18시다.
   */
  confirmed?: ConfirmedRun[];
};

/** 공지로 확정된 한 회차 */
export type ConfirmedRun = { startsAt: string; durationDays: number };

export const STEAM_SALES: SteamSale[] = [
  {
    key: "spring",
    name: "봄 세일",
    description: "3월 중순에 일주일 정도 해요. 다른 정기 세일보다 규모가 작아요.",
    // 확정 2024-03-14(둘째 목), 2025-03-13(둘째 목), 2026-03-19(셋째 목).
    // 2026 에 한 주 밀렸다. 규칙은 최근값(셋째 목)을 따르지만 요일이 안정적이지 않으니
    // 공지가 없는 해는 예상으로 표시된다.
    start: { month: 3, weekday: 4, nth: 3 },
    durationDays: 7,
    startHourUtc: 17,
    confirmed: [
      { startsAt: "2024-03-14T17:00:00Z", durationDays: 7 },
      { startsAt: "2025-03-13T17:00:00Z", durationDays: 7 },
      { startsAt: "2026-03-19T17:00:00Z", durationDays: 7 },
    ],
  },
  {
    key: "summer",
    name: "여름 세일",
    description: "6월 말에 2주간 해요. 겨울 세일과 함께 가장 규모가 큰 세일이에요.",
    // 확정 2026-06-25. 6월 마지막 목요일 규칙과 일치해 규칙을 그대로 둔다.
    start: { month: 6, weekday: 4, nth: -1 },
    durationDays: 14,
    startHourUtc: 17,
    confirmed: [{ startsAt: "2026-06-25T17:00:00Z", durationDays: 14 }],
  },
  {
    key: "autumn",
    // 2026-09-15 확인: 밸브가 2025년부터 이 세일을 11월 말에서 9월 말~10월 초로 옮겼다.
    // 그래서 더는 블랙 프라이데이 주간이 아니다 — 그 이름으로 부르지 않는다.
    name: "가을 세일",
    description: "10월 초에 일주일 정도 해요. 2025년부터 11월 말에서 앞당겨졌어요.",
    // 확정 2025-09-29(월), 2026-10-01(목). 두 회차의 요일이 달라 규칙을 못 세운다 —
    // "10월 첫째 목요일" 은 2026 한 회차에만 맞는 근사다. 공지가 나오면 confirmed 로 덮어쓴다.
    start: { month: 10, weekday: 4, nth: 1 },
    durationDays: 7,
    startHourUtc: 17,
    confirmed: [
      { startsAt: "2025-09-29T17:00:00Z", durationDays: 7 },
      { startsAt: "2026-10-01T17:00:00Z", durationDays: 7 },
    ],
  },
  {
    key: "halloween",
    name: "할로윈 세일",
    description: "10월 말에 일주일 정도 해요. 공포 게임과 할로윈 테마 게임을 중심으로 골라요.",
    // 밸브의 공식 명칭은 Steam Scream 이다. 화면에는 사람들이 쓰는 말로 적는다.
    // 확정 2025-10-27(월), 2026-10-26(월). 둘 다 10월 마지막 월요일이라 규칙과 맞는다.
    start: { month: 10, weekday: 1, nth: -1 },
    durationDays: 7,
    startHourUtc: 17,
    confirmed: [
      { startsAt: "2025-10-27T17:00:00Z", durationDays: 7 },
      { startsAt: "2026-10-26T17:00:00Z", durationDays: 7 },
    ],
  },
  {
    key: "winter",
    name: "겨울 세일",
    description: "12월 셋째 주부터 3주 가까이 해요. 연말 연휴를 끼고 있어 한 해 중 가장 규모가 커요.",
    // 확정 2025-12-18~2026-01-05, 2026-12-17~2027-01-04. 시작은 12월 셋째 목요일 규칙과 맞지만
    // 기간이 14일이 아니라 18일이다 — 예전 값은 연휴 구간을 3일 짧게 끊고 있었다.
    start: { month: 12, weekday: 4, nth: 3 },
    durationDays: 18,
    startHourUtc: 18,
    confirmed: [
      { startsAt: "2025-12-18T18:00:00Z", durationDays: 18 },
      { startsAt: "2026-12-17T18:00:00Z", durationDays: 18 },
    ],
  },
  {
    key: "lunar",
    name: "설 세일",
    // 지우지 않고 남기는 이유: 2023년까지 열렸고 그 뒤 소식이 없다. 되살아나면 사유만 지우면 된다.
    // 2026 상반기, 하반기 공지 어디에도 없는 것을 확인했다.
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

/** confirmed 에서 온 회차인지, 규칙으로 민 근사인지. 화면이 배지를 갈라 쓴다 */
export type OccurrenceSource = "confirmed" | "estimated";

export type Occurrence = { startsAt: Date; endsAt: Date; source: OccurrenceSource };

/**
 * 특정 연도의 회차. 겨울 세일처럼 해를 넘기는 세일도 종료일이 그대로 이어진다.
 * 그 해의 확정 공지가 있으면 규칙을 쓰지 않는다 — 규칙이 낡아도 확정이 있으면 틀리지 않는다.
 */
export function occurrenceIn(sale: SteamSale, year: number): Occurrence {
  const hit = sale.confirmed?.find((r) => new Date(r.startsAt).getUTCFullYear() === year);
  if (hit) {
    const startsAt = new Date(hit.startsAt);
    return {
      startsAt,
      endsAt: new Date(startsAt.getTime() + hit.durationDays * DAY_MS),
      source: "confirmed",
    };
  }
  const day = nthWeekdayOf(year, sale.start.month, sale.start.weekday, sale.start.nth);
  const startsAt = new Date(
    Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), sale.startHourUtc),
  );
  return {
    startsAt,
    endsAt: new Date(startsAt.getTime() + sale.durationDays * DAY_MS),
    source: "estimated",
  };
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
