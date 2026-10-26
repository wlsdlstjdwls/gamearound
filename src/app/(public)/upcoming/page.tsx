// 출시예정 화면 — "무엇을 기다리나" 에 답하는 축.
//
// 목록(/games)의 최신 출시순과 갈라 둔 이유: 그 화면은 "무엇이 나왔나" 를 묻는다.
// 한 정렬에 겹쳐 두면 아직 못 사는 게임이 첫 페이지를 차지해 둘 다 못 읽는다.
//
// 달로 묶고 카드마다 날짜를 적는다. 날짜마다 머리를 달면 70장에 머리가 60개라 목록이 안 보이고,
// 달 머리 하나만 두면 "이번 주인가" 를 세어 봐야 한다 — 요일까지 카드에 적어 그 셈을 없앤다.
//
// **한 화면에 한 달**이다(2026-10-07, 사용자 지적: "한 화면에 모든 달의 게임을 뿌리는게 문제 아닌가?").
// 모든 달을 세우던 때는 달마다 24장으로 잘라야 해서 10월 233개 중 209개를 볼 길이 없었다. 지금은 달 탭이
// 같은 화면에서 그 달만 다시 세우고(?month=), 그 달은 쪽 번호(?page=, 2026-10-26)로 끝까지 읽힌다. 질의도 고른 달 하나만 보낸다 —
// 모든 달을 한 번에 그리면 달마다 질의와 카드가 쌓여 첫 화면이 무거워진다.
//
// 2026-10-26 기획서 v2.0 S-03, 목업대로 "전체 보기 | 월별 보기" 전환을 넣고(기본 월별), 월별 날짜순은 다시 줄로 세웠다
// (components/upcoming-row 머리 주석 — 한 달 안에서는 날짜가 첫 질문이다). 전체 보기와 기대작은 카드 격자다.
//
// 아래는 09-21 의 판단이다(전체 보기, 기대작 카드에 그대로 남는다).
// **줄에서 카드로 바꿨다**(2026-09-21). 이 화면이 답하는 질문은 "무엇을 기다리나" 인데, 아직 못 사는
// 게임을 고르는 단서는 값도 평점도 아니고 커버 한 장이다 — 줄에서는 그 커버가 92px 였다.
// 목록(/games)과 같은 격자, 같은 카드를 쓴다. 이 화면만 다른 모양이면 같은 게임이 화면마다
// 다르게 생겨서, 목록에서 기억한 그림을 여기서 다시 찾아야 한다.
import type { Metadata } from "next";
import { Suspense } from "react";
import { DbUnavailable } from "@/components/db-unavailable";
import { GameCard } from "@/components/game-card";
import { Pagination } from "@/components/pagination";
import { NavPendingScope, PendingRegion } from "@/components/ui/nav-pending";
import { UpcomingMonthNav } from "@/components/upcoming-month-nav";
import { UpcomingRow } from "@/components/upcoming-row";
import { NavChip } from "@/components/ui/nav-pending";
import { Page, SectionHead } from "@/components/ui/page";
import { formatMonthLabel, formatReleaseDay } from "@/lib/format";
import { firstParam, MAX_PARAM_LEN } from "@/lib/games-query";
import { UPCOMING_MESSAGES as M, upcomingAddonParentText, upcomingCountText } from "@/lib/games/messages";
import { HOME_GRID_CLASS } from "@/lib/games/grid";
import { hasUpcomingFilter, pickUpcomingMonth, readUpcomingFilter, upcomingAllHref, upcomingHref, UPCOMING_MONTH_PARAM, UPCOMING_VIEW_ALL, UPCOMING_VIEW_PARAM, type UpcomingFilter } from "@/lib/games/upcoming";
import { UpcomingFilterBar } from "@/components/upcoming-filter-bar";
import { stagger } from "@/lib/motion";
import { nullIfDbUnavailable } from "@/lib/db-errors";
import { ROUTES } from "@/lib/routes";
import { getUpcomingAllPage, getUpcomingAddons, getUpcomingGenres, getUpcomingMonthPage, getUpcomingMonthPicks, getUpcomingMonths, UPCOMING_ADDON_LIMIT, UPCOMING_PAGE_SIZE } from "@/server/services/games";
import { GamesGridSkeleton } from "@/app/(public)/games/skeletons";

