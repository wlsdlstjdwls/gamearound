"use server";
// 출시예정 "더 보기" — 고른 달의 다음 장 카드를 그려서 돌려준다(games/actions 와 같은 이유로 JSX 다).
import { GameCard } from "@/components/game-card";
import { formatReleaseDay } from "@/lib/format";
import { stagger } from "@/lib/motion";
import { getUpcomingMonthPage } from "@/server/services/games";
import type { MorePage } from "@/app/(public)/games/actions";

export async function loadMoreUpcoming(monthKey: string, page: number): Promise<MorePage> {
  const { items, hasMore } = await getUpcomingMonthPage(monthKey, page);
  return {
    nodes: items.map((entry, i) => (
      <li key={entry.game.slug} className="enter-late" style={stagger(i)}>
        <GameCard game={entry.game} variant="release" releaseText={formatReleaseDay(entry.releaseDate)} />
      </li>
    )),
    hasMore,
  };
}
