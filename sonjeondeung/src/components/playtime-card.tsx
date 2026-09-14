// 플레이타임 3종 — HLTB 기준(메인/메인+서브/완전정복). 기획서 3-1 의 1순위 정보라 상세 상단에 배치한다.
// PlaytimeStrip = 헤더 카드 안의 가로 3분할, PlaytimeCard = 사이드 카드형(다른 화면에서 재사용).
import { formatDateTime, formatHours } from "@/lib/format";
import type { PlaytimeDto } from "@/server/services/games";

type ItemKey = keyof Omit<PlaytimeDto, "lastSyncedAt">;

const ITEMS: Array<{ key: ItemKey; label: string; hint: string }> = [
  { key: "mainStoryHours", label: "메인 스토리", hint: "핵심 스토리만" },
  { key: "mainExtraHours", label: "메인 + 서브", hint: "사이드 콘텐츠 포함" },
  { key: "completionistHours", label: "완전 정복", hint: "모든 요소 달성" },
];

const EMPTY_TEXT = "플레이타임 정보가 아직 없습니다.";

/** 값이 하나라도 있는지 — 전부 null 이면 "수집했지만 제보가 없는" 상태 */
function hasAnyValue(playtime: PlaytimeDto | null): boolean {
  return Boolean(playtime && ITEMS.some((it) => playtime[it.key] !== null && playtime[it.key] !== ""));
}

export function PlaytimeStrip({ playtime }: { playtime: PlaytimeDto | null }) {
  return (
    <section aria-labelledby="playtime-heading" className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 id="playtime-heading" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          플레이타임
        </h2>
        {playtime?.lastSyncedAt && <span className="text-[11px] text-slate-500">갱신 {formatDateTime(playtime.lastSyncedAt)}</span>}
      </div>
      {hasAnyValue(playtime) ? (
        <dl className="grid grid-cols-3 gap-2">
          {ITEMS.map((it) => (
            <div key={it.key} className="text-center">
              <dt className="text-[11px] text-slate-400">{it.label}</dt>
              <dd className="text-lg font-bold leading-tight text-slate-100">{formatHours(playtime?.[it.key])}</dd>
              <dd className="text-[10px] text-slate-500">{it.hint}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-slate-500">{EMPTY_TEXT}</p>
      )}
    </section>
  );
}

export function PlaytimeCard({ playtime }: { playtime: PlaytimeDto | null }) {
  return (
    <section aria-labelledby="playtime-card-heading" className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="playtime-card-heading" className="text-sm font-semibold text-slate-300">
          플레이타임
        </h2>
        {playtime?.lastSyncedAt && <span className="text-xs text-slate-500">갱신 {formatDateTime(playtime.lastSyncedAt)}</span>}
      </div>
      {hasAnyValue(playtime) ? (
        <dl className="grid grid-cols-3 gap-2">
          {ITEMS.map((it) => (
            <div key={it.key} className="rounded-lg bg-slate-950/60 p-3 text-center">
              <dt className="text-xs text-slate-400">{it.label}</dt>
              <dd className="mt-1 text-lg font-bold text-slate-100">{formatHours(playtime?.[it.key])}</dd>
              <dd className="text-[11px] text-slate-500">{it.hint}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-slate-500">{EMPTY_TEXT}</p>
      )}
    </section>
  );
}
