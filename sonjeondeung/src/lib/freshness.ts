// 신선도 표시 규칙 — 설계서 §4.6
import type { SyncStatus } from "@/server/db/schema";

export type Freshness = "fresh" | "delayed" | "stale";

const HOUR = 60 * 60 * 1000;

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
