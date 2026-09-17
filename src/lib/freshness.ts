// 신선도 표시 규칙 — 설계서 §4.6.
// 리디자인 원칙 2: 신선도는 배지가 아니라 문장이다. 값 옆에 "언제 기준 값인지"를 항상 붙인다.
//
// 화면 문구에서 "수집" 이라는 말을 쓰지 않는다(2026-09-16). 크롤링은 우리 사정이지
// 보는 사람의 관심사가 아니다 — 읽는 사람이 알고 싶은 것은 "이 값이 언제 기준인가" 하나다.
// 관리자 화면은 예외다(거기서는 수집이 곧 일감이라 그 말이 정확하다).
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

/**
 * 24~72시간 구간(delayed)은 문구를 달지 않는다(2026-09-17).
 * 하루 이틀 지난 값은 보는 사람이 달리 행동할 일이 없는데 "갱신 지연" 은 우리 사정을 고장처럼 알린다 —
 * 정말 손을 써야 하는 것은 사흘 넘은 값(stale)뿐이다. 구간 자체는 남긴다(정렬, 관리자 화면이 쓴다).
 */
export const FRESHNESS_LABEL: Record<Freshness, string> = {
  fresh: "",
  delayed: "",
  stale: "정보가 오래됐을 수 있음",
};

/**
 * "오늘 02:14 기준" / "어제 기준" / "3일 전 기준". 값이 없으면 "기준 시각 없음".
 * 서버(RSC)에서 계산해 텍스트로 내려보낸다 — 클라이언트에서 다시 계산하지 않으므로 하이드레이션 차이가 없다.
 */
export function collectedAtText(lastSyncedAt: Date | string | null | undefined): string {
  if (!lastSyncedAt) return "기준 시각 없음";
  const d = typeof lastSyncedAt === "string" ? new Date(lastSyncedAt) : lastSyncedAt;
  if (Number.isNaN(d.getTime())) return "기준 시각 없음";
  const age = Date.now() - d.getTime();
  if (age < DAY) {
    const hhmm = d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: DISPLAY_TIME_ZONE });
    return `오늘 ${hhmm} 기준`;
  }
  const days = Math.floor(age / DAY);
  return days === 1 ? "어제 기준" : `${days}일 전 기준`;
}

/**
 * KST 기준 가격 확인 시각. crawl-prices 워크플로의 cron(UTC 17:10, 05:10)을 옮긴 값이다 —
 * 그 파일의 schedule 을 고치면 여기도 고친다.
 * 2026-09-15 에 셋(02:10 / 10:10 / 18:10)에서 둘로 줄였다. Actions 무료 한도에 맞춘 주기다.
 * 닌텐도와 Epic 은 Vercel 크론이 6시간마다 따로 돌지만, 화면 문구는 대부분의 스토어가 도는 이 두 시각으로 말한다.
 */
export const COLLECT_HOURS_KST = [2, 14] as const;
export const COLLECT_MINUTE_KST = 10;

/**
 * 가격 확인 주기 안내 — /alerts 에서 쓴다.
 * 알림은 "언제 오는지" 를 약속하는 화면이라 주기를 지운 채로 둘 수 없다 — 다른 화면과 달리
 * 여기서는 시각 자체가 사용자의 관심사다. 그래서 주기는 남기고 "수집" 이라는 말만 뺀다.
 * 시각을 손으로 적지 않고 위 상수에서 만든다 — 주기를 바꿀 때 문구만 낡는 일이 없어야 한다.
 */
const collectTimesText = COLLECT_HOURS_KST
  .map((h) => `${String(h).padStart(2, "0")}:${String(COLLECT_MINUTE_KST).padStart(2, "0")}`)
  .join(" / ");
export const COLLECT_SCHEDULE_TEXT =
  `가격은 하루 ${COLLECT_HOURS_KST.length === 2 ? "두" : String(COLLECT_HOURS_KST.length)} 번(${collectTimesText} KST) 확인하고, 정확한 시각을 보장하지 않아요.`;
export const ALERT_RULE_TEXT =
  "알림은 할인율이 조건 이상이고 직전에 확인한 값보다 가격이 내려갔을 때 보내요.";
