// 출시예정 화면 — "무엇을 기다리나" 에 답하는 축.
//
// 목록(/games)의 최신 출시순과 갈라 둔 이유: 그 화면은 "무엇이 나왔나" 를 묻는다.
// 한 정렬에 겹쳐 두면 아직 못 사는 게임이 첫 페이지를 차지해 둘 다 못 읽는다.
//
// 달로 묶고 줄마다 날짜를 적는다. 날짜마다 머리를 달면 70줄에 머리가 60개라 목록이 안 보이고,
// 달 머리 하나만 두면 "이번 주인가" 를 세어 봐야 한다 — 요일까지 줄에 적어 그 셈을 없앤다.
import type { Metadata } from "next";
import Link from "next/link";
import { GameRow } from "@/components/game-row";
import { buttonClass } from "@/components/ui/button";
import { Page, PageHead, ROWS, SectionHead } from "@/components/ui/page";
import { formatMonthLabel, formatReleaseDay } from "@/lib/format";
import { UPCOMING_MESSAGES as M, upcomingCountText } from "@/lib/games/messages";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import { getUpcomingGames } from "@/server/services/games";

// Next 가 정적으로 읽는 값이라 리터럴이어야 한다 — lib/cache 의 LIST_REVALIDATE_SECONDS 와 같게 유지
export const revalidate = 3600;

export const metadata: Metadata = {
  title: M.title,
  description: M.lead,
};

export default async function UpcomingPage() {
  const months = await getUpcomingGames();
  const total = months.reduce((sum, m) => sum + m.items.length, 0);

  return (
    <Page gap={30}>
      <PageHead
        title={M.title}
        note={total > 0 ? upcomingCountText(total) : undefined}
        action={
          <Link href={ROUTES.game} className={buttonClass({ variant: "secondary", className: "rounded-full" })}>
            {M.browseGames}
          </Link>
        }
      >
        {/* 안내문이 제목 행 안에 들어간다 — 제목 밑에 붙어야 "이 화면이 무엇을 담는가" 로 읽힌다.
            바깥에 두면 다음 섹션의 머리말처럼 보였다 */}
        <p className="w-full max-w-[620px] text-[13.5px] leading-[1.7] text-mut">{M.lead}</p>
      </PageHead>

      {months.length === 0 ? (
        <p className="rounded-xl bg-surface-2 px-4 py-3.5 text-[13px] text-dim">{M.empty}</p>
      ) : (
        months.map((month) => (
          <section key={month.key} className="flex flex-col gap-3.5">
            <SectionHead title={formatMonthLabel(month.key)} note={upcomingCountText(month.items.length)} />
            <ul className={ROWS}>
              {month.items.map((entry, i) => (
                <li key={entry.game.slug} className="enter-item" style={stagger(i)}>
                  <GameRow game={entry.game} variant="release" releaseText={formatReleaseDay(entry.releaseDate)} />
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