// Next 가 정적으로 읽는 값이라 리터럴이어야 한다 — lib/cache 의 LIST_REVALIDATE_SECONDS 와 같게 유지
export const revalidate = 3600;

export const metadata: Metadata = {
  title: M.title,
  description: M.lead,
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** 주소의 page 는 사람이 손으로 고치는 값이라 무엇이 와도 1 이상 정수로 떨어뜨린다 */
function readPage(raw: string | undefined): number {
  const n = Number(raw?.slice(0, MAX_PARAM_LEN));
  return Number.isFinite(n) && n > 1 ? Math.floor(n) : 1;
}

/** 요즘 많이 찾는 장르 칩 수(기획서 v2.0 S-02: 게임 수 상위 4개 장르) */
const TOP_GENRE_COUNT = 4;

/**
 * 고른 달 = 기대작 한 줄 + 날짜순 전체(2026-10-07). 날짜순은 쪽 번호로 넘긴다(목록 화면과 같은 이유, games/page 머리 주석).
 * 기대작 줄은 첫 쪽에만 선다 — 둘째 쪽부터는 날짜순을 이어 읽는 중이라 같은 줄이 다시 서면 처음으로 돌아간 것처럼 보인다.
 * 기대작은 날짜순에서 빠진다(services/games/upcoming 의 picksCte) — 한 화면에 같은 카드가 두 번 서지 않는다.
 * 두 질의를 나란히 보낸다 — 줄 세우면 Neon 왕복이 둘이 되고, 화면 속도는 질의 수가 아니라 줄 세운 왕복 수가 정한다.
 * 기대작이 없는 달은 소제목도 세우지 않는다 — "날짜순 전체" 한 마디만 서면 무엇과 갈라 둔 것인지가 없다.
 */
async function MonthGames({ monthKey, monthTotal, page, filter }: { monthKey: string; monthTotal: number; page: number; filter: UpcomingFilter }) {
  const loaded = await nullIfDbUnavailable(Promise.all([getUpcomingMonthPicks(monthKey, filter), getUpcomingMonthPage(monthKey, page, filter)]));
  if (!loaded) return <DbUnavailable retryHref={ROUTES.upcoming} />;
  const [allPicks, { items }] = loaded;
  const picks = page === 1 ? allPicks : [];
  // 날짜순에서 기대작은 빠진다(picksCte) — 쪽 수는 그 달 전체에서 기대작을 뺀 수로 센다
  const totalPages = Math.max(Math.ceil((monthTotal - allPicks.length) / UPCOMING_PAGE_SIZE), 1);
  const list = (
    <>
      <ul className="flex flex-col gap-2.5">
        {items.map((entry, i) => (
          <li key={entry.game.slug} className="enter-item" style={stagger(picks.length + i)}>
            <UpcomingRow entry={entry} />
          </li>
        ))}
      </ul>
      <Pagination page={page} totalPages={totalPages} hrefFor={(n) => upcomingHref({ month: monthKey, page: n }, filter)} />
    </>
  );
  if (items.length === 0 && picks.length === 0) return <p className="rounded-xl bg-surface-2 px-4 py-3.5 text-[13px] text-dim">{M.emptyFiltered}</p>;
  if (picks.length === 0) return <div className="flex flex-col gap-8">{list}</div>;

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="upcoming-picks-heading" className="flex flex-col gap-3.5">
        <SectionHead id="upcoming-picks-heading" as="h3" size="sub" title={M.picksTitle} note={M.picksNote} />
        <ul className={HOME_GRID_CLASS}>
          {picks.map((entry, i) => (
            <li key={entry.game.slug} className="enter-item" style={stagger(i)}>
              <GameCard game={entry.game} variant="release" releaseText={formatReleaseDay(entry.releaseDate)} />
            </li>
          ))}
        </ul>
      </section>
      {items.length > 0 && (
        <section aria-labelledby="upcoming-rest-heading" className="flex flex-col gap-3.5">
          <SectionHead id="upcoming-rest-heading" as="h3" size="sub" title={M.restTitle} />
          <div className="flex flex-col gap-8">{list}</div>
        </section>
      )}
    </div>
  );
}

