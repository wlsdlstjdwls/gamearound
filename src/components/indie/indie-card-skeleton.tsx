// 인디 카드 뼈대 — 인디 목록, 슈퍼루키, 플레이테스트처럼 indie-card 격자가 오는 화면이 같이 쓴다.
// 게임 카드 뼈대(game-card-skeleton)를 쓰지 않는 이유: 인디 카드는 제목 한 줄 + 플랫폼, 장르 알약 + 한 줄 소개 두 줄 + 단계 배지 줄이라
// 게임 카드(제목 두 줄 + 배지 + 값)와 줄 구성이 다르다. 껍데기와 커버는 실물과 같은 상수를 쓴다.
import { CARD_SHELL, COVER_CLASS } from "@/components/game-card";
import { INDIE_ROW_BODY, INDIE_ROW_COVER, INDIE_ROW_SHELL } from "@/components/indie/indie-card";
import { Bone } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

/** phoneRow: 실물의 좁은 화면 가로 줄 카드(IndieCard 의 phoneRow)와 같은 칸 나눔 */
export function IndieCardSkeleton({ phoneRow = false }: { phoneRow?: boolean } = {}) {
  return (
    <div className={cn(CARD_SHELL, phoneRow && INDIE_ROW_SHELL)} aria-hidden>
      <div className={cn(COVER_CLASS, "skeleton", phoneRow && INDIE_ROW_COVER)} />
      <div className={cn("flex min-w-0 flex-1 flex-col gap-1.5 px-1", phoneRow && INDIE_ROW_BODY)}>
        {/* 가로 줄(phoneRow)의 줄 높이는 2026-11-20 390px 실측: 제목 22, 장르 21, 소개 한 줄 20, 바닥 22 */}
        <Bone className={cn("h-[21px] w-3/5", phoneRow && "max-sm:h-[22px]")} />
        <div className={cn("flex gap-1", phoneRow && "max-sm:h-[21px] max-sm:items-center")}>
          <Bone className="h-5 w-10 rounded-[var(--radius-xs)]" />
          <Bone className="h-5 w-12 rounded-[var(--radius-xs)]" />
        </div>
        <Bone className={cn("h-4 w-full", phoneRow && "max-sm:my-0.5")} />
        <Bone className={cn("h-4 w-4/5", phoneRow && "max-sm:hidden")} />
        <div className={cn("flex items-center gap-2 pt-1", phoneRow && "max-sm:pt-0.5")}>
          <Bone className="h-5 w-14 rounded-full" />
          <Bone className="h-3.5 w-28" />
        </div>
      </div>
    </div>
  );
}
