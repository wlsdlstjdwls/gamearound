// 순수 유틸: 날짜, 시간 포맷과 플랫폼 라벨. 가격 표시는 통화 규칙이 붙어 lib/currency 가 맡는다.
// 시각은 항상 한국 시간(KST)으로 표시한다. 서버(Vercel)는 UTC 라 timeZone 을 명시하지 않으면 9시간 어긋난다.
import type { Region } from "@/server/db/schema";
export const DISPLAY_TIME_ZONE = "Asia/Seoul";

export function formatDiscount(pct: number | null | undefined): string {
  if (!pct || pct <= 0) return "";
  return `-${pct}%`;
}

/**
 * KST 기준 달력 조각. 숫자만 꺼내고 한국어 표기는 아래 함수들이 직접 붙인다.
 *
 * 왜 toLocaleString("ko-KR") 을 그대로 쓰지 않나(2026-09-15 실측): 같은 값이 서버와 브라우저에서
 * 다르게 찍혔다 — 서버(Node) "9월 15일 오전 02:00", 크롬 "9월 15일 AM 02:00". 런타임마다 ICU 판이
 * 달라서다. 같은 자리의 글자가 다르면 React 는 수분화에 실패하고 **그 트리를 클라이언트에서 통째로
 * 다시 그린다** — 목록과 상세가 뜬 직후 한 번 깜빡이던 원인이 이것이었다.
 * 숫자 조각(연, 월, 일, 시, 분)은 ICU 판이 달라도 같은 값이라 여기서만 Intl 을 쓴다.
 * 로캘을 en-US 로 두는 이유: 숫자만 꺼낼 것이라 한국어 표기 규칙이 끼어들 여지를 없앤다.
 */
const KST_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: DISPLAY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

type CalendarParts = { year: string; month: string; day: string; hour: string; minute: string };

function kstParts(date: Date): CalendarParts {
  const out: Record<string, string> = {};
  for (const part of KST_PARTS.formatToParts(date)) out[part.type] = part.value;
  return out as CalendarParts;
}

/** 앞의 0 을 뗀 값 — "09월" 이 아니라 "9월" 로 읽어야 한국어 표기가 된다 */
function trimZero(v: string): string {
  return String(Number(v));
}

