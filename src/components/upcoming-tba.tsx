// 출시 예정 월별 보기 아래 "출시일 미정" 상자(기획서 v2.0 4.4 "출시 예정(미정)", 목업 월별 보기의 접는 상자).
//
// 접어 두는 이유: 이 화면의 본론은 "그 달에 무엇이 나오나" 이고, 미정 게임은 날짜로 세울 수 없어 달 목록에 끼울 자리가 없다.
// 펴면 월별 줄과 같은 줄(UpcomingRow)로 서고 날짜 칸에 "미정" 이 앉는다 — 같은 화면 안에서 모양을 하나 더 만들지 않는다.
// 담을 것이 없으면 상자째 세우지 않는다. 미정 판정은 스토어가 말해 준 행만 믿는다(services/games/upcoming 의 getUpcomingTba 주석).
import { Collapsible } from "@/components/ui/collapsible";
import { UpcomingRow } from "@/components/upcoming-row";
import { nullIfDbUnavailable } from "@/lib/db-errors";
import { UPCOMING_MESSAGES as M, upcomingTbaCountText } from "@/lib/games/messages";
import type { UpcomingFilter } from "@/lib/games/upcoming";
import { getUpcomingTba } from "@/server/services/games";

export async function UpcomingTba({ filter }: { filter: UpcomingFilter }) {
  // 곁가지라 DB 가 안 열린 날엔 상자째 안 세운다 — 안내는 달 목록 자리 하나로 충분하다(UpcomingAddons 와 같은 이유)
  const tba = await nullIfDbUnavailable(getUpcomingTba(filter));
  if (!tba || tba.items.length === 0) return null;
  return (
    <div className="rounded-[var(--radius-md)] bg-surface-2 px-4 py-3 sm:px-5">
      <Collapsible id="upcoming-tba-heading" size="sub" title={M.tbaTitle} note={`${upcomingTbaCountText(tba.total)} | ${M.tbaNote}`}>
        <ul className="flex flex-col gap-2.5" aria-labelledby="upcoming-tba-heading">
          {tba.items.map((game) => (
            <li key={game.slug}>
              <UpcomingRow entry={{ game, releaseDate: null }} />
            </li>
          ))}
        </ul>
      </Collapsible>
    </div>
  );
}
