// /games 목록 필터 껍데기 — 넓은 화면은 왼쪽 기둥, 좁은 화면은 접는 서랍.
// 이 파일 자체는 서버 컴포넌트다. 펼치는 목록을 우리 토큰으로 그려야 하는 드롭다운(ui/select)과
// 누른 즉시 반응을 보여야 하는 칩(ui/chip-nav)만 클라이언트다.
//
// 가로로 눕히지 않는 이유: 플랫폼, 장르 칩이 줄바꿈하며 화면 위쪽을 몇 줄씩 먹어 정작 게임이 밀린다.
// 좁은 화면에서 접어 두는 이유: 펴 둔 채로 두면 목록이 한 화면 아래로 밀린다 — details 라 JS 없이 열고 닫힌다.
//
// 걸린 조건은 맨 위 요약 줄이 맡는다(./active). 고르는 자리는 기둥 곳곳에 흩어져 있어서
// "지금 무엇이 걸렸나" 와 "하나만 풀고 싶다" 를 그 자리에서 답할 수 없었다.
import { cardClass } from "@/components/ui/page";
import type { GamesQuery } from "@/lib/games-query";
import type { GameFacets } from "@/server/services/games";
import { ActiveFilters, activeFilterCount } from "./active";
import { Groups } from "./groups";

export function GameFilters({ facets, filter }: { facets: GameFacets; filter: GamesQuery }) {
  const applied = activeFilterCount(filter);

  return (
    <>
      {/* 좁은 화면: 접어 둔 서랍. 접힌 채로도 몇 개가 걸렸는지는 말해 준다 —
          열어 보기 전에는 아무 표시가 없어서 걸어 둔 조건을 잊고 "결과가 왜 이것뿐이지" 로 읽혔다.
          걸린 조건이 있어도 펴 두지 않는다(2026-09-15): 이 무리가 700px 이라 조건을 걸고 들어온 화면은
          게임이 한 장도 안 보이는 채로 시작했다. 화면에 들어와서 하려던 일은 결과를 보는 것이지
          방금 고른 조건을 다시 읽는 것이 아니다 — 걸린 개수는 접힌 줄의 숫자 배지가 말한다 */}
      <details className={cardClass("p-0 lg:hidden")}>
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[13px] font-semibold text-ink">
          필터와 정렬
          {applied > 0 && (
            <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold text-on-ink">{applied}</span>
          )}
        </summary>
        <div className="flex flex-col gap-3.5 border-t border-line px-4 py-3">
          <ActiveFilters filter={filter} />
          <Groups facets={facets} filter={filter} />
        </div>
      </details>

      {/* 넓은 화면: 왼쪽 기둥. 스크롤해도 따라오도록 붙여 둔다(헤더 높이만큼 띄운다).
          기둥이 화면보다 길어지는 조합이 있어 안쪽에서 스크롤한다 — 안 그러면 아래쪽 무리에 손이 닿지 않는다 */}
      <aside
        aria-label="목록 필터"
        className={cardClass("hidden flex-col gap-4 p-4 lg:sticky lg:top-[86px] lg:flex lg:max-h-[calc(100vh-102px)] lg:overflow-y-auto")}
      >
        <ActiveFilters filter={filter} />
        <Groups facets={facets} filter={filter} />
      </aside>
    </>
  );
}
