// 게임 목록 위 한 줄 — 취향 조건이 걸렸는지 말하고, 푸는 길과 고치는 길을 준다.
//
// 이 줄이 없으면 개인화는 "목록이 왜 이것밖에 없지" 로 읽힌다. 조건을 사람이 건 게 아니라서
// 필터 칩만으로는 누가 걸었는지 모른다 — 그래서 무엇으로 걸렀는지 이름까지 적는다.
// 전체를 보는 중(all=1)에도 줄을 남긴다: 한 번 푼 사람이 취향으로 돌아갈 길이 주소 지우기뿐이면 안 된다.
import Link from "next/link";
import { gamesHref, type GameSort } from "@/lib/games-query";
import { ONBOARDING_MESSAGES } from "@/lib/onboarding/messages";
import { ROUTES } from "@/lib/routes";

const M = ONBOARDING_MESSAGES.list;
const LINK = "press tap flex h-11 shrink-0 items-center rounded-full px-2.5 text-[13px] font-semibold text-acc hover:underline";

export function PersonalListNote({ applied, labels, sort }: { applied: boolean; labels: readonly string[]; sort?: GameSort }) {
  return (
    <div className="-my-2 flex flex-wrap items-center gap-x-1 text-[13px]">
      <p className="mr-auto min-w-0 py-2 text-mut">
        {applied ? (
          <>
            {M.applied} <span className="font-semibold text-ink">{labels.join(", ")}</span>
          </>
        ) : (
          M.all
        )}
      </p>
      {/* 정렬은 들고 간다 — 조건을 풀었다고 고른 정렬까지 풀리면 다시 골라야 한다 */}
      <Link href={applied ? gamesHref({ sort, all: true }) : gamesHref({ sort })} className={LINK}>
        {applied ? M.showAll : M.showMine}
      </Link>
      <Link href={ROUTES.settings} className={LINK}>
        {M.change}
      </Link>
    </div>
  );
}
