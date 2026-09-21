// 다음 세일 화면 — "지금 살까, 기다릴까" 에 답하는 축.
//
// DB 도 외부 호출도 없다. lib/sales/calendar 가 상수 규칙으로 다음 회차를 계산할 뿐이다.
// 그래서 서비스 계층을 두지 않았다 — 돌려줄 DTO 도, 스키마가 바뀔 일도 없다.
//
// 캐시가 길어도 되는 이유: 일정은 하루 단위로만 움직인다.
// 초 단위로 움직이는 카운트다운은 클라이언트가 따로 센다(components/sales/countdown).
import type { Metadata } from "next";
import Link from "next/link";
import { Countdown } from "@/components/sales/countdown";
import { buttonClass } from "@/components/ui/button";
import { Page, PageHead, ROW, ROWS, SectionHead } from "@/components/ui/page";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { gamesHref } from "@/lib/games-query";
import { stagger } from "@/lib/motion";
import { inactiveSales, upcomingSales, type UpcomingSale } from "@/lib/sales/calendar";
import { SALES_MESSAGES as M } from "@/lib/sales/messages";

// Next 가 정적으로 읽는 값이라 리터럴이어야 한다 — lib/cache 의 LIST_REVALIDATE_SECONDS 와 같게 유지
export const revalidate = 3600;

export const metadata: Metadata = {
  title: M.title,
  description: M.lead,
};

/** 진행 중이면 종료 시각, 아니면 시작 시각 — 카운트다운이 세어야 할 목표 */
function targetOf(item: UpcomingSale): Date {
  return item.status === "running" ? item.endsAt : item.startsAt;
}

/**
 * 진행 중인 회차 — 이 화면의 결론이다.
 *
 * 연한 브랜드 면을 깐 유일한 자리(2026-09-21 리디자인). "지금 살까, 기다릴까" 에 답이 이미 나와 있는
 * 경우가 이것 하나라서다 — 지금 세일이 돌고 있으면 나머지 일정은 읽을 필요가 없다.
 * 예정 회차는 아래 헤어라인 줄이 받는다.
 */
function RunningSale({ item }: { item: UpcomingSale }) {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[12px] font-bold tracking-[0.08em] text-acc">{M.running}</h2>
        <p className="text-[12.5px] text-mut">{M.untilEnd}</p>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 rounded-[var(--radius-cover-lg)] bg-acc-soft px-6 py-6 sm:px-[26px]">
        <div className="min-w-0">
          <h3 className="text-[22px] font-extrabold tracking-[-0.04em] text-ink sm:text-[26px]">{item.sale.name}</h3>
          <p className="mt-1.5 text-[13px] text-mut">
            {formatDate(item.startsAt)} ~ {formatDate(item.endsAt)} | {item.source === "confirmed" ? M.confirmed : M.estimated}
          </p>
          <p className="mt-2.5 max-w-[520px] text-[13px] leading-[1.7] text-mut">{item.sale.description}</p>
        </div>
        <Countdown targetIso={targetOf(item).toISOString()} size="hero" />
      </div>
    </div>
  );
}

/** 예정 회차 한 줄 — 이름과 기간은 왼쪽, 남은 시간은 오른쪽 기둥에 모인다 */
function SaleRow({ item, index }: { item: UpcomingSale; index: number }) {
  return (
    <li className="enter-item" style={stagger(index)}>
      <div className={cn(ROW, "flex flex-wrap items-center gap-x-4 gap-y-2 py-[15px]")}>
        <div className="flex min-w-0 flex-1 basis-[240px] flex-col gap-1">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <h3 className="text-[15px] font-bold tracking-[-0.02em] text-ink">{item.sale.name}</h3>
            {/* 확정과 예상을 눈으로 갈라 준다 — 예상 날짜를 믿고 구매를 미루면 손해를 본다 */}
            <span
              className={
                item.source === "confirmed"
                  ? "shrink-0 rounded-full bg-surface-2 px-2 py-[2px] text-[11.5px] font-semibold text-ink-2"
                  : "shrink-0 rounded-full border border-dashed border-line-strong px-2 py-[2px] text-[11.5px] font-semibold text-dim"
              }
            >
              {item.source === "confirmed" ? M.confirmed : M.estimated}
            </span>
          </div>
          <p className="text-[12.5px] text-mut">
            {formatDate(item.startsAt)} ~ {formatDate(item.endsAt)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="text-[12px] text-dim">{M.untilStart}</span>
          <Countdown targetIso={targetOf(item).toISOString()} />
        </div>
      </div>
    </li>
  );
}

export default function SalesPage() {
  // 요청 시각으로 센다. 캐시된 화면이 오래되면 남은 일수가 실제보다 길게 보일 수 있으나,
  // 초 단위 값은 클라이언트가 다시 세므로 마운트 직후 바로 맞춰진다.
  const upcoming = upcomingSales(new Date());
  const inactive = inactiveSales();
  // 진행 중인 회차는 하나만 크게 세우고 나머지는 줄로 흘린다 — 둘을 같은 모양으로 두면
  // "지금 살 수 있는 세일" 과 "언젠가 올 세일" 이 같은 무게로 읽힌다
  const running = upcoming.find((u) => u.status === "running") ?? null;
  const pending = upcoming.filter((u) => u.status !== "running");

  return (
    <Page gap={30}>
      <PageHead
        title={M.title}
        action={
          <Link href={gamesHref({}, { onSale: true })} className={buttonClass({ variant: "secondary", className: "rounded-full" })}>
            {M.browseGames}
          </Link>
        }
      >
        <p className="w-full max-w-[620px] text-[13.5px] leading-[1.7] text-mut">{M.lead}</p>
      </PageHead>

      {running && <RunningSale item={running} />}

      {pending.length > 0 && (
        <section className="flex flex-col gap-3.5">
          <h2 className="text-[12px] font-bold tracking-[0.08em] text-dim">{M.upcomingHead}</h2>
          <ul className={ROWS}>
            {pending.map((item, i) => (
              <SaleRow key={item.sale.key} item={item} index={i} />
            ))}
          </ul>
        </section>
      )}

      <p className="max-w-[760px] rounded-xl bg-surface-2 px-[18px] py-4 text-[12.5px] leading-[1.8] text-mut">{M.basis}</p>

      {inactive.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHead title={M.inactiveHead} size="sub" />
          <ul className={ROWS}>
            {inactive.map((s) => (
              <li key={s.key} className="flex flex-col gap-0.5 py-[13px]">
                <span className="text-[14px] font-semibold text-mut">{s.name}</span>
                <span className="text-[12.5px] text-dim">{s.inactiveReason}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Page>
  );
}