/** 전체 보기 — 달을 가리지 않고 날짜순 카드. 건수는 달 탭의 합이다 */
async function AllGames({ total, page, filter }: { total: number; page: number; filter: UpcomingFilter }) {
  const items = await nullIfDbUnavailable(getUpcomingAllPage(page, filter));
  if (!items) return <DbUnavailable retryHref={upcomingAllHref(1, filter)} />;
  if (items.length === 0) return <p className="rounded-xl bg-surface-2 px-4 py-3.5 text-[13px] text-dim">{M.emptyFiltered}</p>;
  const totalPages = Math.max(Math.ceil(total / UPCOMING_PAGE_SIZE), 1);
  return (
    <div className="flex flex-col gap-8">
      <ul className={HOME_GRID_CLASS}>
        {items.map((entry, i) => (
          <li key={entry.game.slug} className="enter-item" style={stagger(i)}>
            <GameCard game={entry.game} variant="release" releaseText={formatReleaseDay(entry.releaseDate)} />
          </li>
        ))}
      </ul>
      <Pagination page={page} totalPages={totalPages} hrefFor={(n) => upcomingAllHref(n, filter)} />
    </div>
  );
}

/** 머리: 제목, 한 줄 설명, 보기 전환(목업의 오른쪽 탭 둘). 하나만 켜지는 칩이라 NavChip 이다(AGENTS 6장) */
function UpcomingHead({ all, filter = {} }: { all: boolean; filter?: UpcomingFilter }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[26px] font-extrabold tracking-[-0.03em] text-ink sm:text-[30px]">{M.title}</h1>
        <p className="text-[14px] text-mut">{all ? M.leadAll : M.leadMonth}</p>
      </div>
      <div role="group" aria-label={M.viewLabel} className="flex gap-1.5">
        <NavChip group="upcoming-view" href={upcomingAllHref(1, filter)} active={all} outline>
          {M.viewAll}
        </NavChip>
        <NavChip group="upcoming-view" href={upcomingHref({}, filter)} active={!all} outline>
          {M.viewMonth}
        </NavChip>
      </div>
    </div>
  );
}

/**
 * 기다리는 추가 콘텐츠(2026-10-12). 달 탭과 상관없이 늘 같은 줄이다 — 출시 전 DLC 는 마흔 남짓이라
 * 달로 쪼개면 칸마다 한두 장이 된다(services/games/upcoming-addons). 담을 것이 없으면 마디째 세우지 않는다.
 * 달 목록 아래에 둔다: 이 화면의 본론은 "어떤 게임이 나오나" 이고 DLC 는 그 곁가지다.
 */
