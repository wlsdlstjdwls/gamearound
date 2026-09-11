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

export function formatHours(h: string | number | null | undefined): string {
  if (h === null || h === undefined || h === "") return "-";
  const n = typeof h === "string" ? Number(h) : h;
  if (Number.isNaN(n)) return "-";
  return `${n}시간`;
}

export const PLATFORM_LABEL: Record<string, string> = {
  steam: "Steam",
  ps5: "PS5",
  ps4: "PS4",
  xbox: "Xbox",
  switch: "Switch",
  switch2: "Switch 2",
};
