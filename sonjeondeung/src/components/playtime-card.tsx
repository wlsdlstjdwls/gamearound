// 플레이타임 3종 카드 — HLTB 기준(메인/메인+서브/완전정복)
import { formatDateTime, formatHours } from "@/lib/format";
import type { PlaytimeDto } from "@/server/services/games";

const ITEMS: Array<{ key: keyof Omit<PlaytimeDto, "lastSyncedAt">; label: string; hint: string }> = [
  { key: "mainStoryHours", label: "메인 스토리", hint: "핵심 스토리만" },
  { key: "mainExtraHours", label: "메인 + 서브", hint: "사이드 콘텐츠 포함" },
  { key: "completionistHours", label: "완전 정복", hint: "모든 요소 달성" },
];

export function PlaytimeCard({ playtime }: { playtime: PlaytimeDto | null }) {
  return (
    <section aria-labelledby="playtime-heading" className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="playtime-heading" className="text-sm font-semibold text-slate-300">
          플레이타임
        </h2>
        {playtime?.lastSyncedAt && (
          <span className="text-xs text-slate-500">갱신 {formatDateTime(playtime.lastSyncedAt)}</span>
        )}
      </div>
      {playtime ? (
        <dl className="grid grid-cols-3 gap-2">
          {ITEMS.map((it) => (
            <div key={it.key} className="rounded-lg bg-slate-950/60 p-3 text-center">
              <dt className="text-xs text-slate-400">{it.label}</dt>
              <dd className="mt-1 text-lg font-bold text-slate-100">{formatHours(playtime[it.key])}</dd>
              <dd className="text-[11px] text-slate-500">{it.hint}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-slate-500">플레이타임 정보가 아직 없습니다.</p>
      )}
    </section>
  );
}
