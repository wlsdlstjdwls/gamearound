// 할인 예측 판(기획서 v2.0 S-05, 목업 .pred). 계산은 lib/sales/forecast, 여기는 보여 주기만 한다.
// 순서가 곧 뜻이다: 지금 할인 중이면 그것부터, 그다음 다음 할인까지 며칠, 마지막으로 그때 값의 ±10% 폭.
// 맞히는 값이 아니라 "기다리면 이 정도" 라 근거(공지된 일정, 예년 일정, 이 게임의 지난 주기, 기록 최저가, 최대 할인율)를 같이 적는다.
//
// 2026-10-26 결론 기둥의 작은 두 칸에서 가격 그래프 옆 판으로 옮겼다(목업). 그래프가 "지난 값" 을, 이 판이 "다음 값" 을 말해
// 둘이 한 줄에 서야 읽힌다. "알림 설정하기" 는 가격 알림 팝업(M-02)이라 화면이 버튼을 넘긴다.
//
// 2026-11-11 사용자 "그림이나 UI 로 가시성 높게": 문장 넷이 같은 크기로 늘어서 무엇이 답인지 안 보였다.
// 같은 날 둘째 손질: 언제와 얼마를 흰 칸 하나로 섞고(아래 Plan), 기록 최저가 점 하나 막대는 뜻이 안 읽혀 "지금 값 대 그때 값" 막대 두 줄로 바꿨다.
// 근거 문장은 딱지와 칸 밑 작은 글로 줄였다.
import { formatPrice } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { DETAIL_MESSAGES as D } from "@/lib/games/detail-messages";
import type { Forecast } from "@/lib/sales/forecast";
import { CalendarIcon, ChartIcon } from "@/components/ui/icons";
import { FloatingIcon } from "@/components/ui/floating-icon";
import { Tag } from "@/components/ui/tag";
import { cn } from "@/lib/cn";
import type { Currency } from "@/server/db/schema";

/** 값 막대 한 줄. 폭은 견줄 값(cap) 대비 비율이라 0원에서 선다 — 축을 자르면 차이가 실제보다 커 보인다 */
function PriceBar({ label, value, tone, children }: { label: string; value: React.ReactNode; tone: "now" | "sale"; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-2 text-[12.5px]">
        <span className="font-semibold text-mut">{label}</span>
        <b className={cn("font-extrabold tabular-nums", tone === "sale" ? "text-[14px] text-danger" : "text-ink")}>{value}</b>
      </div>
      <div aria-hidden className="relative h-2.5 overflow-hidden rounded-full bg-line-soft">
        {children}
      </div>
    </div>
  );
}

const pctOf = (v: number, cap: number) => `${Math.min(100, (v / cap) * 100)}%`;

/**
 * 언제와 얼마를 흰 칸 하나에(2026-11-11 사용자 "두 개를 잘 섞어서"). 머리에 D-숫자와 아끼는 값을 한 줄로 —
 * "37일 기다리면 약 1만 4천원" 이 이 판의 결론이다. 그 밑 막대 두 줄이 그 결론의 근거(지금 값 대 그때 값)다.
 * 그때 값은 점 하나(기록 최저가)다. ±10% 폭(lib/sales/forecast 의 low, high)은 계산에 남기되 그리지 않는다 —
 * 같은 날 사용자 "오차 범위는 없어도 될 듯, 최저가 표기만". 폭 두 숫자와 옅은 막대가 결론을 흐렸다.
 */
