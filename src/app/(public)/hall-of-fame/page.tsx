// 명예의 전당(기획서 v2.0 S-08, 목업 hofPage). 탭 둘:
//   이번 달 주목작 — 월 선택(기본 이번 달). 1위는 큰 판, 2~3위 카드가 한 줄(목업 .hgrid), 4~10위 줄. 이번 달은 실시간 잠정 순위다.
//   역대 선정작 — 확정된 달마다 1위 한 줄. 줄을 누르면 게임 상세가 아니라 그 달 TOP 10 순위표로 간다(?tab=history&ym=).
//     순위표는 역대 선정작 탭 안에 선다(목업 hpm): "X월 주목작 순위 TOP 10" 머리, "역대 선정작으로" 되돌아가기, 1~10위 줄.
//     이번 달 주목작 탭의 큰 판으로 보내지 않는 이유 — 탭이 바뀌어 "역대 선정작을 보던 중" 이라는 자리가 사라진다.
// 탭, 달은 주소(?tab=, ?ym=)에 실린다. 점수 식은 lib/indie/fame.
// 월 선택 칩은 줄바꿈하지 않는다(shrink-0, nowrap) — 390 폭에서 "2026년 10월(이번 달)" 이 네 줄로 접혔다. 넘치는 달은 가로로 민다.
// 목업의 월 선택은 드롭다운이지만 칩으로 둔다 — 칩은 누른 순간 켜진다(ui/nav-pending). 드롭다운은 고른 뒤 서버를 기다린다.
// 보조 줄의 조회, 찜은 그 달 값이 아니라 누적이다 — 달 값은 순위 점수에 이미 들어가 있고, 점수를 같이 적는다.
import type { Metadata } from "next";
import Link from "next/link";
import { DbUnavailable } from "@/components/db-unavailable";
import { EmptyState } from "@/components/empty-state";
import { FadeImage } from "@/components/ui/fade-image";
import { ChevronLeftIcon } from "@/components/ui/icons";
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

/** 칩이 좁은 화면에서 접히지 않게 — 줄 전체가 가로로 밀린다 */
const NOWRAP_CHIP = "shrink-0 whitespace-nowrap";

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

const platformsOf = (item: RankedIndie) => item.card.platforms.map((p) => INDIE_PLATFORM_LABEL[p]).join(", ");

const PLATFORM_PILL = "rounded-lg bg-surface-2 px-2.5 py-1 text-[12px] font-semibold text-ink-2";

/**
 * 지난달 대비 한 마디(목업 hrow 순위 아래 "27%"). 오르면 초록(--ok, 이 화면에서 "좋아졌다" 한 가지만 말한다), 내리면 흐린 글자.
 * 지난달 점수가 없으면 "새로 진입". 견줄 일이 없는 자리(역대 선정작)는 change 가 없어 아무것도 안 세운다
 */
function ChangeNote({ change, className }: { change: number | null | undefined; className?: string }) {
  if (change === undefined) return null;
  const text = change === null ? M.newEntry : M.change(change);
  return <span className={cn("text-[11.5px] font-semibold tabular-nums", change === null ? "text-acc" : change > 0 ? "text-ok" : "text-dim", className)}>{text}</span>;
}

