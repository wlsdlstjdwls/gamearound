// 상세 히어로의 숫자 두 묶음 — 평점 카드(목업 .critw)와 플레이타임 3칸(목업 .pt).
//
// 평점(2026-11-16 사용자): 평론 매체 셋(Metacritic, OpenCritic, IGN)만, 게임 설명 바로 아래 한 줄에 로고와 함께 나란히 선다.
// 유저 점수는 걷었다 — 스토어마다 재는 방식이 달라(긍정 비율, 별점) 한 줄에 평론 점수와 나란히 두면 같은 잣대로 읽혔다.
// 셋 중 하나라도 있으면 셋 다 세운다. 없는 매체는 "-" 대신 "점수 없음" 으로 말한다 — 한 줄의 칸 수가 게임마다 달라지면 줄이 들쭉날쭉하다.
// IGN 은 2026-10-27 부터 오픈크리틱 리뷰 목록에서 뽑아 온다(adapters/opencritic).
//
// 플레이타임: 목업은 막대 대신 큰 숫자 셋이다. 막대 카드(playtime-card)는 지우지 않고 남겨 두었다 —
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

export function CriticScores({ game, unreleased }: { game: GameDetail; unreleased: boolean }) {
  const lines = scoreLines(game.platforms);
  const known = CRITICS.map((key) => ({ key, line: lines.find((l) => l.key === key) ?? null }));
  return (
    <section aria-labelledby="scores-heading" className="flex flex-col gap-2">
      <h2 id="scores-heading" className="sr-only">
        {D.scoresLabel}
      </h2>
      {known.every((k) => k.line === null) ? (
        // 출시 전이면 "아직 못 모았다" 가 아니라 "출시하면 생긴다" 가 맞는 말이다(기획서 v2.0 S-05)
        <p className="text-[13px] text-dim">{unreleased ? D.scoresAfterRelease : D.scoresPending}</p>
      ) : (
        <dl className="grid grid-cols-3 gap-2">
          {known.map(({ key, line }) => (
            <div key={key} className="flex min-w-0 items-center gap-2 rounded-[var(--radius-md)] bg-surface px-3 py-2.5 shadow-hair">
              <CriticLogo kind={key} size={24} />
              <div className="flex min-w-0 flex-col">
                <dt className="truncate text-[11.5px] font-semibold text-mut">{D.scoreLabel[key]}</dt>
                <dd className={cn("leading-none tracking-[-0.03em]", line ? "text-[20px] font-extrabold text-ink" : "pt-1 text-[12px] text-dim")}>
                  {line ? line.value : D.scoreNone}
                  {line?.suffix && <span className="ml-0.5 text-[11px] font-semibold tracking-normal text-dim">{line.suffix}</span>}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

const PLAYTIME_KEYS = ["mainStoryHours", "mainExtraHours", "completionistHours"] as const;

/** 이 시간부터는 소수를 떼고 천 단위 쉼표를 찍는다 — "1250.5시간" 은 칸을 넘기고, 100시간 넘는 게임에서 0.5시간은 정보가 아니다 */
const WHOLE_HOURS_FROM = 100;
/** 네 자리(천 단위 쉼표 포함) 값. 세 칸 한 칸 폭(약 90px)에 기본 크기로는 안 들어간다 */
const LONG_HOURS_FROM = 1000;

/** 시간 숫자 — 소수 첫째 자리까지. HLTB 는 25.5 같은 반 시간을 준다 */
function hoursText(h: number): string {
  if (h >= WHOLE_HOURS_FROM) return Math.round(h).toLocaleString("ko-KR");
  return String(Math.round(h * 10) / 10);
}

export function PlaytimeTiles({ playtime, className }: { playtime: PlaytimeDto | null; className?: string }) {
  const values = PLAYTIME_KEYS.map((k) => ({ key: k, hours: toPositiveNumber(playtime?.[k]) }));
  const longHours = values.some((v) => v.hours !== null && v.hours >= LONG_HOURS_FROM);
  // 값이 하나도 없으면 판 대신 한 줄(game-detail/empty-line, 2026-10-27 사용자 검수: 빈 판이 많다).
  // 부르는 쪽의 늘리기(flex-1)도 받지 않는다 — 안내 한 줄이 옆 칸 높이만큼 비어 늘어났다(2026-10-26)
  if (values.every((v) => v.hours === null)) {
    return (
      <EmptyLine id="playtime-heading" icon={<ClockIcon size={17} />} title={D.playtimeTitle}>
        {D.playtimeEmpty}
      </EmptyLine>
    );
  }
  return (
    // 글자 크기는 화면 폭이 아니라 이 판 폭으로 정한다(@container). 판이 옆 기둥에 서면 넓은 화면에서도 세 칸이 좁아
    // "25.1시간" 이 숫자와 단위로 두 줄에 갈렸다(2026-11-10 사용자). 숫자와 단위는 한 덩어리로 묶어 접히지 않게 한다
    <section aria-labelledby="playtime-heading" className={cn("@container flex flex-col gap-3 rounded-[var(--radius-panel)] bg-surface p-4 shadow-[var(--elev-card)] sm:p-5", className)}>
      <h2 id="playtime-heading" className="flex items-center gap-1.5 text-[16px] font-extrabold text-ink">
        <ClockIcon size={17} className="text-acc" />
        {D.playtimeTitle}
      </h2>
      {/* 칸 사이 세로선은 목업 그대로 둔다 — 칸 수가 늘 셋이라 2026-09-21 의 "칸 수에 따라 선이 달라진다" 문제가 없다.
          세 칸은 상세 옆 기둥(안쪽 약 292px)과 390폭 휴대폰(약 303px)에서도 지킨다 — 거기서 줄로 세웠더니 목록처럼 보여 사용자가 싫어했다(2026-11-10).
          대신 칸 여백을 줄이고 글자 크기를 판 폭에 맞춘다. 천 시간 넘는 값(MMO)이 하나라도 있으면 한 단계 작게 쓴다 */}
      <dl className="grid flex-1 grid-cols-1 content-center gap-2 border-t border-line pt-3 @[15rem]:grid-cols-3 @[15rem]:gap-0">
        {values.map((v, i) => (
          <div
            key={v.key}
            className={cn(
              "flex min-w-0 items-baseline justify-between gap-2 @[15rem]:flex-col @[15rem]:items-start @[15rem]:justify-start @[15rem]:gap-1.5 @[15rem]:px-2",
              i === 0 ? "@[15rem]:pl-0" : "@[15rem]:border-l @[15rem]:border-line",
            )}
          >
            <dt className="text-[12px] leading-[1.4] text-mut">{D.playtimeItems[v.key]}</dt>
            <dd
              className={cn(
                "whitespace-nowrap font-extrabold leading-none tracking-[-0.03em] text-ink",
                longHours ? "text-[16px] @[26rem]:text-[20px] @[32rem]:text-[24px]" : "text-[20px] @[26rem]:text-[24px] @[32rem]:text-[28px]",
              )}
            >
              {v.hours === null ? <span className="text-dim-2">-</span> : hoursText(v.hours)}
              {v.hours !== null && <small className="ml-0.5 text-[12px] font-bold tracking-normal">{D.playtimeUnit}</small>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
