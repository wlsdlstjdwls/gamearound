// 상세 히어로의 숫자 두 묶음 — 평점 카드(목업 .critw)와 플레이타임 3칸(목업 .pt).
//
// 평점(2026-11-16 사용자): 평론 매체 셋(Metacritic, OpenCritic, IGN)만, 게임 설명 바로 아래 한 줄에 로고와 함께 나란히 선다.
// 유저 점수는 걷었다 — 스토어마다 재는 방식이 달라(긍정 비율, 별점) 한 줄에 평론 점수와 나란히 두면 같은 잣대로 읽혔다.
// 점수가 없어도 칸 셋은 늘 선다(2026-11-16 사용자). 없는 칸은 흐린 "-" 다 — 칸 수가 게임마다 달라지면 화면이 들쭉날쭉하다.
// IGN 은 2026-10-27 부터 오픈크리틱 리뷰 목록에서 뽑아 온다(adapters/opencritic).
//
// 플레이타임: 이름, 막대, 시간 세 줄(2026-11-23 개편, PlaytimeTiles 주석). 시간당 가격이 붙는 막대 카드(playtime-card)는 따로 남아 있다 —
// 시간당 가격(SHOW_PRICE_PER_HOUR)을 되살릴 때 그 카드가 다시 쓰인다.
import { DETAIL_MESSAGES as D } from "@/lib/games/detail-messages";
import { toPositiveNumber } from "@/lib/price-per-hour";
import { cn } from "@/lib/cn";
import { EmptyLine } from "@/components/game-detail/empty-line";
import { ClockIcon } from "@/components/ui/icons";
import { CriticLogo, type CriticKey } from "@/components/game-detail/critic-logos";
import { scoreLines, type GameDetail, type PlaytimeDto } from "@/server/services/games";

/** 읽는 순서. scoreLines 는 오픈크리틱을 먼저 주지만 화면은 Metacritic 부터다 */
const CRITICS: readonly CriticKey[] = ["metacritic", "opencritic", "ign"];
/** 점수 없는 칸의 큰 글자. 낭독기에는 "점수 없음" 을 읽힌다 */
const NO_SCORE = "-";

