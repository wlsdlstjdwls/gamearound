// 목록 정렬 고르는 자리. 필터 기둥이 아니라 **목록 바로 위**에 선다(2026-09-21).
//
// 왜 옮겼나: 정렬은 거르는 일이 아니라 줄 세우는 일이다. 기둥 안에 있으면 "무엇을 뺄까" 를 고르는
// 칩들 사이에 "어떻게 세울까" 가 끼어 같은 층으로 읽힌다. 걸린 조건 요약(./game-filters/active)이
// 정렬을 일부러 빼 두는 것도 같은 이유였다 — "푼다" 는 말이 성립하지 않아서다.
//
// 좁은 화면에서 특히 컸다: 정렬이 접힌 서랍 안에 있어서, 순서 하나 바꾸려고 필터 서랍을 열고
// 스크롤해 내려가야 했다. 목록 위에 두면 둘 다 한 번에 닿는다.
// 드롭다운에서 칩 줄로 바꿨다(2026-09-21 리디자인): 기준이 다섯뿐이라 펼치는 동작이
// 고르는 동작보다 비싸고, 무엇보다 **지금 무슨 순서로 보고 있는지**가 펼치지 않아도 읽힌다.
// 좁은 화면에서는 가로로 밀어 본다 — 접으면 다시 한 번 눌러야 하는 자리로 돌아간다.
import { ChipNavLink } from "@/components/ui/chip-nav";
import { DEFAULT_GAME_SORT, GAME_SORTS, SORT_LABEL, gamesHref, type GamesQuery } from "@/lib/games-query";

/** 정렬을 바꿔도 보던 자리를 지킨다 — 목록은 훑는 화면이라 맨 위로 튀면 읽던 줄을 잃는다 */
const KEEP_SCROLL = { scroll: false } as const;

export function GameSort({ query }: { query: GamesQuery }) {
  const current = query.sort ?? DEFAULT_GAME_SORT;
  return (
    <div className="flex flex-wrap items-center gap-1 text-[13px]" role="group" aria-label="정렬 기준">
      {GAME_SORTS.map((s) => (
        <ChipNavLink
          key={s}
          {...KEEP_SCROLL}
          // 정렬을 바꾸면 1페이지로 돌아간다 — 3페이지에서 기준을 바꾸면 그 자리는 아무 뜻이 없다
          href={gamesHref(query, { sort: s, page: 1 })}
          active={current === s}
        >
          {SORT_LABEL[s]}
        </ChipNavLink>
      ))}
    </div>
  );
}