/** 4위 아래 줄과 역대 선정작 줄이 같은 모양을 쓴다(목업 .hpr): 왼쪽 순위 칸, 작은 커버, 이름과 보조 줄, 오른쪽 끝 알약 */
function RankRow({ to, rank, sub, item, right }: { to: string; rank: string; sub?: string; item: RankedIndie | null; right: React.ReactNode }) {
  return (
    <li>
      <Link href={to} className="press grid grid-cols-[72px_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 rounded-[var(--radius-md)] bg-surface p-3 shadow-hair transition-colors hover:bg-surface-2 sm:grid-cols-[96px_112px_minmax(0,1fr)_auto] sm:gap-x-4">
        <span className="flex flex-col">
          <span className="text-[15px] font-extrabold text-ink">{rank}</span>
          {sub && <span className="text-[11.5px] font-semibold text-acc">{sub}</span>}
          <ChangeNote change={item?.change} />
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
        <Link href={indiePath(top.card.slug)} className="lift press glint-sweep group relative isolate flex min-h-[280px] flex-col justify-between gap-4 overflow-hidden rounded-[var(--radius-panel)] bg-ink p-5 text-on-ink sm:p-6">
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
            {top.change !== undefined && <span className="font-semibold">{top.change === null ? M.newEntry : M.changeFromLast(top.change)}</span>}
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
              <ChangeNote change={r.change} className="text-[12.5px]" />
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

/** 역대 선정작에서 고른 달의 순위표(목업 hofPage 의 S.hpm 갈래). 1위도 큰 판이 아니라 같은 줄로 선다 — 견주어 읽는 표라서다 */
function Top10({ ym, items }: { ym: string; items: RankedIndie[] }) {
  return (
    <section aria-labelledby="hof-top10" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="hof-top10" className="text-[18px] font-extrabold tracking-[-0.03em] text-ink">
          {M.top10(ymLabel(ym))}
        </h2>
        <NavChip group="tab" href={href("history")} compact outline className={NOWRAP_CHIP}>
          <ChevronLeftIcon size={14} className="-ml-0.5 shrink-0" />
          {M.backToHistory}
        </NavChip>
      </div>
      {items.length === 0 ? (
        <EmptyState title={M.empty} description={M.emptyLead} />
      ) : (
        <ol className="flex flex-col gap-2.5">
          {items.map((r, i) => (
            <RankRow key={r.card.slug} to={indiePath(r.card.slug)} rank={M.rank(i + 1)} sub={M.score(r.score)} item={r} right={<span className={PLATFORM_PILL}>{platformsOf(r)}</span>} />
          ))}
        </ol>
      )}
    </section>
  );
}

export default async function HallOfFamePage({ searchParams }: Props) {
  const sp = await searchParams;
  const tab = first(sp.tab) === "history" ? "history" : "month";
  const now = kstYm(new Date());
  const ymRaw = first(sp.ym);
  const ym = isYm(ymRaw) && ymRaw <= now ? ymRaw : now;
  const months = Array.from({ length: MONTH_CHOICES }).reduce<string[]>((acc) => [...acc, acc.length === 0 ? now : prevYm(acc[acc.length - 1])], []);

  // 역대 선정작에서 고른 달(순위표). 확정된 달만 뜻이 있지만, 주소를 손으로 고친 이번 달도 잠정 순위로 그대로 보여 준다
  const pickedYm = tab === "history" && isYm(ymRaw) && ymRaw <= now ? ymRaw : null;

  type Data =
    | { kind: "history"; h: Awaited<ReturnType<typeof listHallHistory>> }
    | { kind: "month"; r: Awaited<ReturnType<typeof getMonthRanking>> }
    | { kind: "top10"; ym: string; r: Awaited<ReturnType<typeof getMonthRanking>> };
  const load = async (): Promise<Data> =>
    pickedYm ? { kind: "top10", ym: pickedYm, r: await getMonthRanking(pickedYm) } : tab === "history" ? { kind: "history", h: await listHallHistory() } : { kind: "month", r: await getMonthRanking(ym) };
  const data = await nullIfDbUnavailable(load());

  return (
    <Page gap={20}>
      <PageHead title={M.hofTitle}>
        <p className="text-[14px] text-mut">{M.hofLead}</p>
      </PageHead>
      <NavPendingScope>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div role="group" aria-label={M.hofTitle} className="flex gap-1.5">
            <NavChip group="tab" current="page" href={href("month")} active={tab === "month"} className={NOWRAP_CHIP}>
              {M.tabMonth}
            </NavChip>
            <NavChip group="tab" current="page" href={href("history")} active={tab === "history"} className={NOWRAP_CHIP}>
              {M.tabHistory}
            </NavChip>
          </div>
          {tab === "month" && (
            <div role="group" aria-label={M.monthPick} className="-mx-5 flex gap-1.5 overflow-x-auto px-5 [scrollbar-width:none] sm:-mx-7 sm:px-7 md:mx-0 md:px-0">
              {months.map((m) => (
                <NavChip key={m} group="ym" compact href={href("month", m === now ? undefined : m)} active={m === ym} className={NOWRAP_CHIP}>
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
          ) : data.kind === "top10" ? (
            <Top10 ym={data.ym} items={data.r.items} />
          ) : data.h.length === 0 ? (
            <EmptyState title={M.historyEmpty} description={M.historyLead} />
          ) : (
            <ol className="flex flex-col gap-2.5">
              {/* 역대 줄은 게임 상세가 아니라 그 달 TOP 10 으로 간다(기획서 S-08) */}
              {data.h.map((row) => (
                <RankRow key={row.ym} to={href("history", row.ym)} rank={ymLabel(row.ym)} sub={M.monthFirst} item={row.top} right={<span className="text-[13px] font-semibold text-acc">{M.seeRanking}</span>} />
              ))}
            </ol>
          )}
        </PendingRegion>
      </NavPendingScope>
      <p className="text-[12px] text-dim">{tab === "month" ? M.monthFootnote : pickedYm ? M.top10Footnote : M.historyFootnote}</p>
    </Page>
  );
}
