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
// 같은 화면에서 그 달만 다시 세우고(?month=), 그 달은 "더 보기" 로 끝까지 읽힌다. 질의도 고른 달 하나만 보낸다 —
// 모든 달을 한 번에 그리면 달마다 질의와 카드가 쌓여 첫 화면이 무거워진다.
//
// **줄에서 카드로 바꿨다**(2026-09-21). 이 화면이 답하는 질문은 "무엇을 기다리나" 인데, 아직 못 사는
// 게임을 고르는 단서는 값도 평점도 아니고 커버 한 장이다 — 줄에서는 그 커버가 92px 였다.
// 목록(/games)과 같은 격자, 같은 카드를 쓴다. 이 화면만 다른 모양이면 같은 게임이 화면마다
// 다르게 생겨서, 목록에서 기억한 그림을 여기서 다시 찾아야 한다.
import type { Metadata } from "next";
import { Suspense } from "react";
import { GameCard } from "@/components/game-card";
import { GamesInfinite } from "@/components/games-infinite";
import { UpcomingMonthNav } from "@/components/upcoming-month-nav";
import { Page, PageHead, SectionHead } from "@/components/ui/page";
import { formatMonthLabel, formatReleaseDay } from "@/lib/format";
import { firstParam } from "@/lib/games-query";
import { UPCOMING_MESSAGES as M, upcomingCountText } from "@/lib/games/messages";
import { HOME_GRID_CLASS } from "@/lib/games/grid";
import { pickUpcomingMonth, UPCOMING_MONTH_PARAM } from "@/lib/games/upcoming";
import { stagger } from "@/lib/motion";
import { getUpcomingMonthPage, getUpcomingMonthPicks, getUpcomingMonths, UPCOMING_PAGE_SIZE } from "@/server/services/games";
import { GamesGridSkeleton } from "@/app/(public)/games/skeletons";
import { loadMoreUpcoming } from "./actions";

// Next 가 정적으로 읽는 값이라 리터럴이어야 한다 — lib/cache 의 LIST_REVALIDATE_SECONDS 와 같게 유지
export const revalidate = 3600;

export const metadata: Metadata = {
  title: M.title,
  description: M.lead,
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * 고른 달 = 기대작 한 줄 + 날짜순 전체(2026-10-07). 서버가 첫 장을 그리고, 그 아래는 이어 붙이기가 맡는다(games-infinite).
 * 기대작은 날짜순에서 빠진다(services/games/upcoming 의 picksCte) — 한 화면에 같은 카드가 두 번 서지 않는다.
 * 두 질의를 나란히 보낸다 — 줄 세우면 Neon 왕복이 둘이 되고, 화면 속도는 질의 수가 아니라 줄 세운 왕복 수가 정한다.
 * 기대작이 없는 달은 소제목도 세우지 않는다 — "날짜순 전체" 한 마디만 서면 무엇과 갈라 둔 것인지가 없다.
 */
async function MonthGames({ monthKey }: { monthKey: string }) {
  const [picks, { items, hasMore }] = await Promise.all([getUpcomingMonthPicks(monthKey), getUpcomingMonthPage(monthKey, 1)]);
  const list = (
    <GamesInfinite load={loadMoreUpcoming.bind(null, monthKey)} initialHasMore={hasMore} gridClass={HOME_GRID_CLASS}>
      {items.map((entry, i) => (
        <li key={entry.game.slug} className="enter-item" style={stagger(picks.length + i)}>
          <GameCard game={entry.game} variant="release" releaseText={formatReleaseDay(entry.releaseDate)} />
        </li>
      ))}
    </GamesInfinite>
  );
  if (picks.length === 0) return list;

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
          {list}
        </section>
      )}
    </div>
  );
}

export default async function UpcomingPage({ searchParams }: Props) {
  const months = await getUpcomingMonths();
  const activeKey = pickUpcomingMonth(
    months.map((m) => m.key),
    firstParam((await searchParams)[UPCOMING_MONTH_PARAM]),
  );
  const active = months.find((m) => m.key === activeKey);

  return (
    <Page gap={30}>
      {/* 제목은 낭독기에만 남긴다(2026-09-21, 목록 화면과 같은 규칙). 건수는 달 탭과 달 머리가 말한다 */}
      <PageHead title={M.title} hideTitle />

      {/* 달 탭 띠(components/upcoming-month-nav). 달이 하나뿐이면 세우지 않는다 — 고를 데가 없는 띠는 제목을 한 번 더 쓰는 일이다 */}
      {active && months.length > 1 && <UpcomingMonthNav months={months} activeKey={active.key} />}

      {!active ? (
        <p className="rounded-xl bg-surface-2 px-4 py-3.5 text-[13px] text-dim">{M.empty}</p>
      ) : (
        <section aria-labelledby="upcoming-month-heading" className="flex flex-col gap-4">
          <SectionHead id="upcoming-month-heading" title={formatMonthLabel(active.key)} note={upcomingCountText(active.total)} />
          {/* 달이 바뀌면 경계를 새로 세운다 — 키가 같으면 React 가 갱신으로 보고 옛 달을 새 달이 올 때까지 둔다(games/page 와 같은 이유) */}
          <Suspense key={active.key} fallback={<GamesGridSkeleton cards={Math.min(active.total, UPCOMING_PAGE_SIZE)} gridClass={HOME_GRID_CLASS} />}>
            <MonthGames monthKey={active.key} />
          </Suspense>
        </section>
      )}

      {/* 각주는 면을 깔지 않는다 — 이 화면에서 면을 가진 것은 빈 상태 안내 하나뿐이고,
          각주까지 판을 쓰면 읽는 순서가 "각주가 먼저" 로 뒤집힌다 */}
      <p className="max-w-[760px] text-[12px] leading-[1.8] text-dim">{M.basis}</p>
    </Page>
  );
}
