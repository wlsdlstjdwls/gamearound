// 명예의 전당(기획서 v2.0 S-08, 목업 hofPage). 탭 둘:
//   이번 달 주목작 — 월 선택(기본 이번 달). 1위는 큰 판, 2~3위 카드가 한 줄(목업 .hgrid), 4~10위 줄. 이번 달은 실시간 잠정 순위다.
//   역대 선정작 — 확정된 달마다 1위 한 줄. 줄을 누르면 게임 상세가 아니라 그 달 TOP 10 으로 간다.
// 탭, 달은 주소(?tab=, ?ym=)에 실린다. 점수 식은 lib/indie/fame.
// 목업의 월 선택은 드롭다운이지만 칩으로 둔다 — 칩은 누른 순간 켜진다(ui/nav-pending). 드롭다운은 고른 뒤 서버를 기다린다.
// 보조 줄의 조회, 찜은 그 달 값이 아니라 누적이다 — 달 값은 순위 점수에 이미 들어가 있고, 점수를 같이 적는다.
import type { Metadata } from "next";
import Link from "next/link";
import { DbUnavailable } from "@/components/db-unavailable";
import { EmptyState } from "@/components/empty-state";
import { FadeImage } from "@/components/ui/fade-image";
import { NavChip, NavPendingScope, PendingRegion } from "@/components/ui/nav-pending";
import { Page, PageHead } from "@/components/ui/page";
import { cn } from "@/lib/cn";
import { nullIfDbUnavailable } from "@/lib/db-errors";
import { FAME_MESSAGES as M, isYm, kstYm, prevYm, ymLabel } from "@/lib/indie/fame";
import { genreLabels, INDIE_PLATFORM_LABEL } from "@/lib/indie/messages";
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

function Cover({ item, sizes, className }: { item: RankedIndie; sizes: string; className?: string }) {
  return (
    <span className={cn("relative block aspect-[460/215] w-full overflow-hidden rounded-[var(--radius-cover)] bg-surface-3", className)}>
      <FadeImage src={item.card.cover.url} alt="" fill sizes={sizes} className="object-cover" />
    </span>
  );
}

/** "개발자 X | 장르 | 조회 n | 찜 n" — 목업 hsm, hrow 의 보조 줄 */
function metaOf(item: RankedIndie): string {
  const c = item.card;
  return [M.byDev(c.developerName), genreLabels(c.genres).join(", "), M.views(c.viewCount), M.likes(c.likeCount)].filter(Boolean).join(" | ");
}

const platformsOf = (item: RankedIndie) => item.card.platforms.map((p) => INDIE_PLATFORM_LABEL[p]).join(" / ");

const PLATFORM_PILL = "rounded-lg bg-surface-2 px-2.5 py-1 text-[12px] font-semibold text-ink-2";

/** 4위 아래 줄과 역대 선정작 줄이 같은 모양을 쓴다(목업 .hpr): 왼쪽 순위 칸, 작은 커버, 이름과 보조 줄, 오른쪽 끝 알약 */
function RankRow({ to, rank, sub, item, right }: { to: string; rank: string; sub?: string; item: RankedIndie | null; right: React.ReactNode }) {
  return (
    <li>
      <Link href={to} className="press grid grid-cols-[72px_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 rounded-[var(--radius-md)] bg-surface p-3 shadow-hair transition-colors hover:bg-surface-2 sm:grid-cols-[96px_112px_minmax(0,1fr)_auto] sm:gap-x-4">
        <span className="flex flex-col">
          <span className="text-[15px] font-extrabold text-ink">{rank}</span>
          {sub && <span className="text-[11.5px] font-semibold text-acc">{sub}</span>}
        </span>
        {item ? <Cover item={item} sizes="112px" className="hidden sm:block" /> : <span className="hidden sm:block" />}
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[15px] font-bold text-ink">{item?.card.title ?? "-"}</span>
          {item && <span className="truncate text-[12.5px] text-dim">{metaOf(item)}</span>}
        </span>
        <span className="col-start-2 justify-self-start sm:col-start-auto sm:justify-self-end">{right}</span>
      </Link>
    </li>
  );
}

