// 플레이타임 3종 — HLTB 기준(메인/메인+서브/완전정복). 구매 결정의 "얼마나 걸리나"에 답하는 칸.
// 표기는 "라벨 + 가로 막대 + 시간 텍스트" 한 줄. 막대는 보조 신호이고 값은 항상 텍스트로도 읽힌다(a11y).
import { stagger } from "@/lib/motion";
import { formatHours } from "@/lib/format";
import type { PlaytimeDto } from "@/server/services/games";

type ItemKey = keyof Omit<PlaytimeDto, "lastSyncedAt">;

// 막대는 하나의 색을 밝기로만 나눈다(채도 대비 금지 — 저채도 정보형 UI)
const ITEMS: Array<{ key: ItemKey; label: string; barClass: string }> = [
  { key: "mainStoryHours", label: "메인 스토리", barClass: "bg-ink" },
  { key: "mainExtraHours", label: "메인 + 서브", barClass: "bg-[#6B6862]" },
  { key: "completionistHours", label: "완전 정복", barClass: "bg-dim-2" },
];

const EMPTY_TEXT = "플레이타임 정보가 아직 없습니다.";
const MISSING_TEXT = "정보 없음";
/** 스케일 기준: 해당 게임의 최댓값 = 100%. 게임마다 2시간짜리와 5,000시간짜리가 섞여 절대 기준은 의미가 없다 */
const FULL_PCT = 100;
/** 최댓값 대비 1% 미만인 값도 막대가 보이도록 하한을 준다 */
const MIN_BAR_PCT = 5;

/** numeric 컬럼은 문자열로 온다 — 양수만 막대로 그린다(0·음수·NaN 은 값 없음 취급) */
function toHours(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function maxHours(playtime: PlaytimeDto | null): number {
  if (!playtime) return 0;
  return Math.max(0, ...ITEMS.map((it) => toHours(playtime[it.key]) ?? 0));
}

function hasAnyValue(playtime: PlaytimeDto | null): boolean {
  return maxHours(playtime) > 0;
}

function barPct(hours: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(MIN_BAR_PCT, (hours / max) * FULL_PCT);
}

/** "MM.DD" — 사이드 카드 헤더의 출처 표기용 */
function shortDate(d: string | Date | null | undefined): string | null {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return null;
  return `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

/** 메인 스토리 기준 시간당 가격. 값이 하나라도 없으면 null → 줄 자체를 숨긴다 */
export function pricePerHour(currentPrice: number | null | undefined, playtime: PlaytimeDto | null): number | null {
  const hours = toHours(playtime?.mainStoryHours);
  if (!hours || currentPrice === null || currentPrice === undefined || currentPrice <= 0) return null;
  return Math.round(currentPrice / hours);
}

function PlaytimeBars({ playtime, compact }: { playtime: PlaytimeDto | null; compact?: boolean }) {
  const max = maxHours(playtime);
  return (
    <dl className="flex flex-col gap-2">
      {ITEMS.map((it, i) => {
        const hours = toHours(playtime?.[it.key]);
        return (
          <div key={it.key} className="flex items-center gap-2.5">
            <dt className={`${compact ? "w-[4.25rem] text-[11px]" : "w-[68px] text-[12px]"} shrink-0 text-mut`}>{it.label}</dt>
            <div
              className={`min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2 ${compact ? "h-1.5" : "h-1.5"}`}
              // 값은 옆 텍스트로 읽히므로 막대 자체는 보조 그래픽
              aria-hidden="true"
            >
              {hours !== null && (
                <div
                  className={`bar-grow h-full rounded-full ${it.barClass}`}
                  style={{ ...stagger(i), "--bar-w": `${barPct(hours, max)}%` } as React.CSSProperties}
                />
              )}
            </div>
            <dd
              className={
                hours !== null
                  ? `w-[58px] shrink-0 text-right text-[12.5px] font-bold text-ink`
                  : `w-[58px] shrink-0 text-right text-[11px] text-dim-2`
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

/** 헤더 안에 얇게 넣는 형태(다른 화면에서 재사용) */
export function PlaytimeStrip({ playtime }: { playtime: PlaytimeDto | null }) {
  return (
    <section aria-labelledby="playtime-heading" className="rounded-[7px] border border-line bg-surface p-3">
      <h2 id="playtime-heading" className="mb-2 text-[11.5px] font-semibold text-dim">
        플레이타임
      </h2>
      {hasAnyValue(playtime) ? <PlaytimeBars playtime={playtime} compact /> : <p className="text-[12.5px] text-dim">{EMPTY_TEXT}</p>}
    </section>
  );
}

/** 상세 사이드바 카드 — 하단에 "시간당 가격" 파생 지표 */
export function PlaytimeCard({ playtime, currentPrice }: { playtime: PlaytimeDto | null; currentPrice?: number | null }) {
  const synced = shortDate(playtime?.lastSyncedAt);
  const perHour = pricePerHour(currentPrice, playtime);

  return (
    <section aria-labelledby="playtime-card-heading" className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="playtime-card-heading" className="text-[13.5px] font-bold text-ink">
          플레이타임
        </h2>
        <span className="text-[11.5px] text-dim">{synced ? `HLTB · ${synced}` : "HLTB"}</span>
      </div>
      {hasAnyValue(playtime) ? <PlaytimeBars playtime={playtime} /> : <p className="text-[12.5px] text-dim">{EMPTY_TEXT}</p>}
      {perHour !== null && (
        <p className="border-t border-line-soft pt-2.5 text-[11.5px] text-dim">
          메인 스토리 기준 시간당 {perHour.toLocaleString("ko-KR")}원
        </p>
      )}
    </section>
  );
}
