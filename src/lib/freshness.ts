// 신선도 표시 규칙 — 설계서 §4.6.
// 리디자인 원칙 2: 신선도는 배지가 아니라 문장이다. 값 옆에 "언제 수집했는지"를 항상 붙인다.
import type { SyncStatus } from "@/server/db/schema";
import { DISPLAY_TIME_ZONE } from "@/lib/format";

export type Freshness = "fresh" | "delayed" | "stale";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export function getFreshness(lastSyncedAt: Date | string | null | undefined, syncStatus?: SyncStatus | null): Freshness {
  if (syncStatus === "failed") return "stale";
  if (!lastSyncedAt) return "stale";
  const t = typeof lastSyncedAt === "string" ? new Date(lastSyncedAt).getTime() : lastSyncedAt.getTime();
  if (Number.isNaN(t)) return "stale";
  const age = Date.now() - t;
  if (age <= 24 * HOUR) return "fresh";
  if (age <= 72 * HOUR) return "delayed";
  return "stale";
}

export const FRESHNESS_LABEL: Record<Freshness, string> = {
  fresh: "",
  delayed: "갱신 지연",
  stale: "정보가 오래됐을 수 있음",
};

/**
 * "오늘 02:14 수집" / "어제 수집" / "3일 전 수집". 값이 없으면 "수집 기록 없음".
 * 서버(RSC)에서 계산해 텍스트로 내려보낸다 — 클라이언트에서 다시 계산하지 않으므로 하이드레이션 차이가 없다.
 */
export function collectedAtText(lastSyncedAt: Date | string | null | undefined): string {
  if (!lastSyncedAt) return "수집 기록 없음";
  const d = typeof lastSyncedAt === "string" ? new Date(lastSyncedAt) : lastSyncedAt;
  if (Number.isNaN(d.getTime())) return "수집 기록 없음";
  const age = Date.now() - d.getTime();
  if (age < DAY) {
    const hhmm = d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: DISPLAY_TIME_ZONE });
    return `오늘 ${hhmm} 수집`;
  }
  const days = Math.floor(age / DAY);
  return days === 1 ? "어제 수집" : `${days}일 전 수집`;
}

/**
 * KST 기준 가격 수집 시각. crawl-prices 워크플로의 cron(UTC 17:10, 05:10)을 옮긴 값이다 —
 * 그 파일의 schedule 을 고치면 여기도 고친다.
 * 2026-09-15 에 셋(02:10 / 10:10 / 18:10)에서 둘로 줄였다. Actions 무료 한도에 맞춘 주기다.
 * 닌텐도와 Epic 은 Vercel 크론이 6시간마다 따로 돌지만, 화면 문구는 대부분의 스토어가 도는 이 두 시각으로 말한다.
 */
export const COLLECT_HOURS_KST = [2, 14] as const;
export const COLLECT_MINUTE_KST = 10;

/** 다음 수집 예정 시각("10:10"). 빈 상태 안내에 "다음 수집"을 넣을 때 쓴다 */
export function nextCollectTimeText(now: Date = new Date()): string {
  const kst = new Date(now.getTime() + 9 * HOUR);
  const mins = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  const slots = COLLECT_HOURS_KST.map((h) => h * 60 + COLLECT_MINUTE_KST);
  const next = slots.find((m) => m > mins) ?? slots[0];
  return `${String(Math.floor(next / 60)).padStart(2, "0")}:${String(next % 60).padStart(2, "0")}`;
}

/** 수집 주기 안내 문구 — /alerts 에서 쓴다. 실제 cron 과 일치시킨다(COLLECT_HOURS_KST) */
export const COLLECT_SCHEDULE_TEXT =
  "가격 수집은 하루 두 번(02:10 / 14:10 KST)이며 정확한 시각을 보장하지 않습니다.";
export const ALERT_RULE_TEXT =
  "알림은 할인율이 조건 이상이고 직전 수집보다 가격이 내려갔을 때 발송됩니다.";
