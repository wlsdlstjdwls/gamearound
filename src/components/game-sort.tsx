// 목록 정렬 고르는 자리. 필터 기둥이 아니라 **목록 바로 위**에 선다(2026-09-21).
//
// 왜 옮겼나: 정렬은 거르는 일이 아니라 줄 세우는 일이다. 기둥 안에 있으면 "무엇을 뺄까" 를 고르는
// 칩들 사이에 "어떻게 세울까" 가 끼어 같은 층으로 읽힌다. 걸린 조건 요약(./game-filters/active)이
// 정렬을 일부러 빼 두는 것도 같은 이유였다 — "푼다" 는 말이 성립하지 않아서다.
//
// 좁은 화면에서 특히 컸다: 정렬이 접힌 서랍 안에 있어서, 순서 하나 바꾸려고 필터 서랍을 열고
// 스크롤해 내려가야 했다. 목록 위에 두면 둘 다 한 번에 닿는다.
import { Select, type SelectOption } from "@/components/ui/select";
import { DEFAULT_GAME_SORT, GAME_SORTS, SORT_LABEL, gamesHref, type GamesQuery } from "@/lib/games-query";

export function GameSort({ query }: { query: GamesQuery }) {
  const options: SelectOption[] = GAME_SORTS.map((s) => ({
    value: s,
    label: SORT_LABEL[s],
    // 정렬을 바꾸면 1페이지로 돌아간다 — 3페이지에서 기준을 바꾸면 그 자리는 아무 뜻이 없다
    href: gamesHref(query, { sort: s, page: 1 }),
  }));
  return <Select label="정렬" value={query.sort ?? DEFAULT_GAME_SORT} options={options} scroll={false} />;
}
