"use client";
// 일정 화면 머리의 요약 줄(2026-11-04, 업무요청 제목이 "업무 별 진행률 타임라인" 이다). 갈래 셋의 진행률 + 다음 이정표.
// 간트를 훑지 않아도 "영업이 어디까지 왔나" 가 첫눈에 들어와야 한다 — 그래서 숫자를 크게, 막대는 갈래 색으로.
// 진행 낱말에 색을 깐 배지를 쓰지 않는다(no-green-badges): 지연만 빨강 글자, 나머지는 흐린 글자다.
// 기본은 한 줄 띠로 접혀 있다(사용자 "카드가 너무 많이 차지해서 아래 차트가 안 보인다, 접었다 펼치게"). 띠 끝 "자세히" 로 카드를 편다.
import { useCodes } from "@/components/code-book";
import { ChevronDownIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { Clamp } from "@/components/ui/tooltip";
import { PLAN_MESSAGES as M } from "@/lib/admin/messages";
import { dayOffset, type PersonPlan, type PlanRow, type TrackSummary } from "@/lib/admin/plan";
import { TRACK_COLOR } from "./gantt";

const CARD = "flex min-w-0 flex-col gap-2 rounded-xl border border-line bg-surface px-4 py-3";
/** 사람 카드에 늘어놓을 "지금 하는 일" 줄 수. 셋을 넘기면 카드 높이가 사람마다 달라진다 */
const NOW_MAX = 3;

/** 담당자별 카드: 이름 + 진행률 + 지금 하는 일(진행, 지연 중인 작업). "서로 무엇을 하고 있나" 가 이 카드의 일이다 */
function PersonCard({ p, name, today, onPick }: { p: PersonPlan; name: string; today: string; onPick: (id: string) => void }) {
  const initial = name.trim().slice(0, 1) || "-";
  // 하는 일이 있으면 그것, 없으면 다음 할 일(시작 전) — 시작 전인 사람 카드가 "없어요" 만 보이면 서로의 계획을 못 본다
  const list = p.doing.length > 0 ? p.doing : p.next;
  return (
    <div className={CARD}>
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-acc-soft text-[14px] font-bold text-acc" aria-hidden>
          {initial}
        </span>
        <span className="min-w-0 flex-1 text-[14.5px] font-bold text-ink">
          <Clamp>{name}</Clamp>
        </span>
        <span className="text-[22px] font-bold leading-none tabular-nums text-ink">
          {p.pct}
          <span className="ml-0.5 text-[13px] font-semibold text-dim">%</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={p.pct} aria-valuemin={0} aria-valuemax={100} aria-label={name}>
        <div className="h-full rounded-full bg-acc transition-[width] duration-slow ease-out-emph" style={{ width: `${p.pct}%` }} />
      </div>
      <div className="flex gap-3 text-[12.5px] tabular-nums text-dim">
        <span>{M.sumTotal(p.rows.length)}</span>
        <span>{M.sumDone(p.done)}</span>
        <span className={p.late > 0 ? "font-semibold text-danger" : undefined}>{M.sumLate(p.late)}</span>
      </div>
      <div className="border-t border-line pt-2">
        <p className="mb-1 text-[12px] font-semibold text-dim">{list === p.doing ? M.personNow : M.personNext}</p>
        {list.length === 0 ? (
          <p className="text-[13px] text-dim">{M.personIdle}</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {list.slice(0, NOW_MAX).map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => onPick(r.id)} className="press flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-left text-[13px] hover:bg-surface-2">
                  <span className="size-1.5 shrink-0 rounded-full" style={{ background: TRACK_COLOR[r.track] }} aria-hidden />
                  <Clamp className="min-w-0 flex-1 text-ink-2">{r.title}</Clamp>
                  {/* 하는 일은 진행률, 다음 일은 시작일 */}
                  <span className={cn("shrink-0 tabular-nums", r.end && r.end < today ? "text-danger" : "text-dim")}>{list === p.doing ? `${r.pct}%` : (r.start ?? "").slice(5).replace("-", "/")}</span>
                </button>
              </li>
            ))}
            {list.length > NOW_MAX && <li className="px-1 text-[12px] text-dim">{M.personMore(list.length - NOW_MAX)}</li>}
          </ul>
        )}
      </div>
    </div>
  );
}