async function UpcomingAddons() {
  // DLC 줄은 곁가지라 DB 가 안 열린 날엔 줄째 안 세운다 — 안내는 달 목록 자리 하나로 충분하다
  const addons = await nullIfDbUnavailable(getUpcomingAddons());
  if (!addons || addons.length === 0) return null;
  return (
    <section aria-labelledby="upcoming-addons-heading" className="flex flex-col gap-4">
      <SectionHead id="upcoming-addons-heading" title={M.addonsTitle} note={M.addonsNote} />
      <ul className={HOME_GRID_CLASS}>
        {addons.map((entry, i) => (
          <li key={entry.game.slug} className="enter-item" style={stagger(i)}>
            <GameCard
              game={entry.game}
              variant="release"
              releaseText={formatReleaseDay(entry.releaseDate)}
              subtitle={entry.parentTitle ? upcomingAddonParentText(entry.parentTitle) : undefined}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function UpcomingPage({ searchParams }: Props) {
  // 주소부터 읽는다 — 그래야 Next 가 이 화면을 요청 때 그리는 화면으로 알고 빌드 때 미리 그리지 않는다.
  // 질의를 먼저 보내면 빌드가 DB 를 친다. 캐시 없는 빌드 머신에서 DB 가 안 열리면 배포가 통째로 실패한다(2026-10-13 실측)
  const sp = await searchParams;
  const requested = firstParam(sp[UPCOMING_MONTH_PARAM]);
  const all = firstParam(sp[UPCOMING_VIEW_PARAM]) === UPCOMING_VIEW_ALL;
  const page = readPage(firstParam(sp.page));
  const filter = readUpcomingFilter(sp);
  const loaded = await nullIfDbUnavailable(Promise.all([getUpcomingMonths(filter), getUpcomingGenres()]));
  if (!loaded) {
    return (
      <Page gap={30}>
        <UpcomingHead all={all} />
        <DbUnavailable retryHref={ROUTES.upcoming} />
      </Page>
    );
  }
  const [months, genres] = loaded;
  const activeKey = pickUpcomingMonth(
    months.map((m) => m.key),
    requested,
  );
  const active = months.find((m) => m.key === activeKey);
  const total = months.reduce((n, m) => n + m.total, 0);
  // 조건이 바뀌면 경계를 새로 세운다 — 같은 열쇠면 React 가 옛 결과를 새 결과가 올 때까지 둔다(games/page 와 같은 이유)
  const filterKey = JSON.stringify(filter);

  // 한 화면을 틀 하나로 감싼다 — 막대, 보기 전환, 쪽 번호 어느 것을 눌러도 같은 결과 자리(PendingRegion)가 흐려진다
  return (
    <NavPendingScope>
      <Page gap={30}>
        <UpcomingHead all={all} filter={filter} />

        <UpcomingFilterBar filter={filter} place={{ all, month: all ? undefined : requested }} genres={genres} topGenres={genres.slice(0, TOP_GENRE_COUNT)} />

        <PendingRegion className="flex flex-col gap-[30px]">
          {all ? (
            <section aria-label={M.viewAll} className="flex flex-col gap-4">
              <SectionHead title={M.viewAll} note={upcomingCountText(total)} />
              <Suspense key={`all:${page}:${filterKey}`} fallback={<GamesGridSkeleton cards={UPCOMING_PAGE_SIZE} gridClass={HOME_GRID_CLASS} />}>
                <AllGames total={total} page={page} filter={filter} />
              </Suspense>
            </section>
          ) : (
            <>
              {/* 달 탭 띠(components/upcoming-month-nav). 달이 하나뿐이면 세우지 않는다 — 고를 데가 없는 띠는 제목을 한 번 더 쓰는 일이다 */}
              {active && months.length > 1 && <UpcomingMonthNav months={months} activeKey={active.key} filter={filter} />}

              {!active ? (
                <p className="rounded-xl bg-surface-2 px-4 py-3.5 text-[13px] text-dim">{hasUpcomingFilter(filter) ? M.emptyFiltered : M.empty}</p>
              ) : (
                <section aria-labelledby="upcoming-month-heading" className="flex flex-col gap-4">
                  <SectionHead id="upcoming-month-heading" title={formatMonthLabel(active.key)} note={upcomingCountText(active.total)} />
                  {/* 달이 바뀌면 경계를 새로 세운다 — 키가 같으면 React 가 갱신으로 보고 옛 달을 새 달이 올 때까지 둔다(games/page 와 같은 이유) */}
                  <Suspense key={`${active.key}:${page}:${filterKey}`} fallback={<GamesGridSkeleton cards={Math.min(active.total, UPCOMING_PAGE_SIZE)} gridClass={HOME_GRID_CLASS} />}>
                    <MonthGames monthKey={active.key} monthTotal={active.total} page={page} filter={filter} />
                  </Suspense>
                </section>
              )}
            </>
          )}
        </PendingRegion>

        {/* 추가 콘텐츠 줄은 조건과 상관없는 곁가지라 조건을 걸면 걷는다 — 거른 목록 아래에 안 거른 줄이 서면 필터가 안 먹은 것처럼 읽힌다 */}
        {!hasUpcomingFilter(filter) && (
          <Suspense fallback={<GamesGridSkeleton cards={UPCOMING_ADDON_LIMIT} gridClass={HOME_GRID_CLASS} />}>
            <UpcomingAddons />
          </Suspense>
        )}

        {/* 각주는 면을 깔지 않는다 — 이 화면에서 면을 가진 것은 빈 상태 안내 하나뿐이고,
            각주까지 판을 쓰면 읽는 순서가 "각주가 먼저" 로 뒤집힌다 */}
        <p className="max-w-[760px] text-[12px] leading-[1.8] text-dim">{M.basis}</p>
      </Page>
    </NavPendingScope>
  );
}
