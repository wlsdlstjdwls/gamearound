// 상세 히어로의 숫자 두 묶음 — 평점 카드(목업 .critw)와 플레이타임 3칸(목업 .pt).
//
// 평점: 목업은 Metacritic, OpenCritic, IGN 셋이다. **IGN 은 뺐다** — 받아 오는 수집처가 없다(memory: 유저 점수 수집처,
// 오픈크리틱 키). 빈 칸을 "-" 로 세우면 고장으로 읽히므로(2026-09-15 ScoreGrid 결정) 아는 점수만 세운다.
// 그 자리에는 우리가 가진 유저 점수가 선다. 매체 로고는 그리지 않는다 — 남의 상표를 흉내 낸 도형은 쓰지 않고, 이름이 곧 라벨이다.
//
// 플레이타임: 목업은 막대 대신 큰 숫자 셋이다. 막대 카드(playtime-card)는 지우지 않고 남겨 두었다 —
// 시간당 가격(SHOW_PRICE_PER_HOUR)을 되살릴 때 그 카드가 다시 쓰인다.
import { DETAIL_MESSAGES as D } from "@/lib/games/detail-messages";
import { toPositiveNumber } from "@/lib/price-per-hour";
import { cn } from "@/lib/cn";
import { ClockIcon } from "@/components/ui/icons";
import { SECTION_SIZE } from "@/components/ui/page";
import { InfoTip } from "@/components/ui/tooltip";
import { scoreLines, type GameDetail, type PlaytimeDto } from "@/server/services/games";

/** 목업 순서. scoreLines 는 오픈크리틱을 먼저 주지만 화면은 목업의 읽는 순서를 따른다 */
const SCORE_ORDER = ["metacritic", "opencritic", "user"] as const;

export function CriticScores({ game, unreleased }: { game: GameDetail; unreleased: boolean }) {
  const lines = scoreLines(game.platforms).sort(
    (a, b) => SCORE_ORDER.indexOf(a.key as (typeof SCORE_ORDER)[number]) - SCORE_ORDER.indexOf(b.key as (typeof SCORE_ORDER)[number]),
  );
  return (
    <section aria-labelledby="scores-heading" className="flex flex-col gap-2.5">
      <h2 id="scores-heading" className={SECTION_SIZE.label}>
        {D.scoresLabel}
      </h2>
      {lines.length === 0 ? (
        // 출시 전이면 "아직 못 모았다" 가 아니라 "출시하면 생긴다" 가 맞는 말이다(기획서 v2.0 S-05)
        <p className="rounded-[var(--radius-md)] bg-surface-2 px-4 py-3.5 text-[13px] text-mut">{unreleased ? D.scoresAfterRelease : D.scoresPending}</p>
      ) : (
        <dl className={cn("grid gap-2.5", lines.length >= 3 ? "grid-cols-3" : lines.length === 2 ? "grid-cols-2" : "grid-cols-1 sm:max-w-[50%]")}>
          {lines.map((c) => (
            <div key={c.key} className="flex min-h-[92px] min-w-0 flex-col justify-between gap-2 rounded-[var(--radius-md)] bg-surface p-3.5 shadow-hair">
              <dt className="flex min-w-0 items-center gap-0.5 text-[12px] font-bold text-mut">
                <span className="truncate">{D.scoreLabel[c.key as keyof typeof D.scoreLabel] ?? c.label}</span>
                {/* 유저 점수만 단서(어느 스토어의 몇 명인가)가 있다 — 점수를 믿을지 정할 때 한 번 보는 값이라 말풍선에 둔다 */}
                {c.note && <InfoTip label={c.note} className="size-[15px]" />}
              </dt>
              <dd className="text-[28px] font-extrabold leading-none tracking-[-0.03em] text-ink">
                {c.value}
                {c.suffix && <span className="ml-0.5 text-[12px] font-semibold tracking-normal text-dim">{c.suffix}</span>}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

const PLAYTIME_KEYS = ["mainStoryHours", "mainExtraHours", "completionistHours"] as const;

/** 시간 숫자 — 소수 첫째 자리까지. HLTB 는 25.5 같은 반 시간을 준다 */
function hoursText(h: number): string {
  return String(Math.round(h * 10) / 10);
}

export function PlaytimeTiles({ playtime, className }: { playtime: PlaytimeDto | null; className?: string }) {
  const values = PLAYTIME_KEYS.map((k) => ({ key: k, hours: toPositiveNumber(playtime?.[k]) }));
  // 값이 하나도 없으면 부르는 쪽의 늘리기(flex-1)를 받지 않는다 — 안내 한 줄짜리 판이 옆 칸 높이만큼 비어 늘어났다
  const empty = values.every((v) => v.hours === null);
  const any = values.some((v) => v.hours !== null);
  return (
    <section aria-labelledby="playtime-heading" className={cn("flex flex-col gap-3 rounded-[var(--radius-panel)] bg-surface p-4 shadow-[var(--elev-card)] sm:p-5", !empty && className)}>
      <h2 id="playtime-heading" className="flex items-center gap-1.5 text-[16px] font-extrabold text-ink">
        <ClockIcon size={17} className="text-acc" />
        {D.playtimeTitle}
      </h2>
      {any ? (
        // 칸 사이 세로선은 목업 그대로 둔다 — 칸 수가 늘 셋이라 2026-09-21 의 "칸 수에 따라 선이 달라진다" 문제가 없다
        <dl className="grid flex-1 grid-cols-3 content-center border-t border-line pt-3">
          {values.map((v, i) => (
            <div key={v.key} className={cn("flex min-w-0 flex-col gap-1.5 px-2.5", i === 0 ? "pl-0" : "border-l border-line")}>
              <dt className="min-h-[2.8em] text-[12px] leading-[1.4] text-mut">{D.playtimeItems[v.key]}</dt>
              <dd className="text-[24px] font-extrabold leading-none tracking-[-0.03em] text-ink sm:text-[28px]">
                {v.hours === null ? <span className="text-dim-2">-</span> : hoursText(v.hours)}
                {v.hours !== null && <small className="ml-0.5 text-[13px] font-bold tracking-normal">{D.playtimeUnit}</small>}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="border-t border-line pt-3 text-[13px] text-dim">{D.playtimeEmpty}</p>
      )}
    </section>
  );
}