function Ranking({ items, label, finalized, isNow }: { items: RankedIndie[]; label: string; finalized: boolean; isNow: boolean }) {
  if (items.length === 0) return <EmptyState title={M.empty} description={M.emptyLead} />;
  const [top, ...rest] = items;
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)_minmax(0,1fr)]">
        {/* 1위 — 큰 판(목업 hhero). 대표 그림을 흐리지 않고 깔고, 왼쪽에서 오른쪽으로 옅어지는 막을 씌워 글을 읽힌다 */}
        <Link href={indiePath(top.card.slug)} className="lift press group relative isolate flex min-h-[280px] flex-col justify-between gap-4 overflow-hidden rounded-[var(--radius-panel)] bg-ink p-5 text-on-ink sm:p-6">
          <span aria-hidden className="absolute inset-0 -z-10 opacity-50">
            <FadeImage src={top.card.cover.url} alt="" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
          </span>
          <span aria-hidden className="absolute inset-0 -z-10" style={{ background: "linear-gradient(90deg, color-mix(in oklab, var(--ink) 92%, transparent), color-mix(in oklab, var(--ink) 40%, transparent))" }} />
          <span className="flex flex-wrap items-center gap-2">
            <span className="rounded-full px-3 py-1 text-[12px] font-bold ring-1 ring-[color-mix(in_oklab,var(--on-ink)_45%,transparent)]">{isNow ? M.firstThisMonth : M.firstOf(label)}</span>
            <span className="text-[12px] opacity-75">{finalized ? M.pickedBy : M.provisionalNote}</span>
          </span>
          <span className="flex flex-col gap-2">
            <span className="text-[24px] font-extrabold leading-tight tracking-[-0.03em] sm:text-[28px]">{top.card.title}</span>
            <span className="text-[12.5px] opacity-80">{[M.byDev(top.card.developerName), genreLabels(top.card.genres).join(", "), platformsOf(top)].filter(Boolean).join(" | ")}</span>
            <span className="line-clamp-2 max-w-[460px] text-[14px] leading-[1.6] opacity-90">{top.card.tagline}</span>
          </span>
          <span className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[color-mix(in_oklab,var(--on-ink)_20%,transparent)] pt-3 text-[12.5px]">
            <span className="rounded-[var(--radius-sm)] bg-on-ink px-4 py-2 text-[13.5px] font-bold text-ink">{M.seeGame}</span>
            <span className="font-bold">{M.score(top.score)}</span>
            <span>{M.views(top.card.viewCount)}</span>
            <span>{M.likes(top.card.likeCount)}</span>
          </span>
        </Link>
        {rest.slice(0, 2).map((r, i) => (
          <Link key={r.card.slug} href={indiePath(r.card.slug)} className="lift press group enter-item flex flex-col gap-3 rounded-[var(--radius-panel)] bg-surface p-3.5 shadow-hair" style={stagger(i)}>
            <span className="relative block">
              <Cover item={r} sizes="(max-width: 1024px) 100vw, 25vw" />
              <span className="absolute left-2 top-2 flex size-7 items-center justify-center rounded-lg bg-ink text-[13px] font-extrabold text-on-ink">{i + 2}</span>
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="truncate text-[16px] font-bold text-ink group-hover:text-acc">{r.card.title}</span>
              <span className="truncate text-[12.5px] text-dim">{[M.byDev(r.card.developerName), genreLabels(r.card.genres).join(", ")].filter(Boolean).join(" | ")}</span>
            </span>
            <span className="mt-auto flex flex-wrap gap-x-3 border-t border-line-soft pt-2.5 text-[12.5px] text-mut">
              <span>{M.score(r.score)}</span>
              <span>{M.views(r.card.viewCount)}</span>
              <span>{M.likes(r.card.likeCount)}</span>
            </span>
            <span className="text-[13px] font-semibold text-acc">{M.seePage}</span>
          </Link>
        ))}
      </div>
      {rest.length > 2 && (
        <section aria-labelledby="hof-rest" className="flex flex-col gap-3">
          <h2 id="hof-rest" className="text-[18px] font-extrabold tracking-[-0.03em] text-ink">
            {M.restHead}
          </h2>
          <ol className="flex flex-col gap-2.5">
            {rest.slice(2).map((r, i) => (
              <RankRow key={r.card.slug} to={indiePath(r.card.slug)} rank={M.rank(i + 4)} sub={M.score(r.score)} item={r} right={<span className={PLATFORM_PILL}>{platformsOf(r)}</span>} />
            ))}
          </ol>
        </section>
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
    <Page gap={20}>
      <PageHead title={M.hofTitle}>
        <p className="text-[14px] text-mut">{M.hofLead}</p>
      </PageHead>
      <NavPendingScope>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div role="group" aria-label={M.hofTitle} className="flex flex-wrap gap-1.5">
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
                  {m === now ? M.thisMonth(ymLabel(m)) : ymLabel(m)}
                </NavChip>
              ))}
            </div>
          )}
        </div>
        <PendingRegion className="mt-5">
          {!data ? (
            <DbUnavailable retryHref={ROUTES.hallOfFame} />
          ) : data.kind === "month" ? (
            <Ranking items={data.r.items} label={ymLabel(ym)} finalized={data.r.finalized} isNow={ym === now} />
          ) : data.h.length === 0 ? (
            <EmptyState title={M.historyEmpty} description={M.historyLead} />
          ) : (
            <ol className="flex flex-col gap-2.5">
              {/* 역대 줄은 게임 상세가 아니라 그 달 TOP 10 으로 간다(기획서 S-08) */}
              {data.h.map((row) => (
                <RankRow key={row.ym} to={href("month", row.ym)} rank={ymLabel(row.ym)} sub={M.monthFirst} item={row.top} right={<span className="text-[13px] font-semibold text-acc">{M.seeRanking}</span>} />
              ))}
            </ol>
          )}
        </PendingRegion>
      </NavPendingScope>
      <p className="text-[12px] text-dim">{tab === "month" ? M.monthFootnote : M.historyFootnote}</p>
    </Page>
  );
}
