// 개발 단계 배지. 해 볼 수 있는 단계(데모, 앞서 해보기, 출시)만 색을 입힌다 —
// 카드를 훑는 사람이 가장 먼저 묻는 것이 "지금 해 볼 수 있나" 라서 그 답만 눈에 띄게 둔다.
import { cn } from "@/lib/cn";
import { INDIE_STAGE_LABEL } from "@/lib/indie/messages";
import type { IndieStage } from "@/server/db/schema";

const PLAYABLE: ReadonlySet<IndieStage> = new Set(["demo", "early_access", "released"]);

export function IndieStageBadge({ stage, className }: { stage: IndieStage; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold leading-none",
        PLAYABLE.has(stage) ? "bg-acc-soft text-acc" : "bg-surface-3 text-mut",
        className,
      )}
    >
      {INDIE_STAGE_LABEL[stage]}
    </span>
  );
}
