// 명예의 전당(기획서 v2.0 S-08). 탭 둘:
//   이번 달 주목작 — 월 선택(기본 이번 달). 1위는 큰 히어로, 2~3위 카드, 4~10위 줄. 이번 달은 실시간 잠정 순위다.
//   역대 선정작 — 확정된 달마다 1위 한 줄. 줄을 누르면 게임 상세가 아니라 그 달 TOP 10 으로 간다.
// 탭, 달은 주소(?tab=, ?ym=)에 실린다. 점수 식은 lib/indie/fame.
import type { Metadata } from "next";
import Link from "next/link";
import { DbUnavailable } from "@/components/db-unavailable";
import { EmptyState } from "@/components/empty-state";
import { FadeImage } from "@/components/ui/fade-image";
import { NavChip, NavPendingScope, PendingRegion } from "@/components/ui/nav-pending";
import { Page, PageHead, SectionHead } from "@/components/ui/page";
import { Tag } from "@/components/ui/tag";
import { nullIfDbUnavailable } from "@/lib/db-errors";
import { FAME_MESSAGES as M, isYm, kstYm, prevYm, ymLabel } from "@/lib/indie/fame";
import { stagger } from "@/lib/motion";
import { indiePath, ROUTES } from "@/lib/routes";
import { getMonthRanking, listHallHistory, type RankedIndie } from "@/server/services/indie";

export const revalidate = 300;

export const metadata: Metadata = { title: M.hofTitle, description: M.hofLead };

/** 월 선택에 세우는 달 수 — 이번 달 포함 반년 */
const MONTH_CHOICES = 6;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function href(tab: "month" | "history", ym?: string): string {
  const p = new URLSearchParams();
  if (tab === "history") p.set("tab", "history");
  if (ym) p.set("ym", ym);
  const qs = p.toString();
  return qs ? `${ROUTES.hallOfFame}?${qs}` : ROUTES.hallOfFame;
}

function Cover({ item, sizes }: { item: RankedIndie; sizes: string }) {
  return (
    <span className="relative block aspect-[460/215] w-full overflow-hidden rounded-[var(--radius-cover)] bg-surface-3">
      <FadeImage src={item.card.cover.url} alt="" fill sizes={sizes} className="object-cover" />
    </span>
  );
}