function Plan({ next, expected, running, currency }: { next: Forecast["next"]; expected: Forecast["expected"]; running: boolean; currency: Currency }) {
  const tag = next ? (next.basis === "cycle" ? D.forecastCycleTag(next.cycleDays ?? 0) : D.forecastBasisTag[next.basis]) : null;
  const save = expected ? D.forecastSave(formatPrice(expected.cap - expected.price, currency)) : null;
  return (
    // 흰 칸이 판의 남는 높이를 먹고 내용은 가운데에 선다(flex-1, justify-center) — 판이 그래프 높이로 늘어날 때 빈자리가
    // 흰 칸과 단추 사이에 파란 면으로 크게 남았다(2026-11-11 사용자 "높이 고정 아니었니, 어케 해줘", 기록 없는 엘든 링)
    <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 rounded-[var(--radius-panel)] bg-surface-2/60 p-4">
      {next && (
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <span className="text-[13px] font-bold text-mut">{D.forecastWhenHead(next.name)}</span>
          {tag && <Tag tone="neutral">{tag}</Tag>}
        </div>
      )}
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-x-3 gap-y-1">
        {/* 다음 할인 날을 모를 때의 "아직 알 수 없어요" 줄은 걷었다(2026-11-23 사용자 "문구 제거") — 아래 값 줄만 선다 */}
        {next && (
          <p className="text-[40px] font-black leading-none tracking-[-0.03em] text-ink tabular-nums">
            <span aria-hidden>{D.forecastDday(next.daysUntil)}</span>
            <span className="sr-only">{D.forecastDdaySr(next.daysUntil)}</span>
          </p>
        )}
        {save && (
          <p className="text-[14px] font-bold text-ink">
            {save.before}
            <b className="text-[17px] font-extrabold text-danger tabular-nums">{save.amount}</b>
            {save.after}
          </p>
        )}
      </div>
      {expected ? (
        <div className="flex min-w-0 flex-col gap-3 border-t border-line-soft pt-3">
          <PriceBar label={running ? D.forecastAfterRunLabel : D.forecastNowLabel} value={formatPrice(expected.cap, currency)} tone="now">
            <span className="absolute inset-y-0 left-0 w-full rounded-full bg-line-strong" />
          </PriceBar>
          <PriceBar
            label={D.forecastSaleLabel(next?.name ?? null)}
            value={formatPrice(expected.price, currency)}
            tone="sale"
          >
            <span className="absolute inset-y-0 left-0 rounded-full bg-ink-2" style={{ width: pctOf(expected.price, expected.cap) }} />
          </PriceBar>
          <p className="text-[11.5px] leading-[1.5] text-dim max-sm:text-[12.5px]">
            {expected.basis === "recorded-low"
              ? D.forecastBasisLow(formatDate(expected.at))
              : D.forecastBasisRate(expected.pct)}
          </p>
        </div>
      ) : (
        <p className="text-[13.5px] text-mut">{D.forecastNoRecord.join(" ")}</p>
      )}
    </div>
  );
}

