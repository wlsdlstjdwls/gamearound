// 인디 카드 뼈대 — 인디 목록, 슈퍼루키, 플레이테스트처럼 indie-card 격자가 오는 화면이 같이 쓴다.
// 게임 카드 뼈대(game-card-skeleton)를 쓰지 않는 이유: 인디 카드는 제목 한 줄 + 플랫폼, 장르 알약 + 한 줄 소개 두 줄 + 단계 배지 줄이라
// 게임 카드(제목 두 줄 + 배지 + 값)와 줄 구성이 다르다. 껍데기와 커버는 실물과 같은 상수를 쓴다.
import { CARD_SHELL, COVER_CLASS } from "@/components/game-card";
import { Bone } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

export function IndieCardSkeleton() {
  return (
    <div className={CARD_SHELL} aria-hidden>
      <div className={cn(COVER_CLASS, "skeleton")} />
      <div className="flex flex-col gap-1.5 px-1">
        <Bone className="h-[21px] w-3/5" />
        <div className="flex gap-1">
          <Bone className="h-5 w-10 rounded-[var(--radius-xs)]" />
          <Bone className="h-5 w-12 rounded-[var(--radius-xs)]" />
        </div>
        <Bone className="h-4 w-full" />
        <Bone className="h-4 w-4/5" />
        <div className="flex items-center gap-2 pt-1">
          <Bone className="h-5 w-14 rounded-full" />
          <Bone className="h-3.5 w-28" />
        </div>
      </div>
    </div>
  );
}
