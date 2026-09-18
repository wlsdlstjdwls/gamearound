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
import { Page, SectionHead, cardClass } from "@/components/ui/page";
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
    <Page gap={20}>
      <SectionHead
        as="h1"
        title={M.title}
        note={total > 0 ? upcomingCountText(total) : M.note}
        action={
          <Link href={ROUTES.game} className={buttonClass({ variant: "ghost", size: "sm" })}>
            {M.browseGames}
          </Link>
        }
      />

      <p className="text-[13.5px] leading-relaxed text-mut">{M.lead}</p>

      {months.length === 0 ? (
        <p className={cardClass("bg-surface-2 p-4 text-[13px] text-dim")}>{M.empty}</p>
      ) : (
        months.map((month) => (
          <section key={month.key} className="flex flex-col gap-2">
            <SectionHead title={formatMonthLabel(month.key)} note={upcomingCountText(month.items.length)} />
            <ul className="flex flex-col gap-2">
              {month.items.map((entry, i) => (
                <li key={entry.game.slug} className="enter-item" style={stagger(i)}>
                  <GameRow game={entry.game} variant="release" releaseText={formatReleaseDay(entry.releaseDate)} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <p className={cardClass("bg-surface-2 p-4 text-[12.5px] leading-relaxed text-dim")}>{M.basis}</p>
    </Page>
  );
}
