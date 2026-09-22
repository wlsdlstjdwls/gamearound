// /games 목록 필터 껍데기 — 넓은 화면은 왼쪽 기둥, 좁은 화면은 바닥에서 올라오는 시트.
// 이 파일 자체는 서버 컴포넌트다. 시트 껍데기(./mobile)와, 펼치는 목록을 우리 토큰으로 그려야 하는
// 드롭다운(ui/select), 누른 즉시 반응을 보여야 하는 칩(ui/chip-nav)만 클라이언트다.
//
// 가로로 눕히지 않는 이유: 플랫폼, 장르 칩이 줄바꿈하며 화면 위쪽을 몇 줄씩 먹어 정작 게임이 밀린다.
//
// 좁은 화면을 시트로 바꾼 경위와 그 전 접는 서랍(details)이 안고 있던 문제 넷은 ./mobile 머리 주석에 있다.
//
// 걸린 조건은 이 껍데기가 같이 낸다(2026-09-22, 사용자 지정). 결과 위 전폭 띠에서 옮겨 왔다 —
// 걸린 조건은 필터가 한 일의 결과라 고치는 자리 옆에 있어야 "풀고 다시 고른다" 가 한 자리에서 끝난다.
// 넓은 화면은 기둥 맨 아래, 좁은 화면은 "필터" 단추 아래 제 줄이다(./active 의 두 모양).
import type { GamesQuery } from "@/lib/games-query";
import type { GameFacets } from "@/server/services/games";
import { ActiveFilters } from "./active";
import { Groups } from "./groups";
import { MobileFilters } from "./mobile";

export function GameFilters({ facets, filter }: { facets: GameFacets; filter: GamesQuery }) {
  return (
    <>
      {/* 좁은 화면: 단추 + 시트. 걸린 조건이 있어도 시트를 열어 두지 않는다(2026-09-15) —
          화면에 들어와서 하려던 일은 결과를 보는 것이지 방금 고른 조건을 다시 읽는 것이 아니다.
          개수 배지도 뗐다(2026-09-22, 사용자 지정): 바로 아래 줄에 걸린 조건이 이름 그대로 서 있고,
          "2" 와 "PC ⨯ 콘솔 ⨯" 이 한 화면에서 같은 사실을 두 번 말할 이유가 없다 */}
      <MobileFilters groups={<Groups facets={facets} filter={filter} variant="sheet" />} strip={<ActiveFilters filter={filter} variant="strip" />} />

      {/* 넓은 화면: 왼쪽 기둥. 스크롤해도 따라오도록 붙여 둔다(헤더 높이만큼 띄운다).
          안쪽 스크롤(max-h + overflow-y-auto)은 걷었다(2026-09-21): 장르 드롭다운이 펼쳐지면
          그 목록이 기둥 안에 갇혀 잘렸고, 대신 기둥에 세로 스크롤바가 생겼다 — 고르려고 연 목록이
          화면에 없는 셈이다. 무리가 셋(정렬, 플랫폼, 장르)뿐이라 기둥이 화면보다 길어질 일도 없어졌다.
          다시 길어지면 안쪽 스크롤이 아니라 드롭다운을 띄우는 쪽을 고친다 */}
      <aside aria-label="목록 필터" className="hidden flex-col gap-[26px] lg:sticky lg:top-[80px] lg:flex">
        <Groups facets={facets} filter={filter} />
        <ActiveFilters filter={filter} variant="column" />
      </aside>
    </>
  );
}
