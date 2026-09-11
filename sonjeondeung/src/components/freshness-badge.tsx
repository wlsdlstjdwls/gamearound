// 신선도 배지 — 설계서 §4.6. fresh는 표시하지 않음, delayed=yellow, stale=red
import { FRESHNESS_LABEL, type Freshness } from "@/lib/freshness";

const STYLE: Record<Freshness, string> = {
  fresh: "",
  delayed: "border-yellow-500/50 bg-yellow-500/10 text-yellow-300",
  stale: "border-red-500/50 bg-red-500/10 text-red-300",
};

export function FreshnessBadge({ freshness, className = "" }: { freshness: Freshness; className?: string }) {
  if (freshness === "fresh") return null;
  const label = FRESHNESS_LABEL[freshness];
  return (
    <span
      role="status"
      aria-label={`데이터 신선도: ${label}`}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${STYLE[freshness]} ${className}`}
    >
      <span aria-hidden>{freshness === "stale" ? "⚠" : "⏱"}</span>
      {label}
    </span>
  );
}
