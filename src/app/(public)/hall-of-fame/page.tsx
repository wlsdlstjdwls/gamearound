// 명예의 전당(기획서 v2.0 S-08, 목업 hofPage). 탭 둘:
//   이번 달 주목작 — 월 선택(기본 이번 달). 1위는 큰 판, 2~3위 카드가 한 줄(목업 .hgrid), 4~10위 줄. 이번 달은 실시간 잠정 순위다.
//   역대 선정작 — 확정된 달마다 1위 한 줄. 줄을 누르면 게임 상세가 아니라 그 달 TOP 10 순위표로 간다(?tab=history&ym=).
//     순위표는 역대 선정작 탭 안에 선다(목업 hpm): "X월 주목작 순위 TOP 10" 머리, "역대 선정작으로" 되돌아가기, 1~10위 줄.
//     이번 달 주목작 탭의 큰 판으로 보내지 않는 이유 — 탭이 바뀌어 "역대 선정작을 보던 중" 이라는 자리가 사라진다.
// 탭, 달은 주소(?tab=, ?ym=)에 실린다. 점수 식은 lib/indie/fame.
// 달 고르기는 이전, 다음 화살표 사이에 달 이름 하나(indie/month-stepper, 2026-10-28 사용자: "날짜가 버튼 형태라 UI 개선").
// 칩 여섯 개가 한 줄을 먹고 390 폭에서 가로로 밀리던 것을 걷었다. 화살표는 NavChip 이라 누른 순간 켜진다.
// 어두운 머리 판(InkHero)은 2026-10-28 걷었다(사용자: "영역을 너무 잡아먹는다") — 강조는 1~3위 판이 맡는다.
// 4~10위 줄에는 한 계단 위까지 점수와 "가장 많이 오른 게임" 을 적고, 개발자 본인에게는 "내 게임은 지금" 카드를 띄운다
// (사용자: "3위 안에 못 들어도 힘나도록"). 카드는 개인 값이라 마운트 뒤 받는다(indie/my-fame-standing).
// 들어오면 1위 그림이 화면을 덮었다 1위 판 자리로 줄어든다(indie/fame-intro, 세션당 한 번).
// 보조 줄의 조회, 찜은 그 달 값이 아니라 누적이다 — 달 값은 순위 점수에 이미 들어가 있고, 점수를 같이 적는다.
import type { Metadata } from "next";
import Link from "next/link";
import { DbUnavailable } from "@/components/db-unavailable";
import { EmptyState } from "@/components/empty-state";
import { FadeImage } from "@/components/ui/fade-image";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { NavChip, NavPendingScope, PendingRegion } from "@/components/ui/nav-pending";
import { Page, PageHead } from "@/components/ui/page";
import { TrophyIcon } from "@/components/ui/icons";
import { FameIntro } from "@/components/indie/fame-intro";
import { MonthStepper } from "@/components/indie/month-stepper";
import { MyFameStandingCard } from "@/components/indie/my-fame-standing";
import { cn } from "@/lib/cn";
import { nullIfDbUnavailable } from "@/lib/db-errors";
import { FAME_MESSAGES as M, isYm, kstYm, prevYm, ymLabel } from "@/lib/indie/fame";
import { genreLabels, INDIE_PLATFORM_LABEL } from "@/lib/indie/messages";
import { stagger } from "@/lib/motion";
import { indieDetailHref, INDIE_FROM } from "@/lib/indie/query";
import { ROUTES } from "@/lib/routes";
import { getMonthRanking, listHallHistory, listIndieImageUrls, type RankedIndie } from "@/server/services/indie";
import { FAME_INTRO_IMAGE_MAX, type FameIntroSettings } from "@/lib/indie/fame-intro";
import { getFameIntroSettings } from "@/server/services/settings";

export const revalidate = 300;

export const metadata: Metadata = { title: M.hofTitle, description: M.hofLead };

/** 달 고르기로 거슬러 갈 수 있는 달 수 — 이번 달 포함 한 해. 화살표로 넘기니 칩 시절(반년)처럼 줄 폭에 묶이지 않는다 */
const MONTH_CHOICES = 12;

/** 1위 판의 id. 들어올 때 인트로(indie/fame-intro)가 이 자리로 줄어든다 */
const FAME_TOP_ID = "fame-top";

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
function RankRow({ to, rank, sub, item, right, note }: { to: string; rank: string; sub?: string; item: RankedIndie | null; right: React.ReactNode; note?: React.ReactNode }) {
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
          {note}
        </span>
        <span className="col-start-2 justify-self-start sm:col-start-auto sm:justify-self-end">{right}</span>
      </Link>
    </li>
  );
}