type Fold = { open: boolean; onToggle: () => void };

/** 접힌 띠의 한 칸: 머리(동그라미, 이름) + 진행률 + 작은 막대 + 덧말 한 줄 */
function StripItem({ lead, label, pct, color, note, onClick }: { lead: React.ReactNode; label: string; pct: number; color: string; note?: React.ReactNode; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick} className="press flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] enabled:hover:bg-surface-2">
      {lead}
      <span className="shrink-0 font-semibold text-ink">{label}</span>
      <span className="shrink-0 font-bold tabular-nums text-ink">{pct}%</span>
      <span className="h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </span>
      {note && <span className="hidden min-w-0 max-w-[160px] text-dim xl:block">{note}</span>}
    </button>
  );
}

function FoldButton({ fold }: { fold: Fold }) {
  return (
    // 펴도 접어도 같은 자리(판 오른쪽 위)에 선다 — 펴면 바닥으로 내려가 다시 찾아야 했다(사용자 "그 자리에서 다시 접게, 버튼 고정")
    <button type="button" onClick={fold.onToggle} aria-expanded={fold.open} className="press absolute right-2 top-1.5 z-10 flex shrink-0 items-center gap-1 rounded-lg bg-surface px-2.5 py-1.5 text-[12.5px] font-semibold text-dim hover:bg-surface-2 hover:text-ink">
      {fold.open ? M.summaryClose : M.summaryOpen}
      <ChevronDownIcon size={14} className={cn("transition-transform duration-fast", fold.open && "rotate-180")} />
    </button>
  );
}

function Strip({ fold, children, milestone, today, onPick }: { fold: Fold; children: React.ReactNode; milestone: PlanRow | null; today: string; onPick: (id: string) => void }) {
  return (
    <section aria-label={M.summary} className="relative flex items-center gap-1 rounded-xl border border-line bg-surface py-1 pl-2 pr-24">
      <FoldButton fold={fold} />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1 gap-y-0.5">
        {children}
        {milestone?.start && (
          <button type="button" onClick={() => onPick(milestone.id)} className="press flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] hover:bg-surface-2">
            <span className="size-2.5 shrink-0 rotate-45 rounded-[2px] bg-ink" aria-hidden />
            <Clamp className="min-w-0 max-w-[180px] font-semibold text-ink">{milestone.title}</Clamp>
            <span className="shrink-0 rounded-md bg-acc px-1.5 py-0.5 text-[11.5px] font-bold tabular-nums text-on-ink">{M.dday(dayOffset(today, milestone.start))}</span>
          </button>
        )}
      </div>
    </section>
  );
}

export function PersonSummary({ people, nameOf, milestone, today, onPick, fold }: { people: PersonPlan[]; nameOf: (id: string | null) => string; milestone: PlanRow | null; today: string; onPick: (id: string) => void; fold: Fold }) {
  if (!fold.open)
    return (
      <Strip fold={fold} milestone={milestone} today={today} onPick={onPick}>
        {people.map((p) => {
          const name = nameOf(p.assigneeId);
          const now = p.doing[0] ?? p.next[0];
          return (
            <StripItem
              key={p.assigneeId ?? "none"}
              lead={
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-acc-soft text-[11.5px] font-bold text-acc" aria-hidden>
                  {name.trim().slice(0, 1) || "-"}
                </span>
              }
              label={name}
              pct={p.pct}
              color="var(--acc)"
              note={now && <Clamp>{`${p.doing.length > 0 ? M.personNow : M.personNext} | ${now.title}`}</Clamp>}
              onClick={now ? () => onPick(now.id) : undefined}
            />
          );
        })}
      </Strip>
    );
  return (
    <section aria-label={M.summary} className="relative grid gap-3 rounded-xl border border-line bg-surface-2/50 p-2 pt-10 sm:grid-cols-2 xl:grid-cols-4">
      <FoldButton fold={fold} />
      <span className="absolute left-3.5 top-3 text-[13px] font-bold text-ink-2">{M.summary}</span>
      {people.map((p) => (
        <PersonCard key={p.assigneeId ?? "none"} p={p} name={nameOf(p.assigneeId)} today={today} onPick={onPick} />
      ))}
      <MilestoneCard milestone={milestone} today={today} onPick={onPick} />
    </section>
  );
}