// 2026-11-23 사용자 "할인 예측이 아직도 다 파란색이라 눈 아프다": 판 안의 파랑(아이콘 면, 기준 플랫폼, D-데이, 막대, 확정 꼬리표)을 걷었다.
// 숫자와 막대는 먹색, 돈 이야기(할인가, 아끼는 돈)만 빨강 — 가격 비교의 빨강 할인율과 같은 뜻의 같은 색이다. 파랑은 판 밑 단추에만 남는다.
export function DiscountForecast({
  forecast,
  currency,
  action,
  basisLabel,
}: {
  /** null 이면 날짜도 기록도 없다 — 같은 판에 흰 칸 대신 한 줄만 말한다(아래 empty) */
  forecast: Forecast | null;
  currency: Currency;
  action?: React.ReactNode;
  /** 고른 플랫폼 이름(game-detail/forecast-by-platform). 주면 제목 옆에 "PlayStation 기준" 이 선다 */
  basisLabel?: string;
}) {
  const running = forecast?.running ?? null;
  const next = forecast?.next ?? null;
  const expected = forecast?.expected ?? null;
  // 말할 것이 하나도 없어도 판 모양(머리, 높이)은 그대로 둔다(2026-11-11 사용자 "예측 없으면 높이가 줄고 타이틀도 묘하게 다르다").
  // 10-27 에는 한 줄(EmptyLine)로 접었는데, 플랫폼 카드를 고를 때마다 판이 줄었다 늘었다 하고 머리 모양이 바뀌었다.
  // 흰 칸 자리에 한 줄만 말하고, 참고용 안내 문단은 예측이 없으니 뺀다. 알림 단추는 남긴다 — 예측이 없어도 "싸지면 알려 달라" 는 할 수 있다
  const empty = !running && !next && !expected;
  return (
    // 판은 옆 가격 그래프 높이까지 늘어난다(부르는 쪽 격자가 늘이고, h-full 로 받는다, 2026-11-11 사용자 "높이를 가격 변동 추이와 맞춰").
    // 머리는 아이콘 오른쪽에 제목이 선다(같은 날 사용자). 참고용 알림은 판 안 맨 밑이다 — 판 밖 회색 글은 판과 따로 노는 줄로 읽혔다
    <section
      aria-labelledby="forecast-heading"
      // 2026-11-16 색 줄이기: 연파랑 면 + 굵은 파랑 테두리를 걷고 옆 그래프 판과 같은 흰 판이다. 파랑은 안의 값, 단추에만 남긴다
      className="flex h-full flex-col gap-3 rounded-[var(--radius-panel)] bg-surface p-5 shadow-[var(--elev-card)]"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 text-mut">
          <CalendarIcon size={20} />
        </span>
        <h2 id="forecast-heading" className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-[17px] font-extrabold text-ink">
          {D.forecastTitle}
          {basisLabel && <span className="text-[12.5px] font-bold text-mut">{D.forecastBasisPlatform(basisLabel)}</span>}
        </h2>
      </div>
      {/* 진행 중 할인 — 기다릴 일보다 지금 살 수 있다는 말이 먼저다. 채운 파랑 면은 걷었다(2026-11-23 사용자 "파란 배경이 도배돼 눈이 아프다").
          옅은 회색 면에 먹색 글자, 할인율만 빨강 — 플랫폼별 가격 비교의 빨강 할인율과 같은 색이다 */}
      {running && (
        <p className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-[var(--radius-panel)] bg-surface-2 px-4 py-2.5 text-ink">
          <span className="text-[14px] font-bold">
            {D.forecastRunningNow(running.name)} <b className="font-black tabular-nums text-danger">-{running.pct}%</b>
          </span>
          {/* 남은 날은 D-데이(2026-11-23 사용자 "11일 뒤 끝나요 를 D데이로") — 낭독기에는 문장으로 */}
          {running.daysLeft !== null && (
            <span className="text-[13px] font-extrabold tabular-nums text-ink-2">
              <span aria-hidden>{D.forecastDday(running.daysLeft)}</span>
              <span className="sr-only">{D.forecastRunningLeftShort(running.daysLeft)}</span>
            </span>
          )}
        </p>
      )}
      {empty ? (
        // 아이콘 모션을 함께 띄운다(2026-11-23 사용자 "아이콘도 같이 나오게 모션그래픽") — 가격 카드의 빈 칸과 같은 부품(ui/floating-icon)
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-2 rounded-[var(--radius-panel)] bg-surface-2/60 p-4 text-center text-[13.5px] leading-[1.6] text-mut">
          <FloatingIcon>
            <ChartIcon size={20} />
          </FloatingIcon>
          <p>
            {D.forecastNoRecord.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </p>
        </div>
      ) : (
        <Plan next={next} expected={expected} running={running !== null} currency={currency} />
      )}
      {/* 단추와 알림은 판 바닥에 붙는다 — 늘어난 높이는 위 흰 칸(Plan)이 받는다 */}
      <div className="mt-auto flex flex-col gap-3 pt-1">
        {action && <div className="flex w-full [&>*]:flex-1">{action}</div>}
        {!empty && (
          <p className="text-[12px] leading-[1.6] text-mut">
            {D.forecastDisclaimer.map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
          </p>
        )}
      </div>
    </section>
  );
}
