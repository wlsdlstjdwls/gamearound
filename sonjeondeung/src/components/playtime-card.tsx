// 플레이타임 3종 — HLTB 기준(메인/메인+서브/완전정복). 기획서 3-1 의 1순위 정보라 상세 상단에 배치한다.
// PlaytimeStrip = 헤더 카드 안의 compact 막대, PlaytimeCard = 사이드 카드형(다른 화면에서 재사용).
// 표기는 "라벨 + 가로 막대 + 시간 텍스트" 한 줄. 막대는 보조 신호이고 값은 항상 텍스트로도 읽힌다(a11y).
import { stagger } from "@/lib/motion";
import { formatDateTime, formatHours } from "@/lib/format";
import type { PlaytimeDto } from "@/server/services/games";

type ItemKey = keyof Omit<PlaytimeDto, "lastSyncedAt">;

const ITEMS: Array<{ key: ItemKey; label: string; hint: string; barClass: string }> = [
  { key: "mainStoryHours", label: "메인 스토리", hint: "핵심 스토리만", barClass: "bg-acc" },
  { key: "mainExtraHours", label: "메인 + 서브", hint: "사이드 콘텐츠 포함", barClass: "bg-acc/65" },
  { key: "completionistHours", label: "완전 정복", hint: "모든 요소 달성", barClass: "bg-acc/35" },
];

const EMPTY_TEXT = "플레이타임 정보가 아직 없습니다.";
const MISSING_TEXT = "정보 없음";
/** 스케일 기준: 해당 게임의 최댓값 = 100%. 게임마다 2시간짜리와 5,000시간짜리가 섞여 절대 기준은 의미가 없다 */
const FULL_PCT = 100;
/** 최댓값 대비 1% 미만인 값도 막대가 보이도록 하한을 준다 */
const MIN_BAR_PCT = 5;

/** numeric 컬럼은 문자열로 온다 — 양수만 막대로 그린다(0·음수·NaN 은 값 없음 취급) */
function toHours(v: string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function maxHours(playtime: PlaytimeDto | null): number {
  if (!playtime) return 0;
  return Math.max(0, ...ITEMS.map((it) => toHours(playtime[it.key]) ?? 0));
}

/** 값이 하나라도 있는지 — 전부 null 이면 "수집했지만 제보가 없는" 상태 */
function hasAnyValue(playtime: PlaytimeDto | null): boolean {
  return maxHours(playtime) > 0;
}

function barPct(hours: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(MIN_BAR_PCT, (hours / max) * FULL_PCT);
}

/** 라벨 / 막대 / 시간 한 줄. compact 는 헤더 카드용(힌트 생략, 높이 축소) */
function PlaytimeBars({ playtime, compact }: { playtime: PlaytimeDto | null; compact?: boolean }) {
  const max = maxHours(playtime);
  return (
    <dl className="space-y-2">
      {ITEMS.map((it, i) => {
        const hours = toHours(playtime?.[it.key]);
        return (
          <div key={it.key} className="flex items-center gap-2">
            <dt className={compact ? "w-[4.5rem] shrink-0 text-[11px] text-slate-400" : "w-20 shrink-0 text-xs text-slate-400"}>
              {it.label}
              {!compact && <span className="block text-[10px] leading-tight text-slate-600">{it.hint}</span>}
            </dt>
            <div
              className={`min-w-0 flex-1 overflow-hidden rounded-full bg-slate-800 ${compact ? "h-1.5" : "h-2"}`}
              // 값은 옆 텍스트로 읽히므로 막대 자체는 보조 그래픽
              aria-hidden="true"
            >
              {hours !== null && (
                <div className={`bar-grow h-full rounded-full ${it.barClass}`} style={{ ...stagger(i), "--bar-w": `${barPct(hours, max)}%` } as React.CSSProperties} />
              )}
            </div>
            <dd
              className={
                hours !== null
                  ? `shrink-0 text-right font-bold text-slate-100 ${compact ? "w-[4.5rem] text-xs" : "w-20 text-sm"}`
                  : `shrink-0 text-right text-slate-600 ${compact ? "w-[4.5rem] text-[10px]" : "w-20 text-[11px]"}`
              }
            >
              {hours !== null ? formatHours(hours) : MISSING_TEXT}
            </dd>
          </div>
        );
      })}
    </dl>
  );
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
      {hasAnyValue(playtime) ? <PlaytimeBars playtime={playtime} compact /> : <p className="text-sm text-slate-500">{EMPTY_TEXT}</p>}
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
      {hasAnyValue(playtime) ? <PlaytimeBars playtime={playtime} /> : <p className="text-sm text-slate-500">{EMPTY_TEXT}</p>}
    </section>
  );
}
