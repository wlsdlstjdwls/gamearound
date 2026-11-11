// 출시 예정 화면의 뼈대 — loading.tsx(다른 화면에서 들어올 때)와 페이지 안 Suspense(달, 쪽, 조건을 바꿀 때)가 같이 쓴다.
//
// 2026-11-11 사용자 "로딩은 한 줄에 2~3개씩인데 실제는 한 줄에 하나": 월별 보기의 날짜순 목록은 줄(UpcomingRow)인데
// 뼈대는 카드 격자였다. 실물(page)의 마디 순서 그대로 세운다 — 머리(제목, 설명, 보기 전환), 막대, 달 띠, 달 제목,
// 이달의 기대작 카드 넷(첫 쪽만), 날짜순 전체 줄 목록. 높이는 같은 날 390, 1280 실물을 잰 값이다.
import { GameCardSkeleton } from "@/components/game-card-skeleton";
import { UpcomingRowsSkeleton } from "@/components/upcoming-row";
import { Bone, SectionHeadSkeleton } from "@/components/ui/skeleton";
import { HOME_GRID_CLASS } from "@/lib/games/grid";
import { cn } from "@/lib/cn";

/** 기대작 줄의 카드 수 — 실물(services/games/upcoming 의 기대작)이 넷이다 */
const PICK_CARDS = 4;
/** 기대작 카드 높이 — 출시일 카드(GameCard variant release)는 값 줄 옆 날짜까지 서서 홈 카드 뼈대보다 높다. 2026-11-11 실물 390 275, 1280 281 */
const PICK_CARD_HEIGHT = "h-[275px] sm:h-[281px] [&>*]:h-full";
/** 좁은 화면에서 세울 기대작 카드 수(아래 주석) */
const MOBILE_PICK_CARDS = 2;

/** 머리: 제목(26, sm 30px), 한 줄 설명, 보기 전환 칩 둘(좁은 화면은 손가락 크기 44) */
export function UpcomingHeadSkeleton() {
  return (
    <div aria-hidden className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <Bone className="h-[39px] w-28 sm:h-[45px]" />
        <Bone className="h-[21px] w-64" />
      </div>
      <div className="flex gap-1.5">
        <Bone className="h-11 w-[78px] rounded-full sm:h-[33px]" />
        <Bone className="h-11 w-[78px] rounded-full sm:h-[33px]" />
      </div>
    </div>
  );
}

/** 고른 달의 본문(page 의 MonthGames). picks 면 첫 쪽이라 기대작 카드 줄이 앞에 선다 */
export function MonthGamesSkeleton({ rows, picks }: { rows: number; picks: boolean }) {
  return (
    <div className="flex flex-col gap-8">
      {picks && (
        <div className="flex flex-col gap-3.5">
          <SectionHeadSkeleton size="sub" width="w-28" />
          <div className={HOME_GRID_CLASS}>
            {/* 좁은 화면은 한 줄에 한 장이라 카드 수가 곧 높이다 — 기대작은 달마다 0~4장이고 순위 300 안 게임이 드물어 둘이 흔하다.
                둘만 세운다(셋째부터 sm 미만에서 숨김). 넓은 화면은 넷이 한 줄이라 수와 상관없이 높이가 같다 */}
            {Array.from({ length: PICK_CARDS }).map((_, i) => (
              <div key={i} className={cn(PICK_CARD_HEIGHT, i >= MOBILE_PICK_CARDS && "max-sm:hidden")}>
                <GameCardSkeleton />
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-col gap-3.5">
        {picks && <SectionHeadSkeleton size="sub" width="w-24" />}
        <UpcomingRowsSkeleton rows={rows} />
      </div>
    </div>
  );
}
