// 상세 히어로의 숫자 두 묶음 — 평점 카드(목업 .critw)와 플레이타임 3칸(목업 .pt).
//
// 평점(2026-11-16 사용자): 평론 매체 셋(Metacritic, OpenCritic, IGN)만, 게임 설명 바로 아래 한 줄에 로고와 함께 나란히 선다.
// 유저 점수는 걷었다 — 스토어마다 재는 방식이 달라(긍정 비율, 별점) 한 줄에 평론 점수와 나란히 두면 같은 잣대로 읽혔다.
// 점수가 없어도 칸 셋은 늘 선다(2026-11-16 사용자). 없는 칸은 흐린 "-" 다 — 칸 수가 게임마다 달라지면 화면이 들쭉날쭉하다.
// IGN 은 2026-10-27 부터 오픈크리틱 리뷰 목록에서 뽑아 온다(adapters/opencritic).
//
// 플레이타임: 큰 숫자 세 칸 + 칸마다 얇은 막대(2026-11-23, PlaytimeTiles 주석). 시간당 가격이 붙는 막대 카드(playtime-card)는 따로 남아 있다 —
// 시간당 가격(SHOW_PRICE_PER_HOUR)을 되살릴 때 그 카드가 다시 쓰인다.
import { DETAIL_MESSAGES as D } from "@/lib/games/detail-messages";
import { toPositiveNumber } from "@/lib/price-per-hour";
import { cn } from "@/lib/cn";
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

/** 빈 판 막대의 길이(%) — 메인 스토리, 메인 + 서브, 완전 정복의 보통 비례. 그림일 뿐 값이 아니다 */
const WAIT_BAR_PCT = [45, 70, 100] as const;
/** 세 막대가 차오르는 시차 — 위에서 아래로 차례로 */
const WAIT_STAGGER_MS = 350;

/**
 * 바늘이 도는 작은 시계(빈 플레이타임 판의 문구 앞). 긴바늘은 한 바퀴 4초, 짧은바늘은 그 열두 배 — 실제 시계와 같은 비례다.
 * 움직임은 globals.css 의 .clock-hand 이고 움직임 줄이기 설정이면 전역 킬스위치가 멈춘다
 */
function PlaytimeClock() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round">
      <circle cx="12" cy="12" r="9.5" strokeWidth="2" />
      <line x1="12" y1="12" x2="12" y2="7.5" strokeWidth="2.4" className="clock-hand clock-hand-hour" />
      <line x1="12" y1="12" x2="12" y2="5" strokeWidth="2" className="clock-hand" />
    </svg>
  );
}

/** 천 시간 넘는 값(MMO)이 하나라도 있으면 숫자를 한 단계 작게 — 세 칸 폭에서 "1,250시간" 이 넘친다 */
const LONG_HOURS_FROM = 1000;

/**
 * 플레이타임 — 세 칸 가로(메인 스토리 | 메인 + 서브 | 완전 정복). 2026-11-23 사용자: 세로 세 줄(이름, 막대, 시간)로 바꿨다가
 * "여전히 보기 그래, 이전처럼 3열이 나을 듯" — 큰 숫자 세 칸으로 되돌렸다. 대신 칸마다 숫자 밑에 얇은 막대를 남긴다:
 * 가장 긴 값에 맞춘 길이라 "완전 정복은 메인의 몇 배" 가 숫자를 빼 보지 않아도 보인다(세로 줄 판에서 얻은 것 하나).
 * 값이 없으면 같은 세 칸에 흐린 "-" 와 천천히 차오르는 막대(playtime-wait), 밑에 도는 시계와 문구 — 같은 날 사용자 "없을 때 표현 아주 좋다"
 */
export function PlaytimeTiles({ playtime, className }: { playtime: PlaytimeDto | null; className?: string }) {
  const values = PLAYTIME_KEYS.map((k) => ({ key: k, hours: toPositiveNumber(playtime?.[k]) }));
  const empty = values.every((v) => v.hours === null);
  const max = Math.max(...values.map((v) => v.hours ?? 0));
  const longHours = values.some((v) => v.hours !== null && v.hours >= LONG_HOURS_FROM);
  return (
    // 글자 크기는 화면 폭이 아니라 이 판 폭으로 정한다(@container) — 옆 기둥에 서면 넓은 화면에서도 세 칸이 좁다(2026-11-10)
    <section aria-labelledby="playtime-heading" className={cn("@container flex flex-col gap-3 rounded-[var(--radius-panel)] bg-surface p-4 shadow-[var(--elev-card)]", className)}>
      <h2 id="playtime-heading" className="flex items-center gap-1.5 text-[15px] font-extrabold text-ink">
        <ClockIcon size={16} className="text-mut" />
        {D.playtimeTitle}
      </h2>
      <dl className="grid grid-cols-3 border-t border-line pt-3">
        {values.map((v, i) => (
          <div key={v.key} className={cn("flex min-w-0 flex-col gap-1.5 px-2.5", i === 0 ? "pl-0" : "border-l border-line", i === values.length - 1 && "pr-0")}>
            <dt className="truncate text-[12px] leading-[1.4] text-mut">{D.playtimeItems[v.key]}</dt>
            <dd className="flex min-w-0 flex-col gap-2">
              <span
                className={cn(
                  "whitespace-nowrap font-extrabold leading-none tracking-[-0.03em]",
                  v.hours === null ? "text-dim-2" : "text-ink",
                  longHours ? "text-[16px] @[22rem]:text-[20px]" : "text-[20px] @[22rem]:text-[24px]",
                )}
              >
                {v.hours === null ? "-" : hoursText(v.hours)}
                {v.hours !== null && <small className="ml-0.5 text-[12px] font-bold tracking-normal text-mut">{D.playtimeUnit}</small>}
              </span>
              <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                {empty ? (
                  <span
                    className="playtime-wait block h-full rounded-full bg-line-strong"
                    style={{ width: `${WAIT_BAR_PCT[i]}%`, "--stagger": `${i * WAIT_STAGGER_MS}ms` } as React.CSSProperties}
                  />
                ) : (
                  v.hours !== null &&
                  max > 0 && (
                    <span
                      className={cn("playtime-grow block h-full rounded-full", BAR_TONE[i])}
                      style={{ width: `${Math.max((v.hours / max) * 100, BAR_MIN_PCT)}%`, "--stagger": `${i * WAIT_STAGGER_MS}ms` } as React.CSSProperties}
                    />
                  )
                )}
              </span>
            </dd>
          </div>
        ))}
      </dl>
      {empty && (
        <p className="flex items-center gap-1.5 text-[12.5px] text-dim">
          <PlaytimeClock />
          {D.playtimeEmpty}
        </p>
      )}
    </section>
  );
}
