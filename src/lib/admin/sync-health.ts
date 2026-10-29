// 스토어 하나의 수집이 지금 어떤 상태인지 가르는 규칙. 수집 현황 표(admin/sync)와 업무 현황판(admin)이 같이 쓴다 —
// 둘이 따로 세면 현황판은 "손볼 스토어 0" 인데 표에는 끊김 줄이 서는 어긋남이 생긴다.
//
// "끊김" 은 끝나지 않은 실행이 유예 시간을 넘긴 것이다. 앞 화면은 끝나지 않은 실행을 전부 "도는 중" 으로 읽어
// 며칠째 안 끝난 실행이 정상처럼 보였다(wikidata_game 실측).

export type SyncHealth = "stalled" | "failed" | "partial" | "running" | "ok" | "idle";

/** 사람이 손봐야 하는 상태. 현황판은 이 셋만 센다 */
export const SYNC_ATTENTION: readonly SyncHealth[] = ["stalled", "failed", "partial"];

export interface SyncHealthInput {
  startedAt: Date;
  finishedAt: Date | null;
  status: string;
}

export function syncHealthOf(latest: SyncHealthInput | null, disabled: boolean, now: number, graceMinutes: number): SyncHealth {
  if (disabled || !latest) return "idle";
  if (!latest.finishedAt) return (now - latest.startedAt.getTime()) / 60000 <= graceMinutes ? "running" : "stalled";
  if (latest.status === "failed" || latest.status === "partial" || latest.status === "ok") return latest.status;
  // 모르는 상태 값은 손볼 쪽으로 읽는다 — 정상으로 읽으면 새 상태가 생겼다는 사실이 묻힌다
  return "failed";
}