export function PlanSummary({ tracks, milestone, today, onPick, fold }: { tracks: TrackSummary[]; milestone: PlanRow | null; today: string; onPick: (id: string) => void; fold: Fold }) {
  const { name } = useCodes();
  if (!fold.open)
    return (
      <Strip fold={fold} milestone={milestone} today={today} onPick={onPick}>
        {tracks.map((t) => (
          <StripItem
            key={t.track}
            lead={<span className="size-2.5 shrink-0 rounded-full" style={{ background: TRACK_COLOR[t.track] }} aria-hidden />}
            label={name("PLAN_TRACK", t.track)}
            pct={t.pct}
            color={TRACK_COLOR[t.track]}
            note={<span className={t.late > 0 ? "font-semibold text-danger" : undefined}>{M.sumLate(t.late)}</span>}
          />
        ))}
      </Strip>
    );
  return (
    <section aria-label={M.summary} className="relative grid gap-3 rounded-xl border border-line bg-surface-2/50 p-2 pt-10 sm:grid-cols-2 xl:grid-cols-4">
      <FoldButton fold={fold} />
      <span className="absolute left-3.5 top-3 text-[13px] font-bold text-ink-2">{M.summary}</span>
      {tracks.map((t) => (
        <div key={t.track} className={CARD}>
          <div className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-2">
            <span className="size-2.5 rounded-full" style={{ background: TRACK_COLOR[t.track] }} aria-hidden />
            {name("PLAN_TRACK", t.track)}
            <span className="ml-auto text-[12.5px] font-normal tabular-nums text-dim">{M.sumTotal(t.total)}</span>
          </div>
          <div className="flex items-end gap-3">
            <span className="text-[28px] font-bold leading-none tracking-tight tabular-nums text-ink">
              {t.pct}
              <span className="ml-0.5 text-[15px] font-semibold text-dim">%</span>
            </span>
            <div className="mb-1 h-2 flex-1 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={t.pct} aria-valuemin={0} aria-valuemax={100} aria-label={name("PLAN_TRACK", t.track)}>
              <div className="h-full rounded-full transition-[width] duration-slow ease-out-emph" style={{ width: `${t.pct}%`, background: TRACK_COLOR[t.track] }} />
            </div>
          </div>
          <div className="flex gap-3 text-[12.5px] tabular-nums text-dim">
            <span>{M.sumDone(t.done)}</span>
            <span>{M.sumDoing(t.doing)}</span>
            <span className={t.late > 0 ? "font-semibold text-danger" : undefined}>{M.sumLate(t.late)}</span>
          </div>
        </div>
      ))}
      <MilestoneCard milestone={milestone} today={today} onPick={onPick} />
    </section>
  );
}

function MilestoneCard({ milestone, today, onPick }: { milestone: PlanRow | null; today: string; onPick: (id: string) => void }) {
  return (
    <button type="button" disabled={!milestone} onClick={() => milestone && onPick(milestone.id)} className={`${CARD} press text-left transition-colors duration-fast enabled:hover:border-acc`}>
        <div className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-2">
          <span className="size-2.5 rotate-45 rounded-[2px] bg-ink" aria-hidden />
          {M.nextMilestone}
          {milestone?.start && <span className="ml-auto rounded-md bg-acc px-1.5 py-0.5 text-[12px] font-bold tabular-nums text-on-ink">{M.dday(dayOffset(today, milestone.start))}</span>}
        </div>
        {milestone ? (
          <>
            <Clamp className="text-[17px] font-bold text-ink">{milestone.title}</Clamp>
            <span className="text-[12.5px] tabular-nums text-dim">
              {milestone.start} | {milestone.no}
            </span>
          </>
        ) : (
          <span className="text-[13px] text-dim">{M.noMilestone}</span>
        )}
      </button>
  );
}
