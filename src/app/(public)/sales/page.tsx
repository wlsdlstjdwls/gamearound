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
import { Card, Page, SectionHead, cardClass } from "@/components/ui/page";
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

function SaleCard({ item, index }: { item: UpcomingSale; index: number }) {
  const running = item.status === "running";
  return (
    <li className="enter-item" style={stagger(index)}>
      <Card className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1.5">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h3 className="text-[17px] font-bold tracking-[-0.02em] text-ink">{item.sale.name}</h3>
            {running ? (
              <span className="rounded-[5px] bg-acc-soft px-1.5 py-0.5 text-[11.5px] font-semibold text-acc">
                {M.running}
              </span>
            ) : (
              <span className="rounded-[5px] bg-surface-2 px-1.5 py-0.5 text-[11.5px] font-semibold text-ink-2">
                {M.estimated}
              </span>
            )}
          </div>
          <span className="text-[12.5px] text-mut">
            {formatDate(item.startsAt)} ~ {formatDate(item.endsAt)}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[12px] text-dim">{running ? M.untilEnd : M.untilStart}</span>
          <Countdown targetIso={targetOf(item).toISOString()} />
        </div>

        <p className="text-[13px] leading-relaxed text-mut">{item.sale.description}</p>
      </Card>
    </li>
  );
}

export default function SalesPage() {
  // 요청 시각으로 센다. 캐시된 화면이 오래되면 남은 일수가 실제보다 길게 보일 수 있으나,
  // 초 단위 값은 클라이언트가 다시 세므로 마운트 직후 바로 맞춰진다.
  const upcoming = upcomingSales(new Date());
  const inactive = inactiveSales();

  return (
    <Page gap={20}>
      <SectionHead
        as="h1"
        title={M.title}
        note={M.note}
        action={
          <Link href={gamesHref({}, { onSale: true })} className={buttonClass({ variant: "ghost", size: "sm" })}>
            {M.browseGames}
          </Link>
        }
      />

      <p className="text-[13.5px] leading-relaxed text-mut">{M.lead}</p>

      <ul className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        {upcoming.map((item, i) => (
          <SaleCard key={item.sale.key} item={item} index={i} />
        ))}
      </ul>

      <p className={cardClass("bg-surface-2 p-4 text-[12.5px] leading-relaxed text-dim")}>{M.basis}</p>

      {inactive.length > 0 && (
        <section className="flex flex-col gap-2">
          <SectionHead title={M.inactiveHead} />
          <ul className="flex flex-col gap-2">
            {inactive.map((s) => (
              <li key={s.key} className={cardClass("flex flex-col gap-1 px-4 py-3.5")}>
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