function Ranking({ items, label, finalized, isNow, intro }: { items: RankedIndie[]; label: string; finalized: boolean; isNow: boolean; intro: { images: string[]; settings: FameIntroSettings } }) {
  if (items.length === 0) return <EmptyState title={M.empty} description={M.emptyLead} />;
  const [top, ...rest] = items;
  // 4~10위 중 지난달보다 가장 많이 오른 게임 하나. 순위는 낮아도 뜨는 중임을 말해 준다. 오른 게임이 없으면 아무도 안 단다
  const riserSlug = rest
    .slice(2)
    .filter((r) => (r.change ?? 0) > 0)
    .reduce<RankedIndie | null>((a, b) => (!a || (b.change ?? 0) > (a.change ?? 0) ? b : a), null)?.card.slug;
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)_minmax(0,1fr)]">
        {/* 1위 — 큰 판(목업 hhero). 대표 그림을 선명하게 깔고(2026-10-28 사용자: "흑백 같은 거에 가려서 잘 안 보인다"),
            글이 앉는 아래쪽만 어둡게 받친다. 전에는 그림을 50% 로 흐리고 왼쪽에서 오른쪽으로 짙은 막과 큰 "1" 글자까지 얹어 그림이 거의 안 보였다.
            id 는 들어올 때 인트로(indie/fame-intro)가 줄어들어 안착할 자리다 */}
        <Link id={FAME_TOP_ID} href={indieDetailHref(top.card.slug, INDIE_FROM.hallOfFame)} className="lift press glint-sweep group relative isolate flex min-h-[300px] flex-col justify-between gap-4 overflow-hidden rounded-[var(--radius-panel)] bg-ink p-5 text-on-ink shadow-[0_0_0_2px_var(--acc),0_18px_40px_-18px_var(--acc)] sm:min-h-[340px] sm:p-7">
          <span aria-hidden className="absolute inset-0 -z-10">
            <FadeImage src={top.card.cover.url} alt="" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
          </span>
          {/* 위 딱지 줄의 작은 글자를 받치는 옅은 띠 + 아래 글 자리 받침. 가운데는 비워 그림이 보인다 */}
          <span aria-hidden className="absolute inset-x-0 top-0 -z-10 h-24" style={{ background: "linear-gradient(to bottom, color-mix(in oklab, var(--ink) 55%, transparent), transparent)" }} />
          <span aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-[58%]" style={{ background: "linear-gradient(to top, color-mix(in oklab, var(--ink) 88%, transparent) 30%, transparent)" }} />
          <span className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-acc px-3 py-1 text-[12.5px] font-bold text-on-ink">
              <TrophyIcon size={14} strokeWidth={2.2} />
              {isNow ? M.firstThisMonth : M.firstOf(label)}
            </span>
            <span className="text-[12px] opacity-90 [text-shadow:0_1px_2px_rgb(0_0_0/0.5)]">{finalized ? M.pickedBy : M.provisionalNote}</span>
          </span>
          <span className="mt-auto flex flex-col gap-2">
            <span className="text-[26px] font-extrabold leading-tight tracking-[-0.03em] sm:text-[34px]">{top.card.title}</span>
            <span className="text-[12.5px] opacity-85">{[M.byDev(top.card.developerName), genreLabels(top.card.genres).join(", "), platformsOf(top)].filter(Boolean).join(" | ")}</span>
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
        <FameIntro src={top.card.cover.url} images={intro.images} settings={intro.settings} title={top.card.title} badge={isNow ? M.firstThisMonth : M.firstOf(label)} targetId={FAME_TOP_ID} />
        {rest.slice(0, 2).map((r, i) => (
          // 2, 3위는 위쪽 브랜드색 띠(단상)와 큰 점수로 4위 아래 줄과 갈린다. 2위 띠가 3위보다 굵고 진하다
          <Link key={r.card.slug} href={indieDetailHref(r.card.slug, INDIE_FROM.hallOfFame)} className={cn("lift press group enter-item flex flex-col gap-3 rounded-[var(--radius-panel)] bg-surface p-3.5", i === 0 ? "[box-shadow:inset_0_4px_0_var(--acc),var(--ring-hair)]" : "[box-shadow:inset_0_3px_0_var(--acc-3),var(--ring-hair)]")} style={stagger(i)}>
            <span className="relative block">
              <Cover item={r} sizes="(max-width: 1024px) 100vw, 25vw" />
              {/* 순위 딱지 — 2, 3위도 "올랐다" 가 읽히게 브랜드색 원으로 키웠다(2026-10-27). 누런 금은색은 쓰지 않는다(사용자) */}
              <span className="absolute left-2.5 top-2.5 flex h-9 items-center justify-center rounded-full bg-acc px-3 text-[16px] font-black text-on-ink shadow-[0_4px_12px_-3px_var(--acc)] ring-2 ring-surface">{M.rank(i + 2)}</span>
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="truncate text-[16px] font-bold text-ink group-hover:text-acc">{r.card.title}</span>
              <span className="truncate text-[12.5px] text-dim">{[M.byDev(r.card.developerName), genreLabels(r.card.genres).join(", ")].filter(Boolean).join(" | ")}</span>
            </span>
            <span className="mt-auto flex flex-wrap items-baseline gap-x-3 border-t border-line-soft pt-2.5 text-[12.5px] text-mut">
              <span className="text-[20px] font-black tabular-nums text-ink">{M.score(r.score)}</span>
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
            {rest.slice(2).map((r, i) => {
              const above = items[i + 2];
              const gap = Math.max(above.score - r.score + 1, 1);
              return (
                <RankRow
                  key={r.card.slug}
                  to={indieDetailHref(r.card.slug, INDIE_FROM.hallOfFame)}
                  rank={M.rank(i + 4)}
                  sub={M.score(r.score)}
                  item={r}
                  right={<span className={PLATFORM_PILL}>{platformsOf(r)}</span>}
                  note={
                    <span className="flex flex-wrap gap-x-3 text-[12px] font-semibold">
                      {!finalized && <span className="text-acc">{M.gapToAbove(i + 3, gap)}</span>}
                      {r.card.slug === riserSlug && <span className="text-ok">{M.topRiser}</span>}
                    </span>
                  }
                />
              );
            })}
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
            <RankRow key={r.card.slug} to={indieDetailHref(r.card.slug, INDIE_FROM.hallOfFame)} rank={M.rank(i + 1)} sub={M.score(r.score)} item={r} right={<span className={PLATFORM_PILL}>{platformsOf(r)}</span>} />
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
  // 1위 인트로가 전체 화면에서 넘길 그림. 이번 달 순위 화면에서만 튼다. 못 받으면 대표 한 장으로 돈다
  const topSlug = data?.kind === "month" ? data.r.items[0]?.card.slug : undefined;
  const introImages = topSlug ? await listIndieImageUrls(topSlug, FAME_INTRO_IMAGE_MAX).catch(() => []) : [];
  // 언제 틀지와 머무는 시간은 관리자 화면(화면 연출)이 정한다. 못 읽으면 기본값(처음 한 번만)
  const intro = { images: introImages, settings: await getFameIntroSettings() };

  return (
    <Page gap={20}>
      <PageHead title={M.hofTitle}>
        <p className="text-[14px] text-mut">{M.hofHeadLead}</p>
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
            <MonthStepper
              months={months.map((m) => ({ ym: m, label: ymLabel(m), href: href("month", m === now ? undefined : m) }))}
              current={ym}
              nowYm={now}
              labels={{ group: M.monthPick, prev: M.monthPrev, next: M.monthNext, thisMonth: M.backToNow, nowTag: M.nowTag }}
            />
          )}
        </div>
        <PendingRegion>
          {!data ? (
            <DbUnavailable retryHref={ROUTES.hallOfFame} />
          ) : data.kind === "month" ? (
            <Ranking items={data.r.items} label={ymLabel(ym)} finalized={data.r.finalized} isNow={ym === now} intro={intro} />
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
        {/* "내 게임은 지금" 은 순위 **아래**에 둔다(2026-10-28 사용자 "뒤늦게 깜빡이듯 나온다"). 화면 본문은 캐시(ISR)라 쿠키를 못 읽어
            이 카드만 그린 뒤에 따로 받는다 — 위에 두면 도착하는 순간 1위 판을 통째로 밀어 내렸다. 아래면 이미 본 것을 밀지 않는다 */}
        {tab === "month" && ym === now && <MyFameStandingCard />}
      </NavPendingScope>
      <p className="text-[12px] text-dim">{tab === "month" ? M.monthFootnote : pickedYm ? M.top10Footnote : M.historyFootnote}</p>
    </Page>
  );
}