/** 유효한 Date 로 바꾼다. 못 바꾸면 null — 화면에는 "-" 가 나간다 */
function toDate(d: Date | string | null | undefined): Date | null {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(d: Date | string | null | undefined): string {
  const date = toDate(d);
  if (!date) return "-";
  const { year, month, day } = kstParts(date);
  return `${year}. ${month}. ${day}.`;
}

/** 목록에 붙는 짧은 시각. 24시간제로 적는다 — 오전/오후 표기가 런타임마다 갈렸다(KST_PARTS 주석) */
export function formatDateTime(d: Date | string | null | undefined): string {
  const date = toDate(d);
  if (!date) return "-";
  const { year, month, day, hour, minute } = kstParts(date);
  return `${year.slice(-2)}. ${trimZero(month)}. ${trimZero(day)}. ${hour}:${minute}`;
}

/** 100시간 미만은 소수 첫째 자리까지, 그 이상은 정수+천단위 콤마 (HLTB 값은 5,000시간대까지 나온다) */
const HOURS_DECIMAL_MAX = 100;

export function formatHours(h: string | number | null | undefined): string {
  if (h === null || h === undefined || h === "") return "-";
  const n = typeof h === "string" ? Number(h) : h;
  if (!Number.isFinite(n)) return "-";
  const digits = Math.abs(n) < HOURS_DECIMAL_MAX ? 1 : 0;
  return `${n.toLocaleString("ko-KR", { maximumFractionDigits: digits })}시간`;
}

/**
 * 기준 지역(한국)이 아닌 가격에 붙이는 꼬리표. 한국 계정으로 살 수 없는 가격이라
 * 아무 표시 없이 나란히 두면 최저가를 잘못 읽는다. 기준 지역에는 아무것도 붙이지 않는다.
 */
export const REGION_SUFFIX: Partial<Record<Region, string>> = { JP: "일본" };

export const PLATFORM_LABEL: Record<string, string> = {
  steam: "Steam",
  ps5: "PS5",
  ps4: "PS4",
  xbox: "Xbox",
  switch: "Switch",
  switch2: "Switch 2",
  epic: "Epic Games",
  gog: "GOG",
};

/**
 * 화면에 그대로 쓸 스토어 이름. 기준 지역이 아니면 나라를 붙인다("Switch 일본") —
 * 가격 탭, 패치 기록이 같은 이름으로 같은 스토어를 불러야 사용자가 둘을 잇는다.
 */
export function platformLabel(p: { platform: string; region: Region }): string {
  const base = PLATFORM_LABEL[p.platform] ?? p.platform;
  const suffix = REGION_SUFFIX[p.region];
  return suffix ? `${base} ${suffix}` : base;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** "9월 16일 24:00" 처럼 짧은 날짜+시각 (KST) */
export function formatShortDateTime(d: Date | string | null | undefined): string {
  const date = toDate(d);
  if (!date) return "-";
  const { month, day, hour, minute } = kstParts(date);
  return `${trimZero(month)}월 ${trimZero(day)}일 ${hour}:${minute}`;
}

export type SaleRemaining = { text: string; days: number; urgent: boolean };

/**
 * 할인 종료까지 남은 기간. 이미 끝났거나 값이 없으면 null.
 * now 를 인자로 받는 순수 함수 — 캐시된 RSC 에서 굳은 "지금"을 쓰지 않도록 호출부(클라이언트)가 현재 시각을 넘긴다.
 */
export function saleRemaining(endsAt: string | Date | null | undefined, now: number = Date.now()): SaleRemaining | null {
  if (!endsAt) return null;
  const end = typeof endsAt === "string" ? new Date(endsAt) : endsAt;
  const ms = end.getTime() - now;
  if (Number.isNaN(end.getTime()) || ms <= 0) return null;
  const days = Math.ceil(ms / MS_PER_DAY);
  if (ms < MS_PER_DAY) {
    const hours = Math.max(1, Math.round(ms / (60 * 60 * 1000)));
    return { text: `${hours}시간 남음`, days: 0, urgent: true };
  }
  return { text: `${days}일 남음`, days, urgent: days <= 3 };
}

/** "9월 10일 ~ 9월 16일 24:00" 형태의 할인 기간. 시작/종료 중 있는 것만 쓴다 (화면 문구에 화살표를 쓰지 않는다) */
export function formatSaleWindow(startsAt: string | null | undefined, endsAt: string | null | undefined): string | null {
  const start = startsAt ? formatDate(startsAt) : null;
  const end = endsAt ? formatShortDateTime(endsAt) : null;
  if (start && end) return `${start} ~ ${end}`;
  if (end) return `${end} 종료`;
  if (start) return `${start} 시작`;
  return null;
}

/**
 * 요일 이름. 출시예정 목록이 쓴다 — "9월 24일" 만으로는 그게 이번 주인지 다음 주인지 세어 봐야 한다.
 */
const WEEKDAY_LABEL = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * date 컬럼 값("2026-09-24") → "9월 24일 (목)".
 *
 * KST 변환을 하지 않는 이유: 시각이 없는 날짜다. 이 값을 자정으로 놓고 시간대를 옮기면
 * 하루가 앞뒤로 밀린다 — 스토어가 말한 날짜를 그대로 읽는 것이 맞다.
 */
export function formatReleaseDay(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  if (!year || !month || !date) return day;
  const weekday = WEEKDAY_LABEL[new Date(Date.UTC(year, month - 1, date)).getUTCDay()];
  return `${month}월 ${date}일 (${weekday})`;
}

/** 달 열쇠("2026-10") → "2026년 10월". 출시예정 목록의 구분 머리 */
export function formatMonthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return key;
  return `${year}년 ${month}월`;
}
