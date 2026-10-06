// 출시예정 화면 — "무엇을 기다리나" 에 답하는 축.
//
// 목록(/games)의 최신 출시순과 갈라 둔 이유: 그 화면은 "무엇이 나왔나" 를 묻는다.
// 한 정렬에 겹쳐 두면 아직 못 사는 게임이 첫 페이지를 차지해 둘 다 못 읽는다.
//
// 달로 묶고 카드마다 날짜를 적는다. 날짜마다 머리를 달면 70장에 머리가 60개라 목록이 안 보이고,
// 달 머리 하나만 두면 "이번 주인가" 를 세어 봐야 한다 — 요일까지 카드에 적어 그 셈을 없앤다.
//
// **자르는 단위가 달이다**(2026-09-22, 사용자 지적: "10월꺼 추가되면...? 더 미래의 출시 예정작들도
// 있을거 아냐"). 전체를 날짜순으로 90개만 자르던 시절에는 이번 달 하나가 그 90칸을 다 먹어
// 다음 달부터가 화면에 아예 없었다. 근거와 수치는 services/games/upcoming 의 UPCOMING_MONTH_LIMIT.
//
// **줄에서 카드로 바꿨다**(2026-09-21). 이 화면이 답하는 질문은 "무엇을 기다리나" 인데, 아직 못 사는
// 게임을 고르는 단서는 값도 평점도 아니고 커버 한 장이다 — 줄에서는 그 커버가 92px 였다.
// 목록(/games)과 같은 격자, 같은 카드를 쓴다. 이 화면만 다른 모양이면 같은 게임이 화면마다
// 다르게 생겨서, 목록에서 기억한 그림을 여기서 다시 찾아야 한다.
import type { Metadata } from "next";
import { GameCard } from "@/components/game-card";
import { UpcomingMonthNav } from "@/components/upcoming-month-nav";
import { Page, PageHead, SectionHead } from "@/components/ui/page";
import { formatMonthLabel, formatReleaseDay } from "@/lib/format";
import { UPCOMING_MESSAGES as M, upcomingCountText } from "@/lib/games/messages";
import { HOME_GRID_CLASS } from "@/lib/games/grid";
import { monthAnchor } from "@/lib/games/upcoming";
import { stagger } from "@/lib/motion";
import { getUpcomingGames } from "@/server/services/games";

// Next 가 정적으로 읽는 값이라 리터럴이어야 한다 — lib/cache 의 LIST_REVALIDATE_SECONDS 와 같게 유지
export const revalidate = 3600;

export const metadata: Metadata = {
  title: M.title,
  description: M.lead,
};

export default async function UpcomingPage() {
  const months = await getUpcomingGames();

  return (
    <Page gap={30}>
      {/* 제목은 낭독기에만 남긴다(2026-09-21, 목록 화면과 같은 규칙). 건수도 같이 뗐다 —
          달마다 서는 구분 머리(SectionHead)가 이미 그 달의 건수를 말한다.

          머리말과 "전체 게임 보기" 버튼도 뗐다(2026-09-22, 사용자 지정). 머리말은 첫 달 머리가
          곧바로 말하는 사실("2026년 10월")을 문장으로 한 번 더 했고, 버튼은 머리띠의 메뉴와
          같은 자리로 가는 두 번째 입구였다. 담는 기준은 맨 아래 각주(M.basis)가 그대로 갖는다 */}
      <PageHead title={M.title} hideTitle />

      {/* 달 탭 띠(components/upcoming-month-nav). 맨 위에 두는 이유: 어느 달이 있고 몇 개인지는 목록을 읽기 전에
          답할 질문이다. 붙어 서서(sticky) 내려 읽는 동안 지금 어느 달인지 켜 주고, 다음 달로 바로 건너뛰게 한다.
          달이 하나뿐이면 세우지 않는다 — 건너뛸 데가 없는 띠는 제목을 한 번 더 쓰는 일이다 */}
      {months.length > 1 && <UpcomingMonthNav months={months.map(({ key, total }) => ({ key, total }))} />}

      {months.length === 0 ? (
        <p className="rounded-xl bg-surface-2 px-4 py-3.5 text-[13px] text-dim">{M.empty}</p>
      ) : (
        months.map((month) => (
          // scroll-mt: 닻으로 내려왔을 때 제목이 가려지지 않게 위에 떠 있는 것들의 높이만큼 띄운다.
          // 머리띠만 빼면 모자란다(2026-09-22, 사용자 지적: "버튼누르면 스크롤이동되는데 헤더에 가려지네") —
          // 그 아래 달 건너뛰기 띠가 한 겹 더 서 있어서, 뺄 것이 둘이다
          <section key={month.key} id={monthAnchor(month.key)} className="flex scroll-mt-[calc(var(--header-h)+var(--month-nav-h)+16px)] flex-col gap-4">
            <SectionHead title={formatMonthLabel(month.key)} note={upcomingCountText(month.items.length, month.total)} />
            <ul className={HOME_GRID_CLASS}>
              {month.items.map((entry, i) => (
                <li key={entry.game.slug} className="enter-item" style={stagger(i)}>
                  <GameCard game={entry.game} variant="release" releaseText={formatReleaseDay(entry.releaseDate)} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {/* 각주는 면을 깔지 않는다 — 이 화면에서 면을 가진 것은 빈 상태 안내 하나뿐이고,
          각주까지 판을 쓰면 읽는 순서가 "각주가 먼저" 로 뒤집힌다 */}
      <p className="max-w-[760px] text-[12px] leading-[1.8] text-dim">{M.basis}</p>
    </Page>
  );
}