export function CriticScores({ game }: { game: GameDetail }) {
  const lines = scoreLines(game.platforms);
  // 점수가 하나도 없어도 칸 셋은 그대로 선다(2026-11-16 사용자 "평점이 없더라도 해당 영역 표기 필요"). "출시 후 표시돼요" 같은 안내 문구는 걷었다
  return (
    // 보이는 이름표 "평론가 점수" 는 걷었다(2026-11-23 사용자 "문구 제거") — 칸마다 매체 로고와 이름이 선다. 낭독기에는 이름을 남긴다
    <section aria-label={D.scoresLabel} className="mt-auto flex flex-col gap-2">
      <dl className="grid grid-cols-3 gap-2">
        {CRITICS.map((key) => {
          const line = lines.find((l) => l.key === key) ?? null;
          return (
            <div key={key} className="flex min-w-0 flex-col gap-2.5 rounded-[var(--radius-md)] bg-surface px-2.5 py-3 shadow-[var(--elev-card)]">
              <dt className="flex min-w-0 flex-col items-start gap-1.5 sm:flex-row sm:items-center">
                <CriticLogo kind={key} size={18} />
                <span className="whitespace-nowrap text-[11px] font-extrabold text-ink-2 max-sm:text-[12px]">{D.scoreLabel[key]}</span>
              </dt>
              <dd className="flex items-baseline leading-none">
                <span className={cn("text-[26px] font-extrabold tracking-[-0.03em]", line ? "text-ink" : "text-dim-2")}>{line ? line.value : NO_SCORE}</span>
                {line?.suffix && <span className="ml-1 text-[12px] font-semibold text-dim">{line.suffix}</span>}
                {!line && <span className="sr-only">{D.scoreNone}</span>}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

const PLAYTIME_KEYS = ["mainStoryHours", "mainExtraHours", "completionistHours"] as const;

/** 이 시간부터는 소수를 떼고 천 단위 쉼표를 찍는다 — "1250.5시간" 은 칸을 넘기고, 100시간 넘는 게임에서 0.5시간은 정보가 아니다 */
const WHOLE_HOURS_FROM = 100;
/** 막대 진하기 — 메인이 가장 진하고 갈수록 옅다(같은 잣대 세 단계) */
const BAR_TONE = ["bg-ink", "bg-ink/60", "bg-ink/30"] as const;
/** 아주 짧은 값도 막대가 보이게 하는 최소 폭(%) — 0 에 가까우면 "값 없음" 과 구별되지 않는다 */
const BAR_MIN_PCT = 4;
/** 시간 숫자 — 소수 첫째 자리까지. HLTB 는 25.5 같은 반 시간을 준다 */
function hoursText(h: number): string {
  if (h >= WHOLE_HOURS_FROM) return Math.round(h).toLocaleString("ko-KR");
  return String(Math.round(h * 10) / 10);
}

export function PlaytimeTiles({ playtime, className }: { playtime: PlaytimeDto | null; className?: string }) {
  const values = PLAYTIME_KEYS.map((k) => ({ key: k, hours: toPositiveNumber(playtime?.[k]) }));
  // 값이 하나도 없으면 판 대신 한 줄(game-detail/empty-line, 2026-10-27 사용자 검수: 빈 판이 많다).
  // 부르는 쪽의 늘리기(flex-1)도 받지 않는다 — 안내 한 줄이 옆 칸 높이만큼 비어 늘어났다(2026-10-26)
  if (values.every((v) => v.hours === null)) {
    return (
      <EmptyLine id="playtime-heading" icon={<ClockIcon size={17} />} title={D.playtimeTitle}>
        {D.playtimeEmpty}
      </EmptyLine>
    );
  }
  const max = Math.max(...values.map((v) => v.hours ?? 0));
  return (
    // 2026-11-23 사용자 "플레이타임 표현 방식 UI/UX 개선": 큰 숫자 세 칸은 바로 옆 평론 점수 세 칸과 꼴이 같아 둘이 한 묶음처럼 읽혔고,
    // 세 값의 차이("완벽하게는 메인의 몇 배") 는 숫자를 빼 봐야 알았다. 이름, 가장 긴 값에 맞춘 막대, 시간을 한 줄씩 세 줄로 바꿨다.
    // 막대 색은 먹색 한 가지를 진하기로 가른다 — 같은 게임의 같은 잣대라 색을 갈라 다른 것처럼 보일 이유가 없다(파랑 남발 금지).
    <section aria-labelledby="playtime-heading" className={cn("flex flex-col gap-3 rounded-[var(--radius-panel)] bg-surface p-4 shadow-[var(--elev-card)]", className)}>
      <h2 id="playtime-heading" className="flex items-center gap-1.5 text-[15px] font-extrabold text-ink">
        <ClockIcon size={16} className="text-mut" />
        {D.playtimeTitle}
      </h2>
      <dl className="flex flex-col gap-2">
        {values.map((v, i) => (
          <div key={v.key} className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-2.5">
            <dt className="truncate text-[12px] text-mut">{D.playtimeItems[v.key]}</dt>
            <span aria-hidden className="h-2 overflow-hidden rounded-full bg-surface-2">
              {v.hours !== null && max > 0 && (
                <span className={cn("block h-full rounded-full", BAR_TONE[i])} style={{ width: `${Math.max((v.hours / max) * 100, BAR_MIN_PCT)}%` }} />
              )}
            </span>
            <dd className="min-w-[64px] whitespace-nowrap text-right font-extrabold leading-none tracking-[-0.02em] text-ink">
              {v.hours === null ? (
                <span className="text-[15px] text-dim-2">-</span>
              ) : (
                <>
                  <span className="text-[15px]">{hoursText(v.hours)}</span>
                  <small className="ml-0.5 text-[11.5px] font-bold tracking-normal text-mut">{D.playtimeUnit}</small>
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
