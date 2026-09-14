// 순수 유틸: 가격/날짜 포맷
// 시각은 항상 한국 시간(KST)으로 표시한다. 서버(Vercel)는 UTC 라 timeZone 을 명시하지 않으면 9시간 어긋난다.
export const DISPLAY_TIME_ZONE = "Asia/Seoul";

export function formatKrw(price: number | null | undefined): string {
  if (price === null || price === undefined) return "-";
  if (price === 0) return "무료";
  return `₩${price.toLocaleString("ko-KR")}`;
}

export function formatDiscount(pct: number | null | undefined): string {
  if (!pct || pct <= 0) return "";
  return `-${pct}%`;
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: DISPLAY_TIME_ZONE });
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short", timeZone: DISPLAY_TIME_ZONE });
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

export const PLATFORM_LABEL: Record<string, string> = {
  steam: "Steam",
  ps5: "PS5",
  ps4: "PS4",
  xbox: "Xbox",
  switch: "Switch",
  switch2: "Switch 2",
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** "9월 16일 24:00" 처럼 짧은 날짜+시각 (KST) */
export function formatShortDateTime(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: DISPLAY_TIME_ZONE });
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