function Ranking({ items, label, finalized }: { items: RankedIndie[]; label: string; finalized: boolean }) {
  if (items.length === 0) return <EmptyState title={M.empty} description={M.emptyLead} />;
  const [top, ...rest] = items;
  return (
    <div className="flex flex-col gap-6">
      <SectionHead size="sub" title={M.top10(label)} note={finalized ? undefined : M.provisional} />
      <Link href={indiePath(top.card.slug)} className="lift press group grid gap-5 rounded-[var(--radius-panel)] bg-surface p-4 shadow-hair sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] sm:p-6">
        <Cover item={top} sizes="(max-width: 640px) 100vw, 60vw" />
        <span className="flex flex-col justify-center gap-2">
          <span className="text-[44px] font-black leading-none text-acc">1</span>
          <span className="text-[22px] font-extrabold text-ink group-hover:text-acc">{top.card.title}</span>
          <span className="text-[14px] leading-[1.6] text-mut">{top.card.tagline}</span>
          <span className="flex gap-2 text-[12.5px] text-dim">
            <span>{top.card.developerName}</span>
            <Tag>{M.score(top.score)}</Tag>
          </span>
        </span>
      </Link>
      {rest.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {rest.slice(0, 2).map((r, i) => (
            <li key={r.card.slug} className="enter-item" style={stagger(i)}>
              <Link href={indiePath(r.card.slug)} className="lift press group flex flex-col gap-3 rounded-[var(--radius-md)] bg-surface p-4 shadow-hair">
                <Cover item={r} sizes="(max-width: 640px) 100vw, 40vw" />
                <span className="flex items-center gap-2">
                  <span className="text-[22px] font-black text-acc">{i + 2}</span>
                  <span className="truncate text-[15px] font-bold text-ink group-hover:text-acc">{r.card.title}</span>
                  <span className="ml-auto shrink-0">
                    <Tag>{M.score(r.score)}</Tag>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {rest.length > 2 && (
        <ol className="divide-y divide-line-soft overflow-hidden rounded-[var(--radius-md)] bg-surface shadow-hair">
          {rest.slice(2).map((r, i) => (
            <li key={r.card.slug}>
              <Link href={indiePath(r.card.slug)} className="flex min-h-[var(--touch-target)] items-center gap-3 px-4 py-2.5 hover:bg-surface-2">
                <span className="w-6 text-center text-[14px] font-black tabular-nums text-acc">{i + 4}</span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">{r.card.title}</span>
                <span className="hidden text-[12.5px] text-dim sm:inline">{r.card.developerName}</span>
                <Tag>{M.score(r.score)}</Tag>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default async function HallOfFamePage({ searchParams }: Props) {
  const sp = await searchParams;
  const tab = first(sp.tab) === "history" ? "history" : "month";
  const now = kstYm(new Date());
  const ymRaw = first(sp.ym);
  const ym = isYm(ymRaw) && ymRaw <= now ? ymRaw : now;
  const months = Array.from({ length: MONTH_CHOICES }).reduce<string[]>((acc) => [...acc, acc.length === 0 ? now : prevYm(acc[acc.length - 1])], []);

  type Data = { kind: "history"; h: Awaited<ReturnType<typeof listHallHistory>> } | { kind: "month"; r: Awaited<ReturnType<typeof getMonthRanking>> };
  const load = async (): Promise<Data> => (tab === "history" ? { kind: "history", h: await listHallHistory() } : { kind: "month", r: await getMonthRanking(ym) });
  const data = await nullIfDbUnavailable(load());

  return (
    <Page gap={22}>
      <PageHead title={M.hofTitle} note={M.hofLead} />
      <NavPendingScope>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            <NavChip group="tab" current="page" href={href("month")} active={tab === "month"}>
              {M.tabMonth}
            </NavChip>
            <NavChip group="tab" current="page" href={href("history")} active={tab === "history"}>
              {M.tabHistory}
            </NavChip>
          </div>
          {tab === "month" && (
            <div role="group" aria-label={M.monthPick} className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
              {months.map((m) => (
                <NavChip key={m} group="ym" compact href={href("month", m === now ? undefined : m)} active={m === ym}>
                  {ymLabel(m)}
                </NavChip>
              ))}
            </div>
          )}
        </div>
        <PendingRegion className="mt-5">
          {!data ? (
            <DbUnavailable retryHref={ROUTES.hallOfFame} />
          ) : data.kind === "month" ? (
            <Ranking items={data.r.items} label={ymLabel(ym)} finalized={data.r.finalized} />
          ) : data.h.length === 0 ? (
            <EmptyState title={M.historyEmpty} description={M.historyLead} />
          ) : (
            <ul className="divide-y divide-line-soft overflow-hidden rounded-[var(--radius-md)] bg-surface shadow-hair">
              {data.h.map((row) => (
                <li key={row.ym}>
                  {/* 역대 줄은 게임 상세가 아니라 그 달 TOP 10 으로 간다(기획서 S-08) */}
                  <Link href={href("month", row.ym)} className="flex min-h-[var(--touch-target)] items-center gap-4 px-4 py-3 hover:bg-surface-2">
                    <span className="w-24 shrink-0 text-[13.5px] font-semibold text-acc">{ymLabel(row.ym)}</span>
                    <span className="min-w-0 flex-1 truncate text-[14.5px] font-bold text-ink">{row.top?.card.title ?? "-"}</span>
                    {row.top && <Tag>{M.score(row.top.score)}</Tag>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </PendingRegion>
      </NavPendingScope>
    </Page>
  );
}
